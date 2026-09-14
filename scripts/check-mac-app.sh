#!/bin/bash
set -euo pipefail

mode="${1:?usage: check-mac-app.sh adhoc|signed}"

app=release/mac-arm64/Diodati.app
if [ ! -d "$app" ]; then
  app=release/mac/Diodati.app
fi

plist="$app/Contents/Info.plist"
name=$(plutil -extract CFBundleName raw "$plist")
display=$(plutil -extract CFBundleDisplayName raw "$plist")
exec_name=$(plutil -extract CFBundleExecutable raw "$plist")
echo "CFBundleName=$name"
echo "CFBundleDisplayName=$display"
echo "CFBundleExecutable=$exec_name"
test "$name" = "Diodati"
test "$display" = "Diodati"
test "$exec_name" = "Diodati"

codesign --verify --deep --strict "$app"

# Public signature fields only. Do not dump entitlements or the full blob.
info=$(codesign -d --verbose=2 "$app" 2>&1)
echo "$info" | awk '/^Identifier=|^Authority=|^TeamIdentifier=|^Signature=/'

identifier=$(echo "$info" | awk -F= '/^Identifier=/{print $2}')
test "$identifier" = "app.diodati.desktop"

if [ "$mode" = "adhoc" ]; then
  echo "$info" | grep -q "Signature=adhoc"
  exit 0
fi

if [ "$mode" != "signed" ]; then
  echo "unknown mode: $mode"
  exit 1
fi

if echo "$info" | grep -q "Signature=adhoc"; then
  echo "refusing ad-hoc signature on a signed build"
  exit 1
fi

if ! echo "$info" | grep -q "Authority=Developer ID Application:"; then
  echo "missing Developer ID Application authority"
  exit 1
fi

xcrun stapler validate "$app"
