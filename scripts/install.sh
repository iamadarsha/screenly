#!/usr/bin/env bash
# Screenly one-command installer for macOS.
#
#   curl -fsSL https://raw.githubusercontent.com/iamadarsha/screenly/main/scripts/install.sh | bash
#
# Downloads the latest signed... well, latest published .dmg from the
# iamadarsha/screenly GitHub Releases page for the current Mac's CPU
# architecture, mounts it, and copies Screenly.app into /Applications.
#
# Note on Gatekeeper: this script downloads with curl, which does not set
# the com.apple.quarantine extended attribute the way a browser download
# does, so macOS will not show the "can't be opened because it is from an
# unidentified developer" dialog for files installed this way. If you
# instead download the .dmg manually from the Releases page in a browser,
# right-click the app in /Applications and choose "Open" the first time.

set -euo pipefail

REPO="iamadarsha/screenly"
APP_NAME="Screenly.app"
INSTALL_DIR="/Applications"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "error: this installer is for macOS. For Windows, use scripts/install.ps1 instead." >&2
  exit 1
fi

ARCH_RAW="$(uname -m)"
case "$ARCH_RAW" in
  arm64) ARCH="arm64" ;;
  x86_64) ARCH="x64" ;;
  *)
    echo "error: unsupported architecture: $ARCH_RAW" >&2
    exit 1
    ;;
esac

echo "==> Detecting latest Screenly release..."
API_URL="https://api.github.com/repos/${REPO}/releases/latest"
RELEASE_JSON="$(curl -fsSL "$API_URL")"

TAG="$(printf '%s' "$RELEASE_JSON" | grep -m1 '"tag_name"' | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/')"
if [[ -z "$TAG" ]]; then
  echo "error: could not determine latest release tag. Is https://github.com/${REPO}/releases populated?" >&2
  exit 1
fi

ASSET_NAME="Screenly-${ARCH}.dmg"
DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${TAG}/${ASSET_NAME}"

echo "==> Installing Screenly ${TAG} (${ARCH}) from ${DOWNLOAD_URL}"

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

DMG_PATH="${TMPDIR}/${ASSET_NAME}"
curl -fL --progress-bar -o "$DMG_PATH" "$DOWNLOAD_URL"

echo "==> Mounting disk image..."
MOUNT_PLIST="${TMPDIR}/mount.plist"
hdiutil attach "$DMG_PATH" -nobrowse -readonly -plist > "$MOUNT_PLIST"
MOUNT_POINT="$(grep -A1 'mount-point' "$MOUNT_PLIST" | grep string | sed -E 's/.*<string>(.*)<\/string>.*/\1/' | head -1)"

if [[ -z "$MOUNT_POINT" || ! -d "${MOUNT_POINT}/${APP_NAME}" ]]; then
  echo "error: could not find ${APP_NAME} inside the mounted disk image." >&2
  exit 1
fi

echo "==> Installing to ${INSTALL_DIR}/${APP_NAME} (you may be prompted for your password)..."
if [[ -d "${INSTALL_DIR}/${APP_NAME}" ]]; then
  rm -rf "${INSTALL_DIR}/${APP_NAME}"
fi
ditto "${MOUNT_POINT}/${APP_NAME}" "${INSTALL_DIR}/${APP_NAME}"

echo "==> Cleaning up quarantine attribute (if any) and unmounting..."
xattr -cr "${INSTALL_DIR}/${APP_NAME}" 2>/dev/null || true
hdiutil detach "$MOUNT_POINT" -quiet || true

echo "==> Done. Launching Screenly..."
open "${INSTALL_DIR}/${APP_NAME}"
