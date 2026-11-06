# Sirona Shell Commands Reference

## Basic Startup Commands

```bash
# Start everything (PowerShell)
powershell -File start-sirona.ps1

# Start everything (Bash)
./start-sirona.bat
```

## Manual Service Management

```bash
# Start backend only
cd apps/server && node server.js

# Start web dev server
cd apps/web && npm run dev

# Start desktop web server (production build)
cd apps/desktop && node src/server.cjs

# Build web frontend
cd apps/web && npm run build
```

## Check Running Services

```bash
# Health check
curl http://127.0.0.1:8000/health

# Ready check
curl http://127.0.0.1:8000/health/ready

# Database status
curl http://127.0.0.1:8000/health 2>&1 | jq '.db'
```

## API Examples (Requires Session Bootstrap First)

```bash
# Get CSRF token (no auth required for bootstrap itself)
curl -X POST http://127.0.0.1:8000/api/v1/session/bootstrap

# List providers (after bootstrap)
curl -H "X-CSRF-Token: <token>" -H "Cookie: asi_session=<session>" \
  http://127.0.0.1:8000/api/v1/providers

# Test a provider connection
curl -X POST -H "X-CSRF-Token: <token>" \
  -H "Content-Type: application/json" \
  -d '{"id":"<connection-id>"}' \
  http://127.0.0.1:8000/api/v1/provider-connections/<id>/test
```

## Desktop Commands

```bash
# Start Electron dev mode
cd apps/desktop && npm run dev

# Build desktop security modules
cd apps/desktop && npm run build
```

## Quick Troubleshooting

```bash
# Check if ports are in use
netstat -ano | findstr -E "8000|5176|5178"

# Kill backend process
pkill -f "node.*server.js"

# Kill desktop server
pkill -f "server.cjs"
```