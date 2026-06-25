/**
 * OpenCode Sync Plugin
 *
 * Syncs OpenCode data across machines using a GitHub private repository.
 * Uses vector clocks for conflict detection and three-way merge for resolution.
 */

import { OpencodeSyncPlugin } from './plugin/index.js';

// OpenCode 1.17.x expects a V1 PluginModule: { id?, server: Plugin }
// Wrap the bare plugin function so the loader recognizes it.
export default { id: 'oc-sync', server: OpencodeSyncPlugin };
