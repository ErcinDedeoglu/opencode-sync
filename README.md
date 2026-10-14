# OpenCode Sync

Sync your OpenCode configuration, sessions, and data across multiple machines using a private GitHub repository.

## Features

- **Sync Everything** - Config, sessions, messages, credentials, prompts, and more
- **Multi-Machine Support** - Safely sync across laptops, VMs, and servers simultaneously
- **Conflict Resolution** - Vector clocks detect conflicts, three-way merge resolves them
- **Encrypted Credentials** - AES-256-GCM encryption for sensitive data
- **Auto-Sync** - Syncs on startup, on file changes (5s debounce, 30s max), and every 5 minutes
- **Offline-Friendly** - Works offline, syncs when reconnected
- **Atomic Updates** - Uses Git's compare-and-swap for safe concurrent access

## Requirements

- **OpenCode v2** (2.0.28 or newer). This release uses the V2 plugin API (`@opencode/plugin`).
  For OpenCode 1.x, use `oc-sync@0.1.x` and the V1 `"plugin"` (singular) config key.
- Node.js 18+
- A GitHub Personal Access Token with `repo` scope

## Installation (OpenCode v2)

**Step 1:** Add the plugin. Either install the published package:

```bash
opencode plugin add oc-sync@^0.2.0
```

Or use a local build/clone (see [Development Setup](docs/DEV-SETUP.md)) and point OpenCode at its
directory — V2 loads local plugins from a directory or package, not a single file.

**Step 2:** Register the plugin in your global config `~/.config/opencode/opencode.json(c)` using the
V2 **`plugins`** field:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["oc-sync"]
}
```

For a local directory, use an absolute path:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/oc-sync"]
}
```

Plugin package directories placed directly under `~/.config/opencode/plugins/` are also discovered
automatically.

**Step 3:** Configure your GitHub token (see [Configuration](#configuration) below).

**Step 4:** Restart OpenCode so the plugin loads:

```bash
opencode service restart
```

Verify it loaded with `opencode plugin list` — you should see `oc-sync`.

Using an AI coding agent? See [LLM Installation Guide](docs/LLM-INSTALL.md) for step-by-step prompts.

> **Note:** OpenCode uses XDG paths on all platforms. See [Sync Paths](docs/SYNC-PATHS.md) for platform-specific locations.

## What Gets Synced

| Category | Data | Default |
|----------|------|---------|
| Config | `opencode.json`, agents, commands, modes, tools, themes | ✅ Enabled |
| State | Model selections, prompt history, stashed prompts | ✅ Enabled |
| Credentials | OAuth tokens, MCP auth (encrypted) | ✅ Enabled |
| Sessions | Session metadata and history | ✅ Enabled |
| Messages | Conversation messages and parts | ✅ Enabled |
| Projects | Project configurations | ✅ Enabled |
| Todos | Task lists and session diffs | ✅ Enabled |

## How It Works

### Vector Clocks for Conflict Detection

Each machine maintains a logical timestamp. When syncing:

1. **Equal** - Both in sync, no action needed
2. **Local Ahead** - Safe to push
3. **Remote Ahead** - Need to pull
4. **Concurrent** - Both changed, needs merge

### Three-Way Merge

When conflicts occur:

1. Find common ancestor (last synced version)
2. Compute diffs from ancestor to local and remote
3. If diffs don't overlap -> auto-merge
4. If diffs overlap -> apply conflict strategy

### Conflict Strategies

Configure in `opencode-sync.json`:

- `auto-merge` (default) - Attempt automatic merge
- `local-wins` - Keep local changes on conflict
- `remote-wins` - Keep remote changes on conflict
- `newest-wins` - Keep whichever is newer
- `ask` - Prompt for resolution

## Configuration

1. Create a [GitHub Personal Access Token](https://github.com/settings/tokens) with `repo` scope
2. Set environment variable:

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

3. Start OpenCode - the plugin automatically creates a private repo for sync storage

See [Configuration Guide](docs/CONFIG.md) for all options.

## Security

- Credentials are encrypted with AES-256-GCM before upload
- Encryption key is derived from your passphrase using PBKDF2
- The repository is created as **private** (not public)
- Token is stored locally, never uploaded
- Atomic commits with compare-and-swap prevent race conditions

## Documentation

| Guide | Description |
|-------|-------------|
| [Configuration](docs/CONFIG.md) | All configuration options |
| [Architecture](docs/ARCHITECTURE.md) | Code structure and modules |
| [Sync Architecture](docs/SYNC.md) | Sync triggers, batching, data categories |
| [Sync Paths](docs/SYNC-PATHS.md) | OpenCode file locations by platform |
| [Development Setup](docs/DEV-SETUP.md) | Local development environment |
| [OpenCode V2 Upgrade](docs/UPGRADE-OPENCODE-V2.md) | V1 → V2 plugin migration notes |
| [Publishing](docs/PUBLISH.md) | npm release process |
| [LLM Installation](docs/LLM-INSTALL.md) | Instructions for AI coding agents |
| [TODO](docs/TODO.md) | Future improvements |

## License

AGPL-3.0
