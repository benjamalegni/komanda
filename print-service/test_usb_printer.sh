#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_DIR="$SCRIPT_DIR/.conda"
ENV_FILE="$SCRIPT_DIR/.env"
TEST_FILE="$SCRIPT_DIR/test_usb_printer.py"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if ! command -v conda >/dev/null 2>&1; then
  echo "conda not installed or not in PATH." >&2
  exit 1
fi

if [ ! -d "$ENV_DIR" ]; then
  echo "Conda environment not found in $ENV_DIR" >&2
  echo "Run: $SCRIPT_DIR/utils/setup_conda_env.sh first" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Environment file not found in $ENV_FILE" >&2
  exit 1
fi

exec conda run --prefix "$ENV_DIR" python "$TEST_FILE" "$@"
