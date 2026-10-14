/**
 * Background sync operations - file watcher and interval sync.
 */

import type { PathConfig } from '../types/paths.js';
import type { SyncCategory } from '../types/index.js';
import type { SyncResult } from '../types/sync.js';
import { loadLocalData } from '../data/index.js';
import { FileWatcher } from '../sync/watcher/index.js';
import { log } from '../logging/index.js';
import { getPluginState } from './state-manager.js';
import { isContinuousSyncReady } from './validation.js';
import { getErrorMessage, writePulledData, persistLocalState } from '../shared/index.js';

/** Helper to persist state and update in-memory state */
async function persistAndUpdateState(pathConfig: PathConfig): Promise<void> {
  const state = getPluginState();
  const newState = await persistLocalState(pathConfig, state.engine);
  if (newState) {
    state.localState = newState;
  }
}

/** Active file watcher instance */
let activeWatcher: FileWatcher | null = null;

/** Active interval timer for periodic sync */
let syncInterval: NodeJS.Timeout | null = null;

/** Start file watcher for continuous sync */
export function startFileWatcher(pathConfig: PathConfig): void {
  // Idempotent: dispose any existing watcher before starting a new one so
  // repeated plugin loads/reloads do not stack file watchers.
  if (activeWatcher) {
    activeWatcher.stop();
    activeWatcher = null;
  }

  const state = getPluginState();

  if (!isContinuousSyncReady(state)) {
    return;
  }

  try {
    const enabledCategories = new Set<SyncCategory>(
      Object.entries(state.config.sync)
        .filter(([, enabled]) => enabled)
        .map(([cat]) => cat as SyncCategory)
    );

    const config = state.config;
    const engine = state.engine;

    activeWatcher = new FileWatcher({
      pathConfig,
      debounceMs: state.config.fileWatcherDebounceMs,
      maxDebounceMs: state.config.maxDebounceMs,
      enabledCategories,
      onEvent: async () => {
        try {
          const { categories } = await loadLocalData(pathConfig, config.sync);
          const result = await engine.sync(categories);
          if (result.success) {
            await persistAndUpdateState(pathConfig);
          }
        } catch (error) {
          log(`WARNING: File watcher sync failed: ${getErrorMessage(error)}`);
        }
      },
    });
    void activeWatcher.start();
    log('File watcher started');
  } catch (error) {
    log(`WARNING: Failed to start file watcher: ${getErrorMessage(error)}`);
  }
}

/** Start interval-based sync */
export function startIntervalSync(pathConfig: PathConfig): void {
  // Idempotent: clear any existing interval before starting a new one so
  // repeated plugin loads/reloads do not stack timers.
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }

  const state = getPluginState();

  if (!isContinuousSyncReady(state)) {
    return;
  }

  const intervalMs = state.config.syncIntervalMinutes * 60 * 1000;
  const config = state.config;
  const engine = state.engine;

  syncInterval = setInterval(() => {
    void (async () => {
      try {
        const { categories } = await loadLocalData(pathConfig, config.sync);
        const result = await engine.sync(categories);
        if (result.success) {
          await writePulledData(pathConfig, result);
          await persistAndUpdateState(pathConfig);
        }
        logIntervalResult(result);
      } catch (error) {
        log(`WARNING: Interval sync failed: ${getErrorMessage(error)}`);
      }
    })();
  }, intervalMs);

  const minutes = String(state.config.syncIntervalMinutes);
  log(`Interval sync started (every ${minutes} min)`);
}

/** Log interval sync results */
function logIntervalResult(result: SyncResult): void {
  if (result.action === 'pushed' || result.action === 'pulled') {
    log(`Interval sync: ${result.message}`);
  } else if (result.action === 'error') {
    log(`WARNING: Interval sync error: ${result.message}`);
  }
  // Don't log no-change to keep logs clean
}

/** Stop all background sync operations */
export function stopBackgroundSync(): void {
  if (activeWatcher) {
    activeWatcher.stop();
    activeWatcher = null;
    log('File watcher stopped');
  }

  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    log('Interval sync stopped');
  }
}

// Re-export for backward compatibility
export { writePulledData, persistLocalState } from '../shared/index.js';
