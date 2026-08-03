# Deployment

## Development
```bash
cd apps/mobile
npm install
npx expo start
```

## OTA updates
Use Expo EAS Update to push JavaScript-only updates over the air without store review.

## Store builds
```bash
npm install -g eas-cli
eas build --platform ios
eas build --platform android
```
Configure `eas.json` for internal/staging/production channels.

## Requirements
- iOS 15+
- Android 8.0+ (API 26)
- Works on phones (4.7"–7"), tablets, and foldables.

## Release checklist
- [ ] Bump versions in `app.json` and `package.json`.
- [ ] Test on small (iPhone SE) and large (iPad Pro) form factors.
- [ ] Verify streaming/voice/attachments on iOS and Android.
- [ ] Verify offline queue behavior by enabling airplane mode.
