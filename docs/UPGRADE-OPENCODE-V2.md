# Upgrade plan: OpenCode V2 plugin API

Tracking branch: `feat/opencode-v2-plugin` (from `main` @ `0.1.19`).

## 1. Problem

OpenCode **v2.x** changed the plugin module contract. A plugin's default export must now be an
**object** shaped `{ id, effect }` (Effect API) or `{ id, setup }` (Promise API). `oc-sync` currently
exports a **function**, which V2 rejects before the plugin code ever runs:

```
PluginModule.LoadError: Plugin must export a default definition with an id and an effect or setup
function. (cause: SchemaError(Expected object at ["default"]))
```

Two independent causes:

1. **API break** (main): the plugin uses the V1 shape (`export default async () => ...`).
2. **Config shape** (secondary): V2 renamed the config field `plugin` → `plugins`, and local plugin
   paths must point at a directory/package, not a single file.

Current state on `main` (and published `0.1.19`) is V1-only:

```ts
// src/plugin/plugin.ts
export const OpencodeSyncPlugin = async (_ctx: unknown): Promise<Record<string, unknown>> => { ... };
// src/index.ts
export default OpencodeSyncPlugin;
```

## 2. V1 → V2 API delta

The official V2 package is **`@opencode/plugin`**, versioned in lockstep with OpenCode (use the
version matching the target runtime, e.g. `^2.0.28`). It exposes the Promise API at the root:

```ts
import { Plugin } from "@opencode/plugin"

export default Plugin.define({
  id: "oc-sync",
  async setup(ctx) { /* ... */ return () => { /* cleanup */ } },
})
```

```ts
// @opencode/plugin
export type Cleanup = () => Promise<void> | void;
export interface Plugin {
  readonly id: string;
  readonly setup: (context: Context) => Promise<Cleanup | void> | Cleanup | void;
}
export declare function define(plugin: Plugin): Plugin;
```

Key differences from V1:

- Default export is `Plugin.define({ id, setup })`, not an async function returning hooks.
- The context is the extension API (`ctx.session`, `ctx.tool`, `ctx.event`, `ctx.storage`, …), not a
  `client` object. **`oc-sync` ignores its context entirely** (it uses `homedir()` and its own
  GitHub client), so no hook/transform migration is needed.
- `setup` may return a **cleanup function** that runs on unload — this is where
  `stopBackgroundSync()` belongs.

## 3. Change made on this branch

### 3.1 Plugin definition (`src/plugin/plugin.ts`)

```ts
import { Plugin } from '@opencode/plugin';

export const OpencodeSyncPlugin = Plugin.define({
  id: 'oc-sync',
  setup: async (_context): Promise<() => void> => {
    // ...existing initialization body...
    return stopBackgroundSync; // cleanup on unload
  },
});
```

`src/index.ts` is unchanged (`export default OpencodeSyncPlugin;` now exports the V2 object).

### 3.2 Lifecycle

V2 supports cleanup explicitly, so `stopBackgroundSync` is now actually wired:
`setup` returns it and OpenCode invokes it when the plugin unloads. In addition,
`startFileWatcher`/`startIntervalSync` were made **idempotent** (dispose any existing watcher/timer
before starting), so a reload cannot stack watchers/timers.

### 3.3 Dependencies / packaging

- Replaced `@opencode-ai/plugin` (`"latest"`) with **`@opencode/plugin` `^2.0.28`** (locked to the
  target runtime line). `pako` is unchanged.
- Bumped version to **`0.2.0`** (breaking): V1 and V2 module shapes are mutually exclusive, so one
  build cannot satisfy both. Keep `0.1.x` for OpenCode 1.x users.
- Optional (documented in the migration guide): a single package can export both shapes —
  `{ ...Plugin.define({ id, setup }), async server() { /* V1 hooks */ } }` — but that adds a second
  code path to maintain; separate releases are simpler here.

## 4. Installing locally (verified on this machine)

Config field is **`plugins`** (V2). Local plugins are loaded from an absolute directory/package path,
or auto-discovered as package directories under the global config dir:

```text
~/.config/opencode/plugins/<name>/
```

Verification steps:

1. `npm run build` and confirm the default export is `{ id: 'oc-sync', setup: fn }`.
2. Register the built package directory in `~/.config/opencode/opencode.jsonc` under `plugins`
   (or drop it under `~/.config/opencode/plugins/`), then reload.
3. Confirm `opencode.log` shows the plugin load without `PluginModule.LoadError`, and
   `opencode-sync.log` shows `Plugin starting...` / `Plugin ready`.

## 5. Testing plan

1. `npm run check` (typecheck + lint + format); `npm run build`.
2. Assert `typeof default === 'object'` with `id` and `setup`.
3. Load against OpenCode v2.x; confirm no `PluginModule.LoadError` and sync runs (initial,
   watcher, interval).
4. Reload safety: confirm timers/watchers are not duplicated (cleanup + idempotent start).
5. Regression: token from config file or `GITHUB_TOKEN`; missing config logs "sync is disabled"
   without failing load.

## 6. Risks / open questions

- **Runtime dependency resolution for local installs:** `@opencode/plugin` pulls a sizeable dep tree.
  Published packages install it via npm; a local directory install must have its `node_modules`
  present. (On this machine we install a copy of the built package with its deps.)
- **Reload timers:** cleanup is now wired, but confirm OpenCode calls `setup`'s cleanup on the exact
  reload path used (config change vs `service restart`).
- **Version floor:** pin `@opencode/plugin` to the OpenCode line you target and document the minimum
  OpenCode version.
