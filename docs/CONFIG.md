# Configuration

## Prerequisites

Requires **OpenCode v2** (2.0.28+). OpenCode 1.x users need `oc-sync@0.1.x` with the V1
`"plugin"` (singular) config key.

Install the plugin (published package):

```bash
opencode plugin add oc-sync@^0.2.0
```

Or use a local build directory (see [Development Setup](DEV-SETUP.md)). Register it in the global
config `~/.config/opencode/opencode.json(c)` under the V2 **`plugins`** field:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["oc-sync"]
}
```

For a local build, use an absolute directory path:

```jsonc
{
  "plugins": ["/absolute/path/to/oc-sync"]
}
```

Plugin package directories under `~/.config/opencode/plugins/` are discovered automatically.
After changing config or plugins, restart OpenCode (`opencode service restart`).

See [Sync Paths](SYNC-PATHS.md) for platform-specific directory locations.

## Quick Start

1. Create a [GitHub Personal Access Token](https://github.com/settings/tokens) with `repo` scope
2. Set environment variable:

```bash
# Linux/macOS
export GITHUB_TOKEN=ghp_your_token_here

# Windows (PowerShell)
$env:GITHUB_TOKEN = "ghp_your_token_here"
```

3. Start OpenCode - the plugin automatically creates a private repo for sync storage

Add to your shell profile for persistence:
- Linux: `~/.bashrc` or `~/.zshrc`
- macOS: `~/.zshrc`
- Windows: Use System Environment Variables or PowerShell profile

## Alternative: Config File

Instead of environment variable, create `opencode-sync.json` in the config directory:

```json
{
  "token": "ghp_your_token_here"
}
```

Config file token takes precedence over environment variable.

## What Happens on First Run

When the plugin starts with a valid token but no storage configured:

1. Detects your GitHub username automatically
2. Creates a new **private** repository called `.opencode-sync`
3. Initializes the `.opencode-sync/` directory with a manifest
4. Saves the repo info to `~/.config/opencode/opencode-sync.json`
5. Future runs will use the same repository

## Verifying Configuration

After starting OpenCode, check the logs for:

```
[opencode-sync] Token loaded from: environment variable
[opencode-sync] Setting up sync storage...
[opencode-sync] Creating sync repository...
[opencode-sync] Linked to repo: username/.opencode-sync
[opencode-sync] Repo saved to config
[opencode-sync] Plugin ready
```

On subsequent runs:

```
[opencode-sync] Token loaded from: environment variable
[opencode-sync] Linked to repo: username/.opencode-sync
[opencode-sync] Plugin ready
```

## Full Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `token` | string | - | GitHub PAT with `repo` scope (required) |
| `repoOwner` | string | auto | GitHub username (auto-detected) |
| `repoName` | string | `.opencode-sync` | Repository name for sync storage |
| `branch` | string | auto | Branch name (auto-detected: main/master) |
| `autoSyncOnStartup` | boolean | `true` | Sync when OpenCode starts |
| `continuousSync` | boolean | `true` | Watch files and sync on changes |
| `syncIntervalMinutes` | number | `5` | Periodic sync interval |
| `fileWatcherDebounceMs` | number | `5000` | Wait after file change before sync |
| `maxDebounceMs` | number | `30000` | Max wait during heavy activity |
| `conflictStrategy` | string | `auto-merge` | How to resolve conflicts |
| `advisoryLockTimeoutSeconds` | number | `30` | Lock timeout for concurrent sync prevention |
| `maxRetryAttempts` | number | `3` | Max retries on transient failures |
| `retryDelayMs` | number | `1000` | Delay between retry attempts |
| `tombstoneGraceDays` | number | `30` | Days before deleted item markers expire |

## Sync Categories

Control what gets synced:

```json
{
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

All categories are enabled by default. Disable `messages` if you have very large conversation history (8MB+).

## Conflict Strategies

| Strategy | Description |
|----------|-------------|
| `auto-merge` | Attempt automatic three-way merge (default) |
| `local-wins` | Keep local changes on conflict |
| `remote-wins` | Keep remote changes on conflict |
| `newest-wins` | Keep whichever is newer |
| `ask` | Prompt for resolution |

## Example: Full Config

```json
{
  "token": "ghp_your_token_here",
  "repoOwner": "auto-detected-username",
  "repoName": ".opencode-sync",
  "autoSyncOnStartup": true,
  "continuousSync": true,
  "syncIntervalMinutes": 5,
  "fileWatcherDebounceMs": 5000,
  "maxDebounceMs": 30000,
  "sync": {
    "config": true,
    "state": true,
    "credentials": true,
    "sessions": true,
    "messages": true,
    "projects": true,
    "todos": true
  },
  "conflictStrategy": "auto-merge",
  "advisoryLockTimeoutSeconds": 30,
  "maxRetryAttempts": 3,
  "retryDelayMs": 1000,
  "tombstoneGraceDays": 30
}
```

Note: `machineId`, `keySalt`, and `passphraseHash` are auto-generated and should not be manually edited.
