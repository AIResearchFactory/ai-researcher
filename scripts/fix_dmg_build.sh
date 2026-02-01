#!/bin/bash
set -e

# Define paths
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUNDLE_DIR="$BASE_DIR/src-tauri/target/release/bundle"
DMG_SCRIPT="$BUNDLE_DIR/dmg/bundle_dmg.sh"
APP_PATH="$BUNDLE_DIR/macos/ai-researcher.app"
SOURCE_DIR="$BUNDLE_DIR/dmg_source_clean"
OUTPUT_DMG="$BASE_DIR/ai-researcher.dmg"

# Check if .app exists
if [ ! -d "$APP_PATH" ]; then
    echo "Error: .app not found at $APP_PATH"
    echo "Please run 'npm run tauri build' first (even if it fails at dmg step, the .app should be built)."
    exit 1
fi

# Prepare clean source directory
echo "Preparing clean source directory..."
rm -rf "$SOURCE_DIR"
mkdir -p "$SOURCE_DIR"
echo "Copying .app to clean source directory..."
cp -R "$APP_PATH" "$SOURCE_DIR/"

# Run bundle script with --skip-jenkins
echo "Running bundle_dmg.sh with --skip-jenkins..."
chmod +x "$DMG_SCRIPT"
"$DMG_SCRIPT" --skip-jenkins --volname "AI Researcher" "$OUTPUT_DMG" "$SOURCE_DIR"

echo "Success! DMG created at $OUTPUT_DMG"
