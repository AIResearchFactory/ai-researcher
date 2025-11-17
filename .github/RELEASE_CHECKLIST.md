# Release Checklist

Quick reference guide for creating a new release with auto-update support.

## Pre-Release Setup (One-Time)

### Configure GitHub Secrets

Ensure these secrets are set in GitHub Repository Settings → Secrets and variables → Actions:

- [ ] `TAURI_SIGNING_PRIVATE_KEY` - Your Tauri signing private key
- [ ] `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` - Password for the private key

**To generate keys (if not done):**
```bash
cd src-tauri
cargo tauri signer generate -w ~/.tauri/myapp.key
# Update the public key in tauri.conf.json
# Store the private key in GitHub Secrets
```

## Release Process

### 1. Update Version Numbers

- [ ] Update version in `src-tauri/tauri.conf.json`
- [ ] Update version in `package.json` (if applicable)
- [ ] Update version in `src-tauri/Cargo.toml` (if applicable)

### 2. Update Release Notes (Optional)

- [ ] Update CHANGELOG.md or prepare release notes
- [ ] Document new features, bug fixes, and breaking changes

### 3. Commit and Push Changes

```bash
git add .
git commit -m "chore: bump version to X.Y.Z"
git push origin main
```

### 4. Create and Push Tag

```bash
# Create annotated tag
git tag -a vX.Y.Z -m "Release vX.Y.Z"

# Push tag to trigger workflow
git push origin vX.Y.Z
```

### 5. Monitor Build

- [ ] Go to GitHub Actions tab
- [ ] Watch the "Release" workflow progress
- [ ] Verify all platform builds succeed

### 6. Verify Release Assets

Check the GitHub Release page for:

- [ ] macOS installers (.dmg) - Apple Silicon and Intel
- [ ] Windows installers (.msi, .exe)
- [ ] Linux packages (.AppImage, .deb)
- [ ] Update bundles (.tar.gz files)
- [ ] Signature files (.sig files)
- [ ] `latest.json` file

### 7. Test Auto-Update

- [ ] Install the previous version on a test machine
- [ ] Launch the app and check for updates
- [ ] Verify the update downloads and installs correctly
- [ ] Confirm the new version is running

## Troubleshooting

### Build Failed
1. Check GitHub Actions logs for errors
2. Verify all secrets are correctly configured
3. Ensure dependencies are up to date

### Updates Not Working
1. Verify `latest.json` exists in the release
2. Check the updater endpoint URL in `tauri.conf.json`
3. Ensure version in `latest.json` > installed version
4. Verify signature keys match (public in config, private in secrets)

## Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **Major (X.0.0):** Breaking changes
- **Minor (0.X.0):** New features (backward compatible)
- **Patch (0.0.X):** Bug fixes (backward compatible)

## Emergency Rollback

If a release has critical issues:

1. Create a new patch release with the fix
2. Follow the normal release process
3. The auto-updater will push the fixed version to users

**Note:** You cannot delete or modify existing releases as users may have already downloaded them.

## Additional Resources

- [Full CI/CD Documentation](./CICD_SETUP.md)
- [Tauri Updater Docs](https://tauri.app/v1/guides/distribution/updater/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
