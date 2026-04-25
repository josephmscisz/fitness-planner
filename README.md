# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Railway Backend Deployment (WHOOP)

Yes, create the Railway project from this same repository.

This repo has two apps:
- Desktop/frontend app at the repo root
- WHOOP backend in `server/`

For Railway, deploy only the `server/` app.

### 1. Create the Railway service from this repo

1. In Railway, choose **New Project** -> **Deploy from GitHub repo**.
2. Select this repository.
3. In the created service settings, set **Root Directory** to `server`.
4. Railway will use `server/railway.json`:
	- Build command: `npm run build`
	- Start command: `node dist-build/index.js`

### 2. Add environment variables in Railway

Set these variables in the Railway service:

- `WHOOP_CLIENT_ID` = your WHOOP app client id
- `WHOOP_CLIENT_SECRET` = your WHOOP app client secret
- `WHOOP_REDIRECT_URI` = `https://<your-railway-domain>/whoop/callback`
- `TOKEN_STORE_PATH` = `/data/whoop-token-store.json`

Notes:
- Railway provides `PORT` automatically.
- `TOKEN_STORE_PATH` should point to a mounted volume path (next step).

### 3. Attach a persistent volume (required)

1. In Railway, add a volume to this backend service.
2. Mount it at `/data`.

Without a volume, tokens can be lost on redeploy/restart.

### 4. Configure WHOOP redirect URI

In WHOOP developer settings, set the callback URI exactly to:

`https://<your-railway-domain>/whoop/callback`

It must match exactly.

### 5. Point the desktop app to Railway backend

Set in your app environment:

- `VITE_WHOOP_BACKEND_BASE=https://<your-railway-domain>`

Then rebuild/package the desktop app so testers use Railway instead of localhost.

### 6. Validate after deploy

Open these URLs:

- `https://<your-railway-domain>/health`
- `https://<your-railway-domain>/whoop/status`
- `https://<your-railway-domain>/whoop/token-info`

`/whoop/token-info` is a safe debug endpoint that shows token state metadata (no raw tokens).

### 7. First-time connect flow

1. In app, click **Connect WHOOP** once.
2. Complete WHOOP consent.
3. Click **Sync WHOOP**.

After this, refresh tokens should handle future syncs without repeated consent unless WHOOP revokes access.
