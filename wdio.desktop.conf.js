import os from 'os';
import path from 'path';
import fs from 'fs';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
let tauriDriver;
let exit = false;

function resolveDesktopBinary() {
  const candidates = [
    path.resolve(__dirname, 'src-tauri', 'target', 'debug', 'productOS.exe'),
    path.resolve(__dirname, 'src-tauri', 'target', 'debug', 'product-os.exe'),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  throw new Error(`Tauri desktop binary not found. Checked: ${candidates.join(', ')}`);
}

const appPath = resolveDesktopBinary();
const nativeDriverPath = path.resolve(__dirname, 'msedgedriver.exe');

export const config = {
  host: '127.0.0.1',
  port: 4444,
  specs: ['./e2e/specs/desktop-core.e2e.js'],
  maxInstances: 1,
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 120000,
  },
  reporters: [
    'spec',
    ['junit', {
      outputDir: './e2e/reports/junit',
      outputFileFormat: (options) => `desktop-${options.cid}.xml`,
    }],
  ],
  capabilities: [
    {
      maxInstances: 1,
      'tauri:options': {
        application: appPath,
      },
    },
  ],

  beforeSession: () => {
    if (!fs.existsSync(nativeDriverPath)) {
      throw new Error(`msedgedriver.exe not found at ${nativeDriverPath}`);
    }

    tauriDriver = spawn(
      path.resolve(os.homedir(), '.cargo', 'bin', 'tauri-driver.exe'),
      ['--native-driver', nativeDriverPath],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    tauriDriver.stdout.on('data', (d) => process.stdout.write(d));
    tauriDriver.stderr.on('data', (d) => process.stderr.write(d));

    tauriDriver.on('error', (error) => {
      console.error('tauri-driver error:', error);
      process.exit(1);
    });

    tauriDriver.on('exit', (code) => {
      if (!exit) {
        console.error('tauri-driver exited with code:', code);
        process.exit(1);
      }
    });
  },

  afterSession: () => {
    exit = true;
    tauriDriver?.kill();
  },
};
