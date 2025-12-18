# TrueLensAI Extension

## Load in Chrome (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder: `extension/dist`

## Required setup

- **OAuth client id**: edit `extension/dist/manifest.json` and replace:
  - `oauth2.client_id`: `REPLACE_WITH_YOUR_CLIENT_ID.apps.googleusercontent.com`

- **Firebase web config**: the extension reads config from:
  - `extension/dist/firebase-config.json`
  - `background.js` seeds it into `chrome.storage.local` on first run.

## Dev notes

- This repo currently treats `extension/dist/` as the build artifact to load in Chrome.
- Source included here is currently limited to `extension/src/content-script.ts` (typecheck via `npm --prefix extension run typecheck`).


