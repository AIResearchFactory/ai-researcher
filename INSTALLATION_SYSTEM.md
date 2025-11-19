# Installation System Documentation

This document describes the installation management system for the AI Researcher application.

## Overview

The installation system consists of three main modules that handle the initial setup, directory management, and dependency detection for the application:

1. **Installer Module** ([src-tauri/src/installer/mod.rs](src-tauri/src/installer/mod.rs))
2. **Directory Manager** ([src-tauri/src/directory/mod.rs](src-tauri/src/directory/mod.rs))
3. **Dependency Detector** ([src-tauri/src/detector/mod.rs](src-tauri/src/detector/mod.rs))

## Architecture

### 1. Installer Module

The installer module orchestrates the complete installation process and manages installation state.

#### Key Components

**InstallationConfig**
```rust
pub struct InstallationConfig {
    pub app_data_path: PathBuf,
    pub is_first_install: bool,
    pub claude_code_detected: bool,
    pub ollama_detected: bool,
}
```

**InstallationProgress**
```rust
pub struct InstallationProgress {
    pub stage: InstallationStage,
    pub message: String,
    pub progress_percentage: u8,
}
```

**InstallationStage**
```rust
pub enum InstallationStage {
    Initializing,
    SelectingDirectory,
    CreatingStructure,
    DetectingDependencies,
    InstallingClaudeCode,
    InstallingOllama,
    Finalizing,
    Complete,
    Error,
}
```

#### Key Functions

- `InstallationManager::new(app_data_path: PathBuf)` - Create a new installation manager
- `InstallationManager::with_default_path()` - Create with default OS-specific path
- `run_installation<F>(&mut self, progress_callback: F)` - Run complete installation process
- `save_installation_state()` - Persist installation state to disk
- `load_installation_state(app_data_path: &PathBuf)` - Load existing installation state
- `redetect_dependencies()` - Re-scan for installed dependencies

### 2. Directory Manager

The directory manager handles all file system operations related to the application's data structure.

#### Directory Structure

```
{APP_DATA}/
├── projects/           # User research projects
├── skills/            # Custom AI skills
├── templates/         # Project and skill templates
├── backups/           # Automatic backups
├── logs/              # Application logs
├── .settings.md       # Global settings
├── .secrets.encrypted.md  # Encrypted secrets
├── .installation_state.json  # Installation state
└── README.md          # User documentation
```

#### Key Functions

- `create_directory_structure(base_path: &Path)` - Create complete directory structure
- `verify_directory_structure(base_path: &Path)` - Verify structure integrity
- `create_default_files(base_path: &Path)` - Create default templates and settings
- `is_first_install(base_path: &Path)` - Check if first-time installation
- `backup_directory(base_path: &Path)` - Create timestamped backup
- `cleanup_old_backups(base_path: &Path, keep_count: usize)` - Remove old backups

### 3. Dependency Detector

The dependency detector identifies and validates external tools required by the application.

#### Detected Dependencies

**Claude Code**
- Searches PATH and common installation directories
- Detects version information
- Provides installation instructions per OS

**Ollama**
- Searches PATH and common installation directories
- Checks if service is running (port 11434)
- Detects version information
- Provides installation instructions per OS

#### Key Functions

- `detect_claude_code()` - Detect Claude Code installation
- `detect_ollama()` - Detect Ollama installation
- `get_claude_code_installation_instructions()` - Get OS-specific install instructions
- `get_ollama_installation_instructions()` - Get OS-specific install instructions

#### Return Types

**ClaudeCodeInfo**
```rust
pub struct ClaudeCodeInfo {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<PathBuf>,
    pub in_path: bool,
}
```

**OllamaInfo**
```rust
pub struct OllamaInfo {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<PathBuf>,
    pub running: bool,
    pub in_path: bool,
}
```

## Frontend API Commands

The installation system exposes the following Tauri commands for the frontend:

### Installation Commands

Located in [src-tauri/src/commands/installation_commands.rs](src-tauri/src/commands/installation_commands.rs):

#### `check_installation_status()`
Check the current installation configuration.

**Returns:** `Result<InstallationConfig, String>`

**Example:**
```typescript
import { invoke } from '@tauri-apps/api/core';

const config = await invoke('check_installation_status');
console.log('First install:', config.is_first_install);
```

#### `detect_claude_code()`
Detect Claude Code installation on the system.

**Returns:** `Result<Option<ClaudeCodeInfo>, String>`

**Example:**
```typescript
const claudeInfo = await invoke('detect_claude_code');
if (claudeInfo) {
  console.log('Claude Code found:', claudeInfo.path);
  console.log('Version:', claudeInfo.version);
}
```

#### `detect_ollama()`
Detect Ollama installation and check if service is running.

**Returns:** `Result<Option<OllamaInfo>, String>`

**Example:**
```typescript
const ollamaInfo = await invoke('detect_ollama');
if (ollamaInfo) {
  console.log('Ollama found:', ollamaInfo.path);
  console.log('Running:', ollamaInfo.running);
}
```

#### `get_claude_code_install_instructions()`
Get OS-specific installation instructions for Claude Code.

**Returns:** `String`

**Example:**
```typescript
const instructions = await invoke('get_claude_code_install_instructions');
console.log(instructions);
```

#### `get_ollama_install_instructions()`
Get OS-specific installation instructions for Ollama.

**Returns:** `String`

**Example:**
```typescript
const instructions = await invoke('get_ollama_install_instructions');
console.log(instructions);
```

#### `run_installation()`
Run the complete installation process with progress callbacks.

**Returns:** `Result<InstallationResult, String>`

**Emits:** `installation-progress` events

**Example:**
```typescript
import { listen } from '@tauri-apps/api/event';

// Listen for progress updates
const unlisten = await listen('installation-progress', (event) => {
  const progress = event.payload;
  console.log(`${progress.stage}: ${progress.message} (${progress.progress_percentage}%)`);
});

// Run installation
const result = await invoke('run_installation');
console.log('Installation success:', result.success);

// Clean up listener
unlisten();
```

#### `verify_directory_structure()`
Verify that the directory structure is complete and intact.

**Returns:** `Result<bool, String>`

**Example:**
```typescript
const isValid = await invoke('verify_directory_structure');
console.log('Directory structure valid:', isValid);
```

#### `redetect_dependencies()`
Re-detect dependencies after manual installation.

**Returns:** `Result<InstallationConfig, String>`

**Example:**
```typescript
const config = await invoke('redetect_dependencies');
console.log('Claude Code detected:', config.claude_code_detected);
console.log('Ollama detected:', config.ollama_detected);
```

#### `backup_installation()`
Create a timestamped backup of the current installation.

**Returns:** `Result<String, String>`

**Example:**
```typescript
const message = await invoke('backup_installation');
console.log(message); // "Backup created successfully"
```

#### `cleanup_old_backups(keep_count: number)`
Clean up old backups, keeping only the last N backups.

**Parameters:**
- `keep_count: number` - Number of recent backups to keep

**Returns:** `Result<String, String>`

**Example:**
```typescript
const message = await invoke('cleanup_old_backups', { keepCount: 5 });
console.log(message); // "Cleaned up old backups, kept last 5"
```

#### `is_first_install()`
Check if this is a first-time installation.

**Returns:** `Result<bool, String>`

**Example:**
```typescript
const isFirst = await invoke('is_first_install');
if (isFirst) {
  // Show welcome wizard
}
```

## Installation Flow

### First-Time Installation

1. **Initialization** - App starts and detects it's a first install
2. **Directory Creation** - Creates the complete directory structure
3. **Dependency Detection** - Scans for Claude Code and Ollama
4. **Default Files** - Creates default settings and templates
5. **State Persistence** - Saves installation state to disk
6. **Complete** - Emits completion event to frontend

### Update/Upgrade Flow

1. **Load Existing State** - Reads `.installation_state.json`
2. **Verify Structure** - Checks if all directories exist
3. **Backup** - Creates backup before any changes
4. **Redetect Dependencies** - Updates dependency information
5. **Update State** - Saves updated configuration

## OS-Specific Paths

### macOS
- App Data: `~/Library/Application Support/ai-researcher`
- Claude Code Search Paths:
  - `~/.local/bin/claude-code`
  - `/usr/local/bin/claude-code`
  - `~/bin/claude-code`
- Ollama Search Paths:
  - `~/.local/bin/ollama`
  - `/usr/local/bin/ollama`
  - `~/bin/ollama`

### Linux
- App Data: `~/.local/share/ai-researcher`
- Claude Code Search Paths:
  - `~/.local/bin/claude-code`
  - `/usr/local/bin/claude-code`
  - `/usr/bin/claude-code`
  - `~/bin/claude-code`
- Ollama Search Paths:
  - `~/.local/bin/ollama`
  - `/usr/local/bin/ollama`
  - `/usr/bin/ollama`
  - `~/bin/ollama`

### Windows
- App Data: `%APPDATA%\ai-researcher`
- Claude Code Search Paths:
  - `%LOCALAPPDATA%\Programs\Claude Code\claude-code.exe`
  - `%ProgramFiles%\Claude Code\claude-code.exe`
- Ollama Search Paths:
  - `%LOCALAPPDATA%\Programs\Ollama\ollama.exe`
  - `%ProgramFiles%\Ollama\ollama.exe`

## Error Handling

All public functions return `Result<T, String>` for easy error handling in the frontend.

Common error scenarios:
- Missing permissions to create directories
- Disk space issues
- Network timeouts when checking for running services
- Corrupted installation state files

Example error handling:
```typescript
try {
  const result = await invoke('run_installation');
  if (result.success) {
    // Handle success
  } else {
    console.error('Installation failed:', result.error_message);
  }
} catch (error) {
  console.error('Installation error:', error);
}
```

## Testing

All modules include comprehensive unit tests:

Run all installation system tests:
```bash
cargo test --lib -- installer detector directory installation_commands
```

Run specific module tests:
```bash
# Installer tests
cargo test --lib installer::tests

# Directory tests
cargo test --lib directory::tests

# Detector tests
cargo test --lib detector::tests

# Command tests
cargo test --lib installation_commands::tests
```

## Future Enhancements

1. **Auto-Update Integration** - Integrate with existing auto-update system
2. **Migration System** - Handle schema changes between versions
3. **Cloud Sync** - Optional cloud backup of projects and settings
4. **Dependency Auto-Install** - Attempt automatic installation of missing dependencies
5. **Health Checks** - Periodic verification of installation integrity
6. **Repair Mode** - Automatic repair of corrupted installations

## Related Files

- [src-tauri/src/installer/mod.rs](src-tauri/src/installer/mod.rs) - Installation orchestration
- [src-tauri/src/directory/mod.rs](src-tauri/src/directory/mod.rs) - Directory management
- [src-tauri/src/detector/mod.rs](src-tauri/src/detector/mod.rs) - Dependency detection
- [src-tauri/src/commands/installation_commands.rs](src-tauri/src/commands/installation_commands.rs) - Tauri commands
- [src-tauri/src/utils/paths.rs](src-tauri/src/utils/paths.rs) - Path utilities
- [src-tauri/src/lib.rs](src-tauri/src/lib.rs) - Main application entry point

## Support

For issues or questions about the installation system, please check:
1. This documentation
2. The GitHub repository issues
3. The main application README
