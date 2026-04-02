#!/usr/bin/env python3

import argparse
import os
import sys
from contextlib import suppress

import usb.core
import usb.util
from escpos.printer import Usb


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def parse_int(value: str) -> int:
    return int(value, 0)


def get_config() -> dict:
    return {
        "vendor_id": parse_int(require_env("PRINTER_USB_VENDOR_ID")),
        "product_id": parse_int(require_env("PRINTER_USB_PRODUCT_ID")),
        "interface": parse_int(os.getenv("PRINTER_USB_INTERFACE", "0")),
        "in_ep": parse_int(os.getenv("PRINTER_USB_IN_EP", "0x82")),
        "out_ep": parse_int(os.getenv("PRINTER_USB_OUT_EP", "0x01")),
        "timeout": int(os.getenv("PRINT_SERVICE_TIMEOUT_SECONDS", "15")) * 1000,
    }


def format_hex(value: int) -> str:
    return f"0x{value:04x}"


def list_matching_devices(vendor_id: int, product_id: int) -> list:
    return list(usb.core.find(find_all=True, idVendor=vendor_id, idProduct=product_id) or [])


def describe_device(device) -> None:
    print("Detected USB device:")
    print(f"  bus={getattr(device, 'bus', '?')} address={getattr(device, 'address', '?')}")

    for config in device:
        print(f"  configuration={config.bConfigurationValue}")
        for interface in config:
            print(
                "    interface="
                f"{interface.bInterfaceNumber} alt={interface.bAlternateSetting} "
                f"class={interface.bInterfaceClass}"
            )
            for endpoint in interface:
                direction = usb.util.endpoint_direction(endpoint.bEndpointAddress)
                direction_label = "IN" if direction == usb.util.ENDPOINT_IN else "OUT"
                transfer_type = usb.util.endpoint_type(endpoint.bmAttributes)
                print(
                    "      endpoint="
                    f"0x{endpoint.bEndpointAddress:02x} direction={direction_label} "
                    f"type={transfer_type} max_packet={endpoint.wMaxPacketSize}"
                )


def build_printer(config: dict) -> Usb:
    return Usb(
        config["vendor_id"],
        config["product_id"],
        timeout=config["timeout"],
        in_ep=config["in_ep"],
        out_ep=config["out_ep"],
        interface=config["interface"],
    )


def run_print_test(printer: Usb) -> None:
    printer.set(align="center", bold=True, width=2, height=2)
    printer.text("CHIKEN STOP\n")
    printer.set(align="center", bold=False, width=1, height=1)
    printer.text("USB test print\n")
    printer.text("------------------------------\n")
    printer.text("If you can read this, the USB\n")
    printer.text("printer configuration works.\n\n")
    printer.cut()


def main() -> int:
    parser = argparse.ArgumentParser(description="Test the USB printer without Next.js.")
    parser.add_argument(
        "--print",
        action="store_true",
        help="Send a real test ticket to the printer after the USB check succeeds.",
    )
    args = parser.parse_args()

    try:
        config = get_config()
    except Exception as error:  # noqa: BLE001
        print(f"[usb-test] Configuration error: {error}", file=sys.stderr)
        return 1

    print("[usb-test] Loaded printer configuration:")
    print(f"  vendor_id={format_hex(config['vendor_id'])}")
    print(f"  product_id={format_hex(config['product_id'])}")
    print(f"  interface={config['interface']}")
    print(f"  in_ep=0x{config['in_ep']:02x}")
    print(f"  out_ep=0x{config['out_ep']:02x}")

    devices = list_matching_devices(config["vendor_id"], config["product_id"])

    if not devices:
        print(
            "[usb-test] No USB device found with the configured vendor/product id.",
            file=sys.stderr,
        )
        return 2

    for device in devices:
        describe_device(device)

    printer = None

    try:
        printer = build_printer(config)
        print("[usb-test] Successfully opened the USB printer.")

        if args.print:
            run_print_test(printer)
            print("[usb-test] Test ticket sent.")
        else:
            print("[usb-test] USB open check passed. Re-run with --print for a real test ticket.")
    except Exception as error:  # noqa: BLE001
        print(f"[usb-test] Printer test failed: {error}", file=sys.stderr)
        return 3
    finally:
        if printer is not None:
            with suppress(Exception):
                printer.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
