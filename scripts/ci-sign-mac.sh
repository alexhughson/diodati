#!/bin/bash
# Import CSC_LINK into a temp keychain, then package. electron-builder's CSC_LINK
# path unlocks that keychain with the p12 password; security rejects it.
set -euo pipefail

missing=""
[ -n "${CSC_LINK:-}" ] || missing="${missing} CSC_LINK"
[ -n "${CSC_KEY_PASSWORD:-}" ] || missing="${missing} CSC_KEY_PASSWORD"
[ -n "${APPLE_ID:-}" ] || missing="${missing} APPLE_ID"
[ -n "${APPLE_APP_SPECIFIC_PASSWORD:-}" ] || missing="${missing} APPLE_APP_SPECIFIC_PASSWORD"
[ -n "${APPLE_TEAM_ID:-}" ] || missing="${missing} APPLE_TEAM_ID"
if [ -n "${missing}" ]; then
  echo "missing secrets:${missing}"
  exit 1
fi

tmp="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
cert="$tmp/diodati-developer-id.p12"
keychain="$tmp/diodati-signing.keychain-db"
keychain_password=$(openssl rand -base64 32)

cleanup() {
  security delete-keychain "$keychain" >/dev/null 2>&1 || true
  rm -f "$cert"
}
trap cleanup EXIT

CERT_PATH="$cert" python3 - <<'PY'
import base64
import os
import pathlib
import sys

raw = "".join(os.environ["CSC_LINK"].split())
try:
    data = base64.b64decode(raw)
except Exception:
    sys.exit("CSC_LINK is not valid base64")
if len(data) < 64:
    sys.exit("CSC_LINK decoded to an empty or tiny file")
pathlib.Path(os.environ["CERT_PATH"]).write_bytes(data)
PY

security create-keychain -p "$keychain_password" "$keychain"
security set-keychain-settings -lut 21600 "$keychain"
security unlock-keychain -p "$keychain_password" "$keychain"
if ! security import "$cert" -k "$keychain" -P "$CSC_KEY_PASSWORD" -T /usr/bin/codesign -T /usr/bin/security >/dev/null; then
  echo "failed to import the Developer ID certificate"
  exit 1
fi
rm -f "$cert"
if ! security set-key-partition-list -S apple-tool:,apple: -s -k "$keychain_password" "$keychain" >/dev/null; then
  echo "failed to unlock the temporary signing keychain"
  exit 1
fi

existing=$(security list-keychains -d user | tr -d '"')
# shellcheck disable=SC2086
security list-keychains -d user -s "$keychain" $existing

export CSC_KEYCHAIN="$keychain"
unset CSC_LINK
unset CSC_KEY_PASSWORD

bun run package:mac:signed
