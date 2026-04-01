#!/usr/bin/env python3

import json
import os
import sys
import time
from contextlib import suppress
from datetime import datetime

import requests
from escpos.printer import Usb


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def parse_int(value: str) -> int:
    return int(value, 0)


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

        try:
            copies = max(int(raw_copies), 1)
        except (TypeError, ValueError):
            copies = 1

        subtitle = "Comanda admin" if payload.get("source") == "admin-direct" else "Comanda pagada"

        try:
            for copy_index in range(copies):
                printer.set(align="center", bold=True, width=2, height=2)
                printer.text("HAMBURGUESAS DE AUTOR\n")
                printer.set(align="center", bold=False, width=1, height=1)
                printer.text(f"{subtitle}\n")
                if copies > 1:
                    printer.text(f"Copia {copy_index + 1}/{copies}\n")
                purchase_number = payload.get("purchaseNumber")
                if purchase_number:
                    printer.text(f"Compra #{purchase_number}\n")
                printer.text(f"Orden #{payload['orderId']}\n")
                printer.text(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                printer.text("--------------------------------\n")

                printer.set(align="left", bold=False)
                customer = payload.get("customer") or {}
                printer.text(f"Cliente: {customer.get('name', 'Sin nombre')}\n")
                phone = customer.get("phone")
                if phone:
                    printer.text(f"Telefono: {phone}\n")

                notes = payload.get("notes")
                if notes:
                    printer.text(f"Notas: {notes}\n")

                printer.text("--------------------------------\n")
                for item in payload.get("items", []):
                    quantity = item.get("quantity", 0)
                    name = item.get("name", "Item")
                    line_total = float(item.get("lineTotal", 0))
                    printer.set(align="left", bold=True)
                    printer.text(f"{quantity} x {name}\n")
                    printer.set(align="left", bold=False)
                    printer.text(f"    ${line_total:,.2f}\n")

                    item_note = item.get("note")
                    if item_note:
                        printer.text(f"    Nota: {item_note}\n")

                printer.text("--------------------------------\n")
                summary = payload.get("summary") or {}
                printer.text(f"Subtotal: ${float(summary.get('subtotal', 0)):,.2f}\n")
                printer.text(f"Descuento: ${float(summary.get('discountTotal', 0)):,.2f}\n")
                printer.set(align="left", bold=True)
                printer.text(f"Total: ${float(summary.get('total', 0)):,.2f}\n")
                printer.set(align="left", bold=False)
                printer.text("--------------------------------\n")
                printer.text(f"Pago ID: {payload.get('paymentId', '-')}\n")
                printer.text(f"Cart ID: {payload.get('cartId', '-')}\n")
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
