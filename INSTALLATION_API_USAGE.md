# Installation API Usage Guide

This document shows how to use the installation system commands from the frontend/UI layer.

## Overview

All installation commands are exposed through the `tauriApi` object in [src/api/tauri.ts](src/api/tauri.ts).

## TypeScript Types

The following TypeScript interfaces match the Rust backend types:

```typescript
interface InstallationConfig {
  app_data_path: string;
  is_first_install: boolean;
  claude_code_detected: boolean;
  ollama_detected: boolean;
}

interface ClaudeCodeInfo {
  installed: boolean;
  version?: string;
  path?: string;
  in_path: boolean;
}

interface OllamaInfo {
  installed: boolean;
  version?: string;
  path?: string;
  running: boolean;
  in_path: boolean;
}

interface InstallationProgress {
  stage: 'initializing' | 'selecting_directory' | 'creating_structure' |
         'detecting_dependencies' | 'installing_claude_code' | 'installing_ollama' |
         'finalizing' | 'complete' | 'error';
  message: string;
  progress_percentage: number;
}

interface InstallationResult {
  success: boolean;
  config: InstallationConfig;
  claude_code_info?: ClaudeCodeInfo;
  ollama_info?: OllamaInfo;
  error_message?: string;
}
```

## API Methods

### Check Installation Status

Check if the application has been installed and configured.

```typescript
import { tauriApi } from '@/api/tauri';

// Check installation status
const config = await tauriApi.checkInstallationStatus();

if (config.is_first_install) {
  // Show installation wizard
  console.log('First time installation detected');
} else {
  // App is already installed
  console.log('App data directory:', config.app_data_path);
  console.log('Claude Code detected:', config.claude_code_detected);
  console.log('Ollama detected:', config.ollama_detected);
}
```

### Detect Dependencies

Check if Claude Code and Ollama are installed on the system.

```typescript
// Detect Claude Code
const claudeInfo = await tauriApi.detectClaudeCode();
if (claudeInfo) {
  console.log('Claude Code found!');
  console.log('Version:', claudeInfo.version);
  console.log('Path:', claudeInfo.path);
  console.log('In PATH:', claudeInfo.in_path);
} else {
  console.log('Claude Code not found');
}

// Detect Ollama
const ollamaInfo = await tauriApi.detectOllama();
if (ollamaInfo) {
  console.log('Ollama found!');
  console.log('Version:', ollamaInfo.version);
  console.log('Running:', ollamaInfo.running);
} else {
  console.log('Ollama not found');
}
```

### Get Installation Instructions

Get OS-specific installation instructions for missing dependencies.

```typescript
// Get Claude Code installation instructions
const claudeInstructions = await tauriApi.getClaudeCodeInstallInstructions();
console.log(claudeInstructions);
// Example output on macOS:
// "To install Claude Code, please follow these steps:
//  1. Open your terminal
//  2. Run: curl -fsSL https://claude.ai/install.sh | sh
//  ..."

// Get Ollama installation instructions
const ollamaInstructions = await tauriApi.getOllamaInstallInstructions();
console.log(ollamaInstructions);
```

### Run Installation

Run the complete installation process with progress tracking.

```typescript
// Run installation with progress callback
const result = await tauriApi.runInstallation((progress) => {
  console.log(`[${progress.stage}] ${progress.message} (${progress.progress_percentage}%)`);

  // Update UI progress bar
  updateProgressBar(progress.progress_percentage);
  updateStatusMessage(progress.message);
});

if (result.success) {
  console.log('Installation completed successfully!');
  console.log('Configuration:', result.config);

  if (result.claude_code_info) {
    console.log('Claude Code:', result.claude_code_info);
  }

  if (result.ollama_info) {
    console.log('Ollama:', result.ollama_info);
  }
} else {
  console.error('Installation failed:', result.error_message);
}
```

### React Component Example

```tsx
import React, { useState, useEffect } from 'react';
import { tauriApi, InstallationProgress, InstallationConfig } from '@/api/tauri';

export function InstallationWizard() {
  const [config, setConfig] = useState<InstallationConfig | null>(null);
  const [progress, setProgress] = useState<InstallationProgress | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check installation status on mount
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      const status = await tauriApi.checkInstallationStatus();
      setConfig(status);
    } catch (err) {
      setError(err.message);
    }
  }

  async function startInstallation() {
    setIsInstalling(true);
    setError(null);

    try {
      const result = await tauriApi.runInstallation((p) => {
        setProgress(p);
      });

      if (result.success) {
        setConfig(result.config);
      } else {
        setError(result.error_message || 'Installation failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsInstalling(false);
    }
  }

  if (!config) {
    return <div>Loading...</div>;
  }

  if (config.is_first_install) {
    return (
      <div className="installation-wizard">
        <h1>Welcome to AI Researcher</h1>
        <p>Let's set up your application.</p>

        {isInstalling && progress && (
          <div className="progress">
            <div className="progress-bar" style={{ width: `${progress.progress_percentage}%` }} />
            <p>{progress.message}</p>
          </div>
        )}

        {error && <div className="error">{error}</div>}

        <button onClick={startInstallation} disabled={isInstalling}>
          {isInstalling ? 'Installing...' : 'Start Installation'}
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Installation Complete</h1>
      <p>App data directory: {config.app_data_path}</p>
      <p>Claude Code: {config.claude_code_detected ? '✓ Detected' : '✗ Not found'}</p>
      <p>Ollama: {config.ollama_detected ? '✓ Detected' : '✗ Not found'}</p>
    </div>
  );
}
```

### Other Utility Methods

```typescript
// Check if this is first install
const isFirst = await tauriApi.isFirstInstall();

// Verify directory structure is intact
const isValid = await tauriApi.verifyDirectoryStructure();
if (!isValid) {
  console.log('Directory structure is corrupted, running repair...');
  // Could trigger re-installation or repair
}

// Re-detect dependencies after manual installation
const updatedConfig = await tauriApi.redetectDependencies();
console.log('Updated dependency status:', updatedConfig);

// Create a backup
const backupMessage = await tauriApi.backupInstallation();
console.log(backupMessage); // "Backup created successfully"

// Clean up old backups (keep last 5)
const cleanupMessage = await tauriApi.cleanupOldBackups(5);
console.log(cleanupMessage); // "Cleaned up old backups, kept last 5"
```

## UI Integration Patterns

### 1. First-Time Installation Wizard

Show a wizard on first launch that:
1. Checks installation status
2. Creates directory structure
3. Detects dependencies
4. Shows installation instructions for missing dependencies
5. Completes setup

### 2. Settings/Preferences Panel

Add an "Installation" tab in settings where users can:
- View current installation configuration
- Re-detect dependencies
- See installation paths
- Create backups
- Clean up old backups

### 3. Dependency Status Indicator

Show dependency status in the UI:
```tsx
function DependencyStatus() {
  const [claudeInfo, setClaudeInfo] = useState(null);
  const [ollamaInfo, setOllamaInfo] = useState(null);

  useEffect(() => {
    async function checkDeps() {
      setClaudeInfo(await tauriApi.detectClaudeCode());
      setOllamaInfo(await tauriApi.detectOllama());
    }
    checkDeps();
  }, []);

  return (
    <div>
      <DependencyItem
        name="Claude Code"
        info={claudeInfo}
        onInstall={() => showInstructions('claude')}
      />
      <DependencyItem
        name="Ollama"
        info={ollamaInfo}
        onInstall={() => showInstructions('ollama')}
      />
    </div>
  );
}
```

## Error Handling

All commands return `Promise` objects that can reject with errors:

```typescript
try {
  const result = await tauriApi.runInstallation();
} catch (error) {
  // Handle error
  console.error('Installation error:', error);
  showErrorNotification(error.message);
}
```

## Event Listeners

The installation system emits progress events that you can listen to:

```typescript
import { listen } from '@tauri-apps/api/event';

// Listen for installation progress
const unlisten = await listen('installation-progress', (event) => {
  const progress = event.payload as InstallationProgress;
  console.log(`Progress: ${progress.progress_percentage}%`);
});

// Remember to cleanup
unlisten();
```

## Best Practices

1. **Check Installation Status on App Start**: Always check if the app is installed before showing the main UI.

2. **Show Progress**: Use the progress callback to give users feedback during installation.

3. **Handle Missing Dependencies Gracefully**: Show clear instructions when dependencies are missing.

4. **Backup Before Updates**: Create backups before major operations.

5. **Re-detect After Manual Install**: If users manually install dependencies, call `redetectDependencies()`.

6. **Verify Directory Structure**: Periodically verify the directory structure is intact, especially after updates.

## Related Files

- **Backend Commands**: [src-tauri/src/commands/installation_commands.rs](src-tauri/src/commands/installation_commands.rs)
- **TypeScript API**: [src/api/tauri.ts](src/api/tauri.ts)
- **Installation System Docs**: [INSTALLATION_SYSTEM.md](INSTALLATION_SYSTEM.md)
