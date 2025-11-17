# CI/CD Setup for AI Researcher Auto-Updates

This document describes the CI/CD automation setup for building, signing, and releasing the AI Researcher application with automatic update support.

## Overview

The CI/CD pipeline automatically:
1. Builds the application for multiple platforms (macOS, Windows, Linux)
2. Signs the application and update artifacts using the Tauri updater signing key
3. Creates a GitHub Release with all necessary assets
4. Generates the `latest.json` file that the updater checks for new versions

## Required GitHub Repository Secrets

Before the CI/CD workflow can run successfully, you must configure the following secrets in your GitHub repository:

### 1. `TAURI_SIGNING_PRIVATE_KEY`

**Description:** The private key used to sign update artifacts. This ensures that only authorized updates can be installed by the application.

**How to generate:**
```bash
# Generate a new key pair (if not already done)
cd src-tauri
cargo tauri signer generate -w ~/.tauri/myapp.key

# The command will output:
# - Public key (already in tauri.conf.json under plugins.updater.pubkey)
# - Private key (saved to ~/.tauri/myapp.key)
```

**How to set in GitHub:**
1. Read the private key file:
   ```bash
   cat ~/.tauri/myapp.key
   ```
2. Copy the entire content (including the header and footer lines)
3. Go to your GitHub repository → Settings → Secrets and variables → Actions
4. Click "New repository secret"
5. Name: `TAURI_SIGNING_PRIVATE_KEY`
6. Value: Paste the entire private key content
7. Click "Add secret"

**Security Note:** Never commit this private key to version control. Keep it secure and only store it in GitHub Secrets.

### 2. `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

**Description:** The password used to encrypt/decrypt the private signing key.

**How to generate:**
When you generated the key pair with the `-w` flag, you were prompted to enter a password. Use that same password here.

**How to set in GitHub:**
1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
4. Value: Enter the password you used when generating the key
5. Click "Add secret"

### 3. `GITHUB_TOKEN` (Automatic)

**Description:** This token is automatically provided by GitHub Actions and doesn't need to be configured manually. It's used to create releases and upload assets.

**Permissions:** The workflow is configured with `contents: write` permission to allow creating releases.

## Workflow Configuration

The workflow is defined in [.github/workflows/release.yml](.github/workflows/release.yml) and includes:

### Trigger

The workflow triggers automatically when you push a Git tag matching the pattern `v*.*.*` (e.g., `v1.0.1`, `v2.3.0`).

### Build Matrix

The workflow builds the application for multiple platforms in parallel:
- **macOS:** Both Apple Silicon (aarch64) and Intel (x86_64)
- **Windows:** 64-bit
- **Linux:** Ubuntu 22.04 (64-bit)

### Build Steps

1. **Checkout code:** Retrieves the repository code
2. **Setup Node.js:** Installs Node.js 20 with npm caching
3. **Install Rust:** Installs the Rust toolchain with appropriate targets
4. **Install dependencies:** Installs system dependencies (Linux only)
5. **Install frontend dependencies:** Runs `npm ci` to install JavaScript dependencies
6. **Build and Release:** Uses `tauri-apps/tauri-action` to:
   - Run the Tauri build command
   - Sign all artifacts with the private key
   - Create a GitHub Release
   - Upload all assets (installers, .sig files, latest.json)

## Release Assets

After a successful workflow run, the GitHub Release will contain:

### Installers (for new installations)
- **macOS:** `.dmg` files for both architectures
- **Windows:** `.msi` and `.exe` installers
- **Linux:** `.AppImage` and `.deb` packages

### Update Artifacts (for auto-updates)
- **`.tar.gz` files:** Compressed update bundles for each platform
- **`.sig` files:** Digital signatures for each update bundle
- **`latest.json`:** Metadata file containing version info and download URLs

### Example latest.json Structure
```json
{
  "version": "1.0.1",
  "notes": "Release notes here",
  "pub_date": "2025-01-17T10:30:00Z",
  "platforms": {
    "darwin-x86_64": {
      "signature": "...",
      "url": "https://github.com/AssafMiron/ai-researcher/releases/download/v1.0.1/ai-researcher_1.0.1_x64.app.tar.gz"
    },
    "darwin-aarch64": {
      "signature": "...",
      "url": "https://github.com/AssafMiron/ai-researcher/releases/download/v1.0.1/ai-researcher_1.0.1_aarch64.app.tar.gz"
    },
    "windows-x86_64": {
      "signature": "...",
      "url": "https://github.com/AssafMiron/ai-researcher/releases/download/v1.0.1/ai-researcher_1.0.1_x64-setup.nsis.zip"
    },
    "linux-x86_64": {
      "signature": "...",
      "url": "https://github.com/AssafMiron/ai-researcher/releases/download/v1.0.1/ai-researcher_1.0.1_amd64.AppImage.tar.gz"
    }
  }
}
```

## How to Create a Release

### Step 1: Update Version Number

Update the version in [src-tauri/tauri.conf.json](../src-tauri/tauri.conf.json):

```json
{
  "productName": "ai-researcher",
  "version": "1.0.1",
  ...
}
```

Also update [package.json](../package.json) if needed:

```json
{
  "name": "ai-researcher",
  "version": "1.0.1",
  ...
}
```

### Step 2: Commit Changes

```bash
git add src-tauri/tauri.conf.json package.json
git commit -m "chore: bump version to 1.0.1"
git push origin main
```

### Step 3: Create and Push Tag

```bash
# Create an annotated tag
git tag -a v1.0.1 -m "Release v1.0.1"

# Push the tag to GitHub
git push origin v1.0.1
```

### Step 4: Monitor Workflow

1. Go to your GitHub repository → Actions tab
2. You should see the "Release" workflow running
3. Monitor the progress for each platform build
4. Once complete, check the Releases page for the new release

### Step 5: Verify Release

1. Go to your GitHub repository → Releases
2. Verify all assets are present:
   - Installers for each platform
   - `.tar.gz` update bundles
   - `.sig` signature files
   - `latest.json` file
3. Test the auto-update feature by running an older version of the app

## Troubleshooting

### Build Failures

**Problem:** Workflow fails during the build step

**Solutions:**
- Check the workflow logs for specific error messages
- Ensure all dependencies are properly declared in `package.json` and `Cargo.toml`
- Verify that the Tauri configuration is valid

### Signing Failures

**Problem:** Workflow fails with signing-related errors

**Solutions:**
- Verify that `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets are correctly set
- Ensure the private key format is correct (including header/footer lines)
- Check that the password matches the one used when generating the key

### Release Creation Failures

**Problem:** Workflow completes but release is not created

**Solutions:**
- Verify that the workflow has `contents: write` permission
- Check that `GITHUB_TOKEN` has sufficient permissions
- Ensure the tag follows the `v*.*.*` pattern

### Updates Not Detected

**Problem:** The app doesn't detect new updates

**Solutions:**
- Verify that `latest.json` is present in the release assets
- Check that the updater endpoint in `tauri.conf.json` points to the correct URL
- Ensure the public key in `tauri.conf.json` matches the private key used for signing
- Verify that the version in `latest.json` is higher than the currently installed version

## Security Best Practices

1. **Never commit private keys:** Always store keys in GitHub Secrets
2. **Rotate keys periodically:** Generate new key pairs and update secrets regularly
3. **Use strong passwords:** Protect your private key with a strong password
4. **Limit access:** Only grant repository access to trusted contributors
5. **Monitor releases:** Regularly audit your releases for unauthorized modifications
6. **Enable 2FA:** Require two-factor authentication for all contributors

## Additional Resources

- [Tauri Updater Documentation](https://tauri.app/v1/guides/distribution/updater/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Tauri Action Repository](https://github.com/tauri-apps/tauri-action)
