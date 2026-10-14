# Development Setup

Guide for developers and LLM coding agents to set up a local development environment for oc-sync.

## Prerequisites

- Node.js 18+
- npm
- GitHub Personal Access Token with `repo` scope
- OpenCode installed

## Quick Setup

### 1. Clone and Build

```bash
git clone https://github.com/ErcinDedeoglu/opencode-sync.git
cd opencode-sync
npm install
npm run build
```

### 2. Register Plugin with OpenCode

Requires OpenCode v2. Point the global config `~/.config/opencode/opencode.json(c)` at the plugin
**directory** using the V2 `plugins` field:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "/absolute/path/to/opencode-sync"
  ]
}
```

Replace `/absolute/path/to/opencode-sync` with the actual path to your cloned repo. V2 loads local
plugins from a directory/package (its `package.json`/`index.js`), not from `dist/index.js`
directly. Alternatively, copy/symlink the built directory under `~/.config/opencode/plugins/` and
it will be discovered automatically.

### 3. Set GitHub Token

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

The token needs `repo` scope to create and access the private sync repository.

### 4. Start OpenCode

```bash
opencode service restart
opencode plugin list   # should list oc-sync
```

### 5. Verify Plugin Loaded

Check the log file:

```bash
cat ~/.local/share/opencode/log/opencode-sync.log
```

Expected output:
```
[opencode-sync] Plugin starting...
[opencode-sync] Token loaded from: environment variable
[opencode-sync] Setting up sync storage...
[opencode-sync] Creating sync repository...
[opencode-sync] Linked to repo: username/.opencode-sync
[opencode-sync] Plugin ready
```

## Development Workflow

### Watch Mode

Run TypeScript compiler in watch mode for automatic rebuilds:

```bash
npm run dev
```

After each rebuild, restart OpenCode to pick up changes.

### Manual Build

```bash
npm run build
```

### Code Quality

```bash
npm run check      # Run all checks (typecheck + lint + format)
npm run typecheck  # TypeScript type checking
npm run lint       # ESLint
npm run format     # Prettier
```

## File Structure

```
src/
├── plugin/           # OpenCode plugin integration
│   ├── plugin.ts     # Main plugin entry point
│   └── state-manager.ts
├── sync/
│   ├── engine/       # Core sync orchestration
│   ├── merge/        # Three-way merge logic
│   ├── operations/   # Push/pull operations
│   └── watcher/      # File system watcher
├── storage/          # GitHub repo backend
├── data/             # Local data loading/saving
├── crypto/           # Encryption for credentials
└── types/            # TypeScript type definitions
```

## Log File Location

All plugin logs go to:

```
~/.local/share/opencode/log/opencode-sync.log
```

Tail logs in real-time:

```bash
tail -f ~/.local/share/opencode/log/opencode-sync.log
```

## Configuration

After first run, the plugin creates `~/.config/opencode/opencode-sync.json`:

```json
{
  "token": "ghp_...",
  "machineId": "hostname-abc123",
  "repoOwner": "username",
  "repoName": ".opencode-sync",
  "autoSyncOnStartup": true,
  "continuousSync": true,
  "syncIntervalMinutes": 5,
  "sync": {
    "config": true,
    "state": true,
    "credentials": true,
    "sessions": true,
    "messages": true,
    "projects": true,
    "todos": true
  }
}
```

## Encryption Key Rotation

To rotate encryption keys without losing access to credentials:

1. Add both keys to config on ALL machines:
```json
{
  "encryptionKey": "new-key-here",
  "oldEncryptionKey": "old-key-here"
}
```

2. Restart OpenCode on each machine - it will:
   - Decrypt using `oldEncryptionKey` (fallback)
   - Re-encrypt using `encryptionKey` on next push

3. After all machines have synced, remove `oldEncryptionKey`

## Troubleshooting

### Plugin not loading

1. Confirm OpenCode v2 and that the global config uses `plugins` (plural) with an absolute path to the plugin directory
2. Ensure `npm run build` completed successfully
3. Run `opencode plugin list`; if `oc-sync` is missing, restart with `opencode service restart`
4. Check OpenCode logs: `~/.local/share/opencode/log/*.log`

### "No configuration found"

Set `GITHUB_TOKEN` environment variable or create config file manually.

### "Failed to create repo"

- Verify token has `repo` scope
- Check if repo already exists at `github.com/username/.opencode-sync`

### Changes not reflecting

1. Run `npm run build`
2. Restart the OpenCode service: `opencode service restart` (the TUI is not enough)
