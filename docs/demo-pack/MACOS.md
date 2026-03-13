# productOS Demo Pack on macOS

## Prerequisites
- Node.js 18+
- npm
- Git

## 1) Pull the branch
```bash
git fetch origin
git checkout docs/demo-pack-macos-instructions
git pull
```

## 2) Run the demo pack
From repository root:
```bash
chmod +x ./docs/demo-pack/run-demo-pack.sh
./docs/demo-pack/run-demo-pack.sh
```

## Optional run modes
- Skip simulation:
```bash
./docs/demo-pack/run-demo-pack.sh --skip-simulation
```

- Skip stills:
```bash
./docs/demo-pack/run-demo-pack.sh --skip-stills
```

- Skip video:
```bash
./docs/demo-pack/run-demo-pack.sh --skip-video
```

## Output locations
- Simulation report:
  - `docs/demo-pack/simulation/out/simulation-report.json`
- Case visuals:
  - `docs/demo-pack/remotion/out/case01.png`
  - `docs/demo-pack/remotion/out/case02.png`
  - `docs/demo-pack/remotion/out/case03.png`
  - `docs/demo-pack/remotion/out/case04.png`
- Full video:
  - `docs/demo-pack/remotion/out/demo-pack.mp4`

## Troubleshooting
- If `node` is missing:
  - Install Node.js LTS and re-open terminal.
- If render fails on first run:
  - Re-run the command (first run downloads browser dependencies for Remotion).
