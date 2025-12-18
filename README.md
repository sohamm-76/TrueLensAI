# TrueLensAI (Backend API + Chrome Extension)

This repo contains:
- **`backend/`**: Express API that verifies Firebase ID tokens and uses **Google Gemini** to analyze articles.
- **`extension/`**: A Chrome Extension (MV3). The **loadable build output** is in `extension/dist/`.

## Backend setup

### 1) Create `backend/.env`

Copy the template:
- Copy `backend/env.example` → `backend/.env`
- Fill in:
  - `FIREBASE_PROJECT_ID`
  - `GOOGLE_GENERATIVE_AI_API_KEY`
  - (optional) `SERPER_API_KEY`

### 2) Add Firebase Admin service account JSON

Place your Firebase service account JSON here:
- `backend/firebase-key.json`

Or set `FIREBASE_SERVICE_ACCOUNT_PATH` in `backend/.env` to the file path.

### 3) Start the API

From the repo root:

```bash
npm run backend:start
```

The server should run at `http://localhost:5000` and expose:
- `GET /health`
- `POST /api/analyze` (requires Firebase ID token)
- `POST /api/chat` (requires Firebase ID token)
- `POST /api/report-inaccuracy` (requires Firebase ID token)
- `GET /api/user/history` (requires Firebase ID token)
- `GET /api/user/profile` (requires Firebase ID token)

## Extension setup (Chrome)

### 1) Load the extension

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select: `extension/dist`

### 2) Configure OAuth (required)

In `extension/dist/manifest.json`, replace:
- `oauth2.client_id`: `REPLACE_WITH_YOUR_CLIENT_ID.apps.googleusercontent.com`

### 3) Firebase Web config

The extension currently bundles Firebase web config at:
- `extension/dist/firebase-config.json`

If you want to use your own Firebase project, update that JSON.

## Security notes

- **Do not commit** `backend/firebase-key.json` (service account credentials). This repo’s `.gitignore` ignores it.
- The extension’s `firebase-config.json` is **not a secret**, but it ties the build to a Firebase project.

