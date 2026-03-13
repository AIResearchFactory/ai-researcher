#!/usr/bin/env bash
set -euo pipefail

SKIP_VIDEO=0
SKIP_STILLS=0
SKIP_SIMULATION=0

for arg in "$@"; do
  case "$arg" in
    --skip-video) SKIP_VIDEO=1 ;;
    --skip-stills) SKIP_STILLS=1 ;;
    --skip-simulation) SKIP_SIMULATION=1 ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTION_DIR="$ROOT_DIR/remotion"
SIM_SCRIPT="$ROOT_DIR/simulation/simulate-demo-pack.mjs"

echo "== productOS Demo Pack Runner (macOS/Linux) =="
echo "Root: $ROOT_DIR"

if [[ "$SKIP_SIMULATION" -eq 0 ]]; then
  echo "[1/3] Running simulation..."
  node "$SIM_SCRIPT"
fi

pushd "$REMOTION_DIR" >/dev/null
echo "Installing Remotion deps (if needed)..."
npm install >/dev/null

if [[ "$SKIP_STILLS" -eq 0 ]]; then
  echo "[2/3] Rendering stills..."
  npx remotion still src/entry.jsx Case01 out/case01.png
  npx remotion still src/entry.jsx Case02 out/case02.png
  npx remotion still src/entry.jsx Case03 out/case03.png
  npx remotion still src/entry.jsx Case04 out/case04.png
fi

if [[ "$SKIP_VIDEO" -eq 0 ]]; then
  echo "[3/3] Rendering full demo video..."
  npx remotion render src/entry.jsx DemoPack out/demo-pack.mp4
fi
popd >/dev/null

echo "Done. Outputs:"
echo "- Simulation: docs/demo-pack/simulation/out/"
echo "- Stills: docs/demo-pack/remotion/out/case01.png .. case04.png"
echo "- Video: docs/demo-pack/remotion/out/demo-pack.mp4"
