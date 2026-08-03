# Deployment

```bash
cd desktop
npm run build
```
Uses electron-builder to produce signed Windows (`.exe`/`.msi`), macOS (`.dmg`), and Linux (AppImage/deb/rpm) binaries. Distribute via GitHub Releases with `electron-updater` for auto-updates.
