#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$SERVICE_DIR/environment.yml"
ENV_DIR="$SERVICE_DIR/.conda"

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

ensure_conda_available

if ! command -v conda >/dev/null 2>&1; then
  echo "conda not installed or not in PATH." >&2
  echo "Install Miniconda, Miniforge or Micromamba before continuing." >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Environment file not found: $ENV_FILE" >&2
  exit 1
fi

echo "Creating/updating Conda environment in $ENV_DIR"
conda env update --prefix "$ENV_DIR" --file "$ENV_FILE" --prune

echo
echo "Verifying Python USB dependencies"
conda run --prefix "$ENV_DIR" python -c "import usb.core; import usb.util; from escpos.printer import Usb"

echo
echo "Environment ready."
echo "To activate it run:"
echo "  conda activate \"$ENV_DIR\""
