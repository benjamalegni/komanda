#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../.env"

printer="${PRINTER_NAME:-}"
if [ -z "$printer" ]; then
  echo "PRINTER_NAME is not set in .env. Run 'lsusb' to find your printer name." >&2
  exit 1
fi

cleanup() {
  echo "Script interrupted. Exiting." >&2
  exit 1
}

trap cleanup SIGINT

lineWithPrinterName=$(lsusb | grep -i "$printer" || true)
if [ -z "$lineWithPrinterName" ]; then
  echo "No USB device found matching printer name: $printer. Write PRINTER_NAME on .env file, find it running 'lsusb'" >&2
  exit 1
fi

echo "Found printer: $lineWithPrinterName" >&2

# Extract USB ID (vendor:product)
usb_id=$(echo "$lineWithPrinterName" | grep -o 'ID [0-9a-f:]*' | cut -d' ' -f2)
if [ -z "$usb_id" ]; then
  echo "Could not extract USB ID from line." >&2
  exit 1
fi

# Get verbose USB info
verbose_info=$(lsusb -v -d "$usb_id" 2>/dev/null)
if [ -z "$verbose_info" ]; then
  echo "Could not get verbose USB info for $usb_id" >&2
  exit 1
fi

# Extract OUT endpoint (0x03 e.g)
out_ep=$(echo "$verbose_info" | grep -E 'bEndpointAddress.*OUT' | head -1 | awk '{print $2}')
in_ep=$(echo "$verbose_info" | grep -E 'bEndpointAddress.*IN' | head -1 | awk '{print $2}')
vid=$(echo "$verbose_info" | grep -E 'idVendor' | head -1 | awk '{print $2}')
pid=$(echo "$verbose_info" | grep -E 'idProduct' | head -1 | awk '{print $2}')

if [ -z "$out_ep" ] || [ -z "$in_ep" ]; then
  echo "Could not find USB endpoints. Check if $usb_id is a printer." >&2
  exit 1
fi

# Export as variables (stdout only these lines)
echo "export PRINTER_USB_IN_EP=\"$in_ep\""
echo "export PRINTER_USB_OUT_EP=\"$out_ep\""
echo "export PRINTER_USB_VENDOR_ID=\"$vid\""
echo "export PRINTER_USB_PRODUCT_ID=\"$pid\""
