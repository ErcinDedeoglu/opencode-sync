/**
 * OpenCode Sync Plugin
 *
 * Main plugin definition with hooks and event handlers.
 */

import { homedir } from 'node:os';
import { Plugin } from '@opencode/plugin';
import type { PathConfig } from '../types/paths.js';
import { getPathConfig } from '../types/paths.js';
import { createEmptyManifest } from '../types/index.js';
import {
  initializeState,
  getPluginState,
  updateConfig,
  initializeEngine,
} from './state-manager.js';
import { hasConfig, isFullyInitialized } from './validation.js';
import { getTokenSource, loadLocalData } from '../data/index.js';
import { RepoStorageBackend } from '../storage/index.js';
import type { PluginState } from './types.js';
import { log, logSetupInstructions } from '../logging/index.js';
import { getGitHubUsername, repoExists, createRepo } from './github-api.js';
import {
  writePulledData,
  persistLocalState,
  startFileWatcher,
  startIntervalSync,
  stopBackgroundSync,
} from './background-sync.js';
import { getErrorMessage, getErrorStack } from '../shared/index.js';

/** Default repo name for sync storage */
const DEFAULT_REPO_NAME = '.opencode-sync';

/** Validate configuration and log status. Returns true if valid. */
function validateAndLogConfig(state: PluginState): boolean {
  if (!hasConfig(state)) {
    log('WARNING: No configuration found');
    logSetupInstructions();
    log('Plugin loaded but sync is disabled');
    return false;
  }

  if (!state.config.token) {
    log('WARNING: No GitHub token configured');
    logSetupInstructions();
    log('Plugin loaded but sync is disabled');
    return false;
  }

  const sourceLabel = getTokenSource() === 'env' ? 'environment variable' : 'config file';
  log(`Token loaded from: ${sourceLabel}`);
  return true;
}

/** Initialize storage backend with manifest */
async function initializeStorageBackend(
  token: string,
  owner: string,
  repo: string,
  machineId: string
): Promise<void> {
  const backend = new RepoStorageBackend({ token, owner, repo });
  const storageExists = await backend.exists();
  if (!storageExists) {
    log('Initializing sync storage...');
    const manifest = createEmptyManifest(machineId);
    await backend.initialize(JSON.stringify(manifest, null, 2));
  }
}

/** Create repository if it doesn't exist */
async function ensureRepoCreated(token: string, owner: string, repoName: string): Promise<void> {
  const exists = await repoExists(token, owner, repoName);
  if (!exists) {
    log('Creating sync repository...');
    await createRepo(token, repoName);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

/** Ensure sync storage repo exists and is initialized */
async function ensureStorageExists(pathConfig: PathConfig): Promise<void> {
  const state = getPluginState();
  const config = state.config;

  if (!config?.token || !config.machineId) return;

  if (config.repoOwner && config.repoName) {
    log(`Linked to repo: ${config.repoOwner}/${config.repoName}`);
    initializeEngine();
    return;
  }

  try {
    log('Setting up sync storage...');
    const owner = await getGitHubUsername(config.token);
    const repoName = DEFAULT_REPO_NAME;

    await ensureRepoCreated(config.token, owner, repoName);
    await initializeStorageBackend(config.token, owner, repoName, config.machineId);

    log(`Linked to repo: ${owner}/${repoName}`);
    await updateConfig(pathConfig, { repoOwner: owner, repoName });
    initializeEngine();
  } catch (error) {
    log(`ERROR: Failed to setup storage: ${getErrorMessage(error)}`);
    throw error;
  }
}

/** Perform initial sync on plugin startup (non-blocking) */
function performInitialSync(pathConfig: PathConfig): void {
  const state = getPluginState();

  if (!isFullyInitialized(state)) {
    log('Skipping initial sync - engine not initialized');
    return;
  }

  if (!state.config.autoSyncOnStartup) {
    log('Auto-sync on startup disabled');
    return;
  }

  const config = state.config;
  const engine = state.engine;
  void (async () => {
    try {
      log('Running initial sync in background...');
      const loadStart = Date.now();
      const { categories, errors } = await loadLocalData(pathConfig, config.sync);
      log(`Loaded ${String(categories.length)} categories in ${String(Date.now() - loadStart)}ms`);
      if (errors.length > 0) log(`Load errors: ${String(errors.length)}`);

      const syncStart = Date.now();
      const result = await engine.sync(categories);
      const dur = Date.now() - syncStart;

      if (result.success && result.action !== 'error') {
        await writePulledData(pathConfig, result);
        const newState = await persistLocalState(pathConfig, engine);
        if (newState) {
          getPluginState().localState = newState;
        }
        log(`Initial sync complete in ${String(dur)}ms: ${result.message}`);
      } else {
        log(`Sync completed in ${String(dur)}ms: ${result.message}`);
      }
    } catch (error) {
      log(`WARNING: Initial sync failed: ${getErrorMessage(error)}`);
      const stack = getErrorStack(error);
      if (stack) log(`Stack: ${stack}`);
    }
  })();
}

export const OpencodeSyncPlugin = Plugin.define({
  id: 'oc-sync',
  setup: async (_context): Promise<() => void> => {
    log('Plugin starting...');

    try {
      const pathConfig = getPathConfig(homedir());
      await initializeState(pathConfig);
      const isValid = validateAndLogConfig(getPluginState());

      if (isValid) {
        await ensureStorageExists(pathConfig);
        performInitialSync(pathConfig);
        startFileWatcher(pathConfig);
        startIntervalSync(pathConfig);
        log('Plugin ready');
      }
    } catch (error) {
      log(`ERROR: Plugin initialization failed: ${getErrorMessage(error)}`);
      const stack = getErrorStack(error);
      if (stack) {
        console.error(stack);
      }
    }

    // Cleanup runs when the plugin unloads (OpenCode V2 lifecycle).
    return stopBackgroundSync;
  },
});
