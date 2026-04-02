#!/usr/bin/env python3

import json
import os
import sys
import time
from contextlib import suppress
from datetime import datetime
from textwrap import wrap

import requests
from escpos.printer import Usb


PRINTER_LINE_WIDTH = 32


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def parse_int(value: str) -> int:
    return int(value, 0)


def safe_float(value: object, fallback: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def safe_int(value: object, fallback: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def format_money(value: object, currency: str = "ARS") -> str:
    amount = safe_float(value)
    formatted = f"{amount:,.2f}"
    formatted = formatted.replace(",", "_").replace(".", ",").replace("_", ".")

    if formatted.endswith(",00"):
        formatted = formatted[:-3]

    if currency.upper() == "ARS":
        return f"${formatted}"

    return f"{currency.upper()} {formatted}"


def format_timestamp(value: object) -> str:
    if isinstance(value, str) and value.strip():
        try:
            normalized = value.strip().replace("Z", "+00:00")
            parsed = datetime.fromisoformat(normalized)
            if parsed.tzinfo is not None:
                parsed = parsed.astimezone()
            return parsed.strftime("%d/%m %H:%M")
        except ValueError:
            pass

    return datetime.now().strftime("%d/%m %H:%M")


def print_rule(printer: Usb, char: str = "-") -> None:
    printer.text(f"{char * PRINTER_LINE_WIDTH}\n")


def print_wrapped(printer: Usb, text: str, indent: str = "") -> None:
    cleaned = " ".join(text.split())
    if not cleaned:
        return

    width = max(PRINTER_LINE_WIDTH - len(indent), 8)
    lines = wrap(cleaned, width=width, break_long_words=False, break_on_hyphens=False)

    for line in lines:
        printer.text(f"{indent}{line}\n")


def get_copy_label(source: str, copy_index: int, copies: int) -> str:
    if source == "admin-direct":
        return "COCINA" if copy_index == 0 else "CAJA / ENTREGA"

    if copies > 1:
        return f"COPIA {copy_index + 1}/{copies}"

    return "COCINA"


def get_status_label(source: str) -> str:
    if source == "admin-direct":
        return "COBRAR EN CAJA"

    return "PAGADO"


class PrintWorker:
    def __init__(self) -> None:
        self.base_url = require_env("PRINT_SERVICE_BASE_URL").rstrip("/")
        self.token = require_env("PRINT_SERVICE_TOKEN")
        self.vendor_id = parse_int(require_env("PRINTER_USB_VENDOR_ID"))
        self.product_id = parse_int(require_env("PRINTER_USB_PRODUCT_ID"))
        self.interface = parse_int(os.getenv("PRINTER_USB_INTERFACE", "0"))
        self.in_ep = parse_int(os.getenv("PRINTER_USB_IN_EP", "0x82"))
        self.out_ep = parse_int(os.getenv("PRINTER_USB_OUT_EP", "0x01"))
        self.timeout = int(os.getenv("PRINT_SERVICE_TIMEOUT_SECONDS", "15"))
        self.poll_interval = int(os.getenv("PRINT_SERVICE_POLL_INTERVAL_SECONDS", "5"))
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
            }
        )

    def claim_job(self) -> dict | None:
        response = self.session.post(
            f"{self.base_url}/api/print-jobs/claim",
            timeout=self.timeout,
        )

        if response.status_code == 204:
            return None

        response.raise_for_status()
        data = response.json()
        return data.get("job")

    def report_status(self, job_id: str, status: str, error: str | None = None) -> None:
        payload = {"status": status}
        if error:
            payload["error"] = error

        response = self.session.post(
            f"{self.base_url}/api/print-jobs/{job_id}",
            data=json.dumps(payload),
            timeout=self.timeout,
        )
        response.raise_for_status()

    def build_printer(self) -> Usb:
        return Usb(
            self.vendor_id,
            self.product_id,
            timeout=self.timeout * 1000,
            in_ep=self.in_ep,
            out_ep=self.out_ep,
            interface=self.interface,
        )

    def print_job(self, job: dict) -> None:
        payload = job["payload"]
        printer = self.build_printer()
        raw_copies = payload.get("copies", 1)
        source = str(payload.get("source") or "")
        currency = str(payload.get("currency") or "ARS")
        approved_at = format_timestamp(payload.get("approvedAt"))
        customer = payload.get("customer") or {}
        customer_name = str(customer.get("name") or "Sin nombre")
        phone = customer.get("phone")
        notes = str(payload.get("notes") or "").strip()
        items = payload.get("items", [])
        summary = payload.get("summary") or {}
        subtotal = safe_float(summary.get("subtotal", 0))
        discount_total = safe_float(summary.get("discountTotal", 0))
        total = safe_float(summary.get("total", 0))
        total_units = sum(max(safe_int(item.get("quantity", 0)), 0) for item in items)

        try:
            copies = max(int(raw_copies), 1)
        except (TypeError, ValueError):
            copies = 1

        try:
            for copy_index in range(copies):
                copy_label = get_copy_label(source, copy_index, copies)
                status_label = get_status_label(source)

                printer.set(align="center", bold=True, width=2, height=2)
                printer.text("HAMBURGUESAS DE AUTOR\n")
                printer.set(align="center", bold=True, width=1, height=1)
                printer.text(f"{copy_label}\n")
                printer.set(align="center", bold=False, width=1, height=1)
                printer.text(f"{status_label}\n")
                purchase_number = payload.get("purchaseNumber")
                if purchase_number:
                    printer.text(f"Compra #{purchase_number}\n")
                else:
                    printer.text(f"Orden #{payload['orderId']}\n")
                printer.text(f"{approved_at}\n")
                print_rule(printer)

                printer.set(align="left", bold=False)
                printer.set(align="left", bold=True)
                printer.text("CLIENTE\n")
                printer.set(align="left", bold=False)
                print_wrapped(printer, customer_name)
                if phone:
                    print_wrapped(printer, f"Telefono: {phone}")

                if notes:
                    print_rule(printer)
                    printer.set(align="left", bold=True)
                    printer.text("OBSERVACIONES\n")
                    printer.set(align="left", bold=False)
                    print_wrapped(printer, notes)

                print_rule(printer)
                printer.set(align="left", bold=True)
                printer.text("PEDIDO\n")
                printer.set(align="left", bold=False)
                for item in items:
                    quantity = item.get("quantity", 0)
                    name = item.get("name", "Item")
                    line_total = safe_float(item.get("lineTotal", 0))
                    printer.set(align="left", bold=True)
                    print_wrapped(printer, f"{quantity} x {name}")
                    printer.set(align="left", bold=False)
                    printer.text(f"    {format_money(line_total, currency)}\n")

                print_rule(printer)
                printer.text(f"Lineas: {len(items)}\n")
                printer.text(f"Unidades: {total_units}\n")

                if discount_total > 0:
                    printer.text(f"Subtotal: {format_money(subtotal, currency)}\n")
                    printer.text(f"Descuento: {format_money(discount_total, currency)}\n")

                printer.set(align="left", bold=True)
                printer.text(f"Total: {format_money(total, currency)}\n")
                printer.set(align="left", bold=False)

                print_rule(printer)
                if source == "admin-direct":
                    printer.text("Cobro: pendiente en caja\n")
                else:
                    printer.text(f"Pago: {payload.get('paymentId', '-')}\n")

                printer.text(f"Orden interna: {payload.get('orderId', '-')}\n")
                printer.text("\n\n")
                printer.cut()
        finally:
            with suppress(Exception):
                printer.close()

    def run_forever(self) -> None:
        while True:
            try:
                job = self.claim_job()

                if not job:
                    time.sleep(self.poll_interval)
                    continue

                try:
                    self.print_job(job)
                    self.report_status(job["id"], "printed")
                except Exception as error:  # noqa: BLE001
                    self.report_status(job["id"], "failed", str(error))
            except requests.HTTPError as error:
                print(f"[print-worker] HTTP error: {error}", file=sys.stderr, flush=True)
                time.sleep(self.poll_interval)
            except Exception as error:  # noqa: BLE001
                print(f"[print-worker] Worker error: {error}", file=sys.stderr, flush=True)
                time.sleep(self.poll_interval)


if __name__ == "__main__":
    PrintWorker().run_forever()
