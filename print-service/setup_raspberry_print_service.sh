#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
ENV_DIR="$SCRIPT_DIR/.conda"
UDEV_RULE_PATH="/etc/udev/rules.d/99-chikenstop-printer.rules"

APT_PACKAGES=(
  libusb-1.0-0
  libusb-1.0-0-dev
  usbutils
)

PACMAN_PACKAGES=(
  libusb
  usbutils
)

ensure_conda_available() {
  if command -v conda >/dev/null 2>&1; then
    return
  fi

  local conda_init_scripts=(
    "/opt/miniconda3/etc/profile.d/conda.sh"
    "$HOME/miniconda3/etc/profile.d/conda.sh"
    "$HOME/.miniconda3/etc/profile.d/conda.sh"
    "$HOME/miniforge3/etc/profile.d/conda.sh"
    "$HOME/mambaforge/etc/profile.d/conda.sh"
  )
  local conda_init_script

  for conda_init_script in "${conda_init_scripts[@]}"; do
    if [ -f "$conda_init_script" ]; then
      # shellcheck disable=SC1090
      source "$conda_init_script"
      break
    fi
  done
}

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
}

normalize_usb_id() {
  local raw_value="$1"
  printf "%04x" "$((raw_value))"
}

load_worker_env() {
  if [ ! -f "$ENV_FILE" ]; then
    echo "Environment file not found in $ENV_FILE" >&2
    echo "Create it before preparing the Raspberry print service." >&2
    exit 1
  fi

  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
}

install_system_packages() {
  echo "Installing system packages for USB printing"

  # this is for ubuntu systems
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y "${APT_PACKAGES[@]}"
    return
  fi

  # this is for arch linux systems
  if command -v pacman >/dev/null 2>&1; then
    sudo pacman -Sy --needed "${PACMAN_PACKAGES[@]}"
    return
  fi

  # if we reach this point, we don't know how to install the packages
  echo "Unsupported package manager. Install libusb and usbutils manually." >&2
  exit 1
}

install_python_environment() {
  echo "Installing/updating print-service Conda environment"
  "$SCRIPT_DIR/utils/setup_conda_env.sh"
}

install_udev_rule() {
  if [ -z "${PRINTER_USB_VENDOR_ID:-}" ] || [ -z "${PRINTER_USB_PRODUCT_ID:-}" ]; then
    echo "Skipping udev rule installation because printer USB ids are missing in $ENV_FILE"
    return
  fi

  local vendor_id
  local product_id
  vendor_id="$(normalize_usb_id "$PRINTER_USB_VENDOR_ID")"
  product_id="$(normalize_usb_id "$PRINTER_USB_PRODUCT_ID")"

  echo "Installing udev rule for USB printer ${vendor_id}:${product_id}"
  sudo tee "$UDEV_RULE_PATH" >/dev/null <<EOF
SUBSYSTEM=="usb", ATTR{idVendor}=="${vendor_id}", ATTR{idProduct}=="${product_id}", MODE="0666"
EOF

  sudo udevadm control --reload-rules
  sudo udevadm trigger
}

verify_usb_stack() {
  echo "Verifying python-escpos + pyusb imports"
  conda run --prefix "$ENV_DIR" python - <<'PY'
import usb.core
import usb.util
from escpos.printer import Usb

print("USB dependencies ready for python-escpos.")
PY
}

print_next_steps() {
  echo
  echo "Raspberry print service is ready."
  echo "If the printer was already plugged in, unplug and plug it back in once."
  echo
  echo "Run the worker with:"
  echo "  ./print-service/run_worker.sh"
}

main() {
  ensure_conda_available

  require_command sudo
  require_command conda
  require_command udevadm

  load_worker_env
  install_system_packages
  install_python_environment
  install_udev_rule
  verify_usb_stack
  print_next_steps
}

main "$@"
