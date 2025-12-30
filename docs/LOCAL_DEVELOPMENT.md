# Local Development Guide

Complete guide for setting up and running Newsdeck locally with production database access.

## Quick Start

### Option 1: Auto-Start Proxy (Recommended)
Set up once, then forget about it:
```bash
npm run proxy:autostart
npm run dev
```

### Option 2: Manual Start Every Time
```bash
# Terminal 1: Start proxy
npm run proxy:start

# Terminal 2: Start dev server
npm run dev
```

### Option 3: All-in-One Command
Starts proxy if needed, then starts dev server:
```bash
npm run dev:full
```

---

## Prerequisites

### 1. Install Cloud SQL Proxy
```bash
brew install cloud-sql-proxy
```

### 2. Authenticate with Google Cloud
```bash
gcloud auth application-default login
```

Follow the prompts to authenticate with your Google account.

### 3. Environment Configuration
Ensure you have `.env.local` with:
```bash
DATABASE_URL=postgresql://newsdeck-user:PASSWORD@localhost:5432/newsdeck
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3002
```

---

## Architecture

```
┌─────────────────┐
│   Next.js App   │
│  (localhost:    │
│      3002)      │
└────────┬────────┘
         │
         │ DATABASE_URL=postgresql://...@localhost:5432/newsdeck
         │
         ▼
┌─────────────────┐
│ Cloud SQL Proxy │
│ (localhost:5432)│
└────────┬────────┘
         │
         │ Secure Tunnel
         │
         ▼
┌─────────────────┐
│  Cloud SQL DB   │
│   (GCP europe-  │
│    west1)       │
└─────────────────┘
```

**Why this setup?**
- Local development uses **production data** (real news items, dashboards)
- Frontend changes can be tested against real data
- No need to maintain separate test data
- Secure connection via Cloud SQL Proxy

---

## npm Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server (proxy must be running) |
| `npm run dev:full` | Start proxy (if needed) + dev server (all-in-one) |
| `npm run proxy:start` | Start Cloud SQL Proxy manually |
| `npm run proxy:stop` | Stop Cloud SQL Proxy |
| `npm run proxy:restart` | Restart Cloud SQL Proxy |
| `npm run proxy:status` | Check if proxy is running |
| `npm run proxy:check` | Verify proxy (exits with error if not running) |
| `npm run proxy:logs` | Tail proxy logs (see what's happening) |
| `npm run proxy:autostart` | Set up auto-start on login (macOS) |

---

## Troubleshooting

### "Page loads empty, no data"

**Cause**: Cloud SQL Proxy not running

**Solution**:
```bash
# Check if proxy is running
npm run proxy:status

# Start if not running
npm run proxy:start
```

### "ECONNREFUSED" errors in console

**Cause**: Database connection refused (proxy not running or wrong port)

**Solution**:
```bash
# Restart proxy
npm run proxy:restart

# Verify it's on the correct port (5432)
ps aux | grep cloud-sql-proxy
```

### "Failed to load location cache"

**Cause**: Database connection issue during server startup

**Solution**:
1. Check proxy is running: `npm run proxy:status`
2. Restart dev server after starting proxy
3. Check logs: `npm run proxy:logs`

### Authentication errors in proxy logs

**Cause**: GCP credentials expired or not set

**Solution**:
```bash
# Re-authenticate
gcloud auth application-default login

# Restart proxy
npm run proxy:restart
```

### Port 5432 already in use

**Cause**: Another PostgreSQL instance or proxy using the port

**Solution**:
```bash
# Find what's using the port
lsof -i :5432

# Kill the process if it's an old proxy instance
npm run proxy:stop

# Or kill by PID
kill -9 <PID>
```

---

## Visual Indicators (Development Only)

### Database Status Indicator
When running `npm run dev`, a status indicator appears in the bottom-right corner:

- **Green badge** (3 seconds): Database connected successfully
- **Red banner** (persistent): Database connection error
  - Shows specific error message
  - Provides command to fix (`npm run proxy:start`)
  - "Check again" button to retry connection

### Console Messages
The server startup will show:

**Proxy running:**
```
[Instrumentation] Loading location cache...
[Instrumentation] ✅ Location cache loaded successfully
```

**Proxy not running:**
```
╔════════════════════════════════════════════════════════╗
║  ⚠️  DATABASE CONNECTION ERROR                         ║
╚════════════════════════════════════════════════════════╝

❌ Cloud SQL Proxy is not running!

🚀 Start it with:
   npm run proxy:start
```

---

## Auto-Start Details

The `npm run proxy:autostart` command creates a macOS LaunchAgent that:

### Features
- ✅ Starts Cloud SQL Proxy automatically on login
- ✅ Restarts automatically if it crashes
- ✅ Listens on `localhost:5432`
- ✅ Logs to `/tmp/cloud-sql-proxy-newsdeck.log`

### Files Created
- **LaunchAgent**: `~/Library/LaunchAgents/com.newsdeck.cloud-sql-proxy.plist`
- **Stdout Log**: `/tmp/cloud-sql-proxy-newsdeck.log`
- **Stderr Log**: `/tmp/cloud-sql-proxy-newsdeck-error.log`

### Managing Auto-Start

**Check status:**
```bash
launchctl list | grep newsdeck
npm run proxy:status
```

**View logs:**
```bash
npm run proxy:logs

# Or directly:
tail -f /tmp/cloud-sql-proxy-newsdeck.log
```

**Disable auto-start:**
```bash
launchctl unload ~/Library/LaunchAgents/com.newsdeck.cloud-sql-proxy.plist
rm ~/Library/LaunchAgents/com.newsdeck.cloud-sql-proxy.plist
```

**Re-enable after disabling:**
```bash
npm run proxy:autostart
```

---

## Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| Next.js Dev Server | 3002 | Web application |
| Cloud SQL Proxy | 5432 | PostgreSQL proxy (matches standard PostgreSQL port) |
| Production Cloud SQL | N/A | Accessed via Unix socket or proxy tunnel |

---

## Database Connection Health Check

### Programmatic Check
```bash
curl http://localhost:3002/api/status/database
```

**Response when connected:**
```json
{
  "success": true,
  "database": {
    "connected": true,
    "type": "PostgreSQL",
    "status": "Connected",
    "proxyRequired": true,
    "proxyRunning": true
  },
  "action": null
}
```

**Response when proxy not running:**
```json
{
  "success": false,
  "database": {
    "connected": false,
    "type": "PostgreSQL",
    "status": "Cloud SQL Proxy not running",
    "proxyRequired": true,
    "proxyRunning": false
  },
  "action": "Run: npm run proxy:start"
}
```

---

## Development Workflow Tips

### Recommended Workflow
1. **One-time setup**: Run `npm run proxy:autostart`
2. **Daily development**: Just run `npm run dev`
3. **If issues occur**: Check `npm run proxy:status`

### When to Restart Proxy
- After system restart (if not using auto-start)
- After changing GCP credentials
- If getting connection errors
- After long idle periods

### Best Practices
- ✅ Use `npm run proxy:autostart` for seamless experience
- ✅ Keep proxy running in background (uses minimal resources)
- ✅ Check visual indicator when page loads empty
- ✅ Use `npm run proxy:logs` to debug connection issues
- ❌ Don't run multiple proxy instances (port conflict)
- ❌ Don't modify production data carelessly (shared database!)

---

## Advanced Usage

### Custom Proxy Configuration
Edit `scripts/start-prod-proxy.sh` to customize:
- Port number (default: 5432)
- Instance connection name
- Additional proxy flags

### Using Different Database
To use a local Docker PostgreSQL instead:
1. Comment out DATABASE_URL in `.env.local`
2. Set up local DB: `npm run db:setup`
3. Start local DB: `npm run db:start`
4. Update DATABASE_URL to point to localhost:5433

### Debugging Proxy Issues
```bash
# View all proxy processes
ps aux | grep cloud-sql-proxy

# Check network connections
lsof -i :5432

# Monitor logs in real-time
tail -f /tmp/cloud-sql-proxy-newsdeck.log

# Test database connection directly
psql postgresql://newsdeck-user:PASSWORD@localhost:5432/newsdeck
```

---

## Getting Help

### Still Having Issues?

1. **Check the logs**: `npm run proxy:logs`
2. **Verify authentication**: `gcloud auth application-default login`
3. **Test proxy manually**: `cloud-sql-proxy newsdeck-473620:europe-west1:newsdeck-db --port 5432`
4. **Check environment**: Ensure `.env.local` exists with correct DATABASE_URL
5. **Verify proxy installation**: `which cloud-sql-proxy`

### Common Error Messages

| Error | Solution |
|-------|----------|
| "cloud-sql-proxy could not be found" | Install: `brew install cloud-sql-proxy` |
| "dial unix /cloudsql/...: connect: no such file" | Using wrong DATABASE_URL format for local dev |
| "could not refresh access token" | Re-authenticate: `gcloud auth application-default login` |
| "bind: address already in use" | Kill existing proxy: `npm run proxy:stop` |

---

## Summary

**For the smoothest experience:**
```bash
# One-time setup
npm run proxy:autostart

# Daily workflow
npm run dev
```

That's it! The proxy will start automatically on login and your development environment will always have access to production data.
