# Print Service
1. Run setup_raspberry_print_service.sh (complete setup) only once.
2. Run worker with run_worker.sh

Variable in .env:
- PRINTER_NAME: The name of the printer as recognized by the system. You can find this by running `lsusb` in the terminal.
Without the printer name given in advance, the print service will attempt to find a compatible printer automatically, but this can lead to issues if there are multiple printers or if the printer is not recognized correctly.

## USB diagnostics

To only test the printer, without Next.js or the print queue:

```bash
./utils/test_usb_printer.sh
```

To send a real test ticket:
```bash
./print-service/utils/test_usb_printer.sh --print
```
