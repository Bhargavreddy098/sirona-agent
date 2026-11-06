# Sirona Startup Guide

## Option 1: Desktop Electron App (Recommended)

```powershell
cd "C:\Users\bharg\OneDrive\Desktop\personal -agent"
.\start-sirona.ps1
```

This launches:
- **Backend** on `http://127.0.0.1:8000`
- **Desktop Web Server** on `http://127.0.0.1:5176` (serves the built React app)
- **Electron Shell** with full OS integration

## Option 2: Web Browsers Only

```powershell
# Start backend only
npm --prefix apps/server run start

# In another terminal, serve the built frontend
cd apps/web
npx serve -s dist -l 5176
```

Then open: `http://127.0.0.1:5176`

## Option 3: Web Dev Server (Hot Reload)

If you need hot-reload during development:

```powershell
# Terminal 1: Start backend
cd apps/server && node server.js

# Terminal 2: Start web dev server
cd apps/web && npm run dev

# Open: http://127.0.0.1:5178
```

**Note:** Web dev server (port 5178) requires additional bootstrap setup for authentication.

## Adding a Local Folder

### Using Electron/Desktop:
1. Click the sidebar folder icon or press `Cmd+,` to open Settings
2. Use "Pick Folder" button to select your project

### API Endpoint:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/workspace-root \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf-token>" \
  -d '{"projectId": "<project-id>", "rootPath": "/path/to/your/folder"}'
```

## Model Access

Models are available after bootstrap:
- Check `.env` for API keys (GEMINI_API_KEY, etc.)
- Access via `/api/v1/providers` endpoint
- Configure in Settings → Providers tab