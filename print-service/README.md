# Print Service
1. Run setup_raspberry_print_service.sh (complete setup) only once.
2. Run worker with run_worker.sh

Variables in .env:

- `PRINT_SERVICE_BASE_URL`
- `PRINT_SERVICE_TOKEN`
- `PRINTER_USB_VENDOR_ID`
- `PRINTER_USB_PRODUCT_ID`
- `PRINTER_USB_INTERFACE`
- `PRINTER_USB_IN_EP`
- `PRINTER_USB_OUT_EP`
- `PRINT_SERVICE_TIMEOUT_SECONDS`
- `PRINT_SERVICE_POLL_INTERVAL_SECONDS`

## USB diagnostics

To only test the printer, without Next.js or the print queue:

```bash
./utils/test_usb_printer.sh
```

To send a real test ticket:
```bash
./print-service/utils/test_usb_printer.sh --print
```
