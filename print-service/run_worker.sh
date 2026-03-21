#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_DIR="$SCRIPT_DIR/.conda"
WORKER_FILE="$SCRIPT_DIR/print_worker.py"
WORKER_ENV_FILE="$SCRIPT_DIR/.env"

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

if [ -f "$WORKER_ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$WORKER_ENV_FILE"
  set +a
fi

# Auto-detect USB endpoints from connected printer (required for printing)
if [ -x "$SCRIPT_DIR/utils/get_printer_info.sh" ]; then
  # eval only the export lines (stderr goes to terminal)
  # Do NOT use || true: if detection fails, we must stop to avoid wrong USB params
  eval "$("$SCRIPT_DIR/utils/get_printer_info.sh")"
fi

ensure_conda_available

if ! command -v conda >/dev/null 2>&1; then
  echo "conda no esta instalado o no esta en PATH." >&2
  echo "Instala Miniconda/Miniforge o agrega conda al PATH." >&2
  exit 1
fi

if [ ! -d "$ENV_DIR" ]; then
  echo "No existe el entorno Conda en $ENV_DIR" >&2
  echo "Primero ejecuta: $SCRIPT_DIR/utils/setup_conda_env.sh" >&2
  exit 1
fi

if [ ! -f "$WORKER_ENV_FILE" ]; then
  echo "No existe el archivo de entorno en $WORKER_ENV_FILE" >&2
  echo "Crealo a partir de $SCRIPT_DIR/print-service.env.example" >&2
  exit 1
fi

exec conda run --prefix "$ENV_DIR" --no-capture-output python "$WORKER_FILE"
