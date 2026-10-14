# Architecture

## Directory Structure

```
src/
├── index.ts              # Main entry point
├── plugin/               # Plugin module
├── storage/              # Storage backend abstraction
├── sync/                 # Sync engine and operations
├── crypto/               # Encryption utilities
├── data/                 # Data loading module
└── types/                # TypeScript definitions
```

## Modules

### plugin/

OpenCode plugin integration.

| File | Purpose |
|------|---------|
| `plugin.ts` | Plugin definition (`Plugin.define`, OpenCode V2 API) |
| `state-manager.ts` | Plugin state management |
| `sync-handler.ts` | Sync operation handler |
| `types.ts` | Plugin types |

### storage/

Storage backend abstraction for GitHub repository.

| File | Purpose |
|------|---------|
| `interface.ts` | StorageBackend interface |
| `repo/repo-client.ts` | GitHub API client |
| `repo/fetch.ts` | Fetch with retry logic |
| `repo/errors.ts` | API error types |

### sync/engine/

Core sync orchestration.

| File | Purpose |
|------|---------|
| `sync-engine.ts` | Main sync orchestration |
| `state.ts` | Local state management |
| `manifest.ts` | Manifest operations |
| `result.ts` | Result builders |
| `helpers.ts` | Engine utilities |
| `retry.ts` | Retry logic |
| `errors.ts` | Sync error types |
| `types.ts` | Engine types |

### sync/operations/

Push, pull, and merge operations.

| File | Purpose |
|------|---------|
| `push.ts` | Push to remote |
| `pull.ts` | Pull from remote |
| `merge-operation.ts` | Merge conflicts |
| `sharding.ts` | Item sharding |
| `helpers.ts` | Operation utilities |
| `crypto-helpers.ts` | Encryption helpers |
| `types.ts` | Operation types |

### sync/merge/

Three-way merge algorithms.

| File | Purpose |
|------|---------|
| `json-merge.ts` | JSON merge algorithm |
| `jsonl-merge.ts` | JSONL merge algorithm |
| `utils.ts` | Merge utilities |
| `types.ts` | Merge types |

### sync/watcher/

File system watcher for auto-sync.

| File | Purpose |
|------|---------|
| `file-watcher.ts` | Main watcher class |
| `directory-watcher.ts` | Directory watching |
| `ignore-patterns.ts` | File ignore rules |
| `types.ts` | Watcher types |

### sync/ (root files)

| File | Purpose |
|------|---------|
| `vector-clock.ts` | Vector clock operations |
| `packer.ts` | Blob compression |
| `item-packer.ts` | Per-item compression |
| `tombstone.ts` | Deletion tracking |
| `local-lock.ts` | Local sync locking |

### crypto/

| File | Purpose |
|------|---------|
| `encrypt.ts` | AES-256-GCM encryption |

### data/

Local data loading and persistence.

| File | Purpose |
|------|---------|
| `category-loader.ts` | Load by category |
| `directory-loader.ts` | Directory traversal |
| `parsers.ts` | JSON/JSONL parsing |
| `writer.ts` | Write local data |
| `state.ts` | Config/state persistence |

### types/

TypeScript type definitions.

| File | Purpose |
|------|---------|
| `config.ts` | Config types |
| `manifest.ts` | Manifest types |
| `sync.ts` | Sync result types |
| `vector-clock.ts` | Vector clock types |
| `categories.ts` | Category definitions |
| `paths.ts` | Path configuration |

## Data Flow

```
Local Files → Data Loader → Sync Engine → Storage Backend → GitHub Repo
                               ↑
                          Vector Clock
                          Merge Logic
                          Encryption
```

## Key Concepts

### Vector Clocks
Track causality between machines. See `sync/vector-clock.ts`.

### Three-Way Merge
Resolve conflicts using common ancestor. See `sync/merge/`.

### Tombstones
Track deletions for propagation. See `sync/tombstone.ts`.

### Sharding
Split large item collections across files. See `sync/operations/sharding.ts`.
