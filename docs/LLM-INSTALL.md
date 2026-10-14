# LLM Agent Installation Guide for oc-sync

Copy and paste the following instructions to your LLM agent:

---

```
## Task: Install and Configure oc-sync (OpenCode Sync Plugin)

You are helping the user install oc-sync, which syncs OpenCode data across machines using a private GitHub repository.

### Prerequisites Check
Ask the user:
1. "Do you have OpenCode v2 (2.0.28 or newer) installed?" - If no, guide them to install/upgrade; V1 users need oc-sync 0.1.x
2. "Do you have Node.js 18 or higher installed?" - If no, guide them to install from https://nodejs.org
3. "Do you have a GitHub account?" - If no, guide them to create one at https://github.com

### Step 1: Install the Package (OpenCode v2)
IMPORTANT: This release uses the OpenCode V2 plugin API and requires OpenCode v2 (2.0.28+).
If the user runs OpenCode 1.x, they must use oc-sync 0.1.x instead.

Install the published package globally with the V2 CLI:

opencode plugin add oc-sync@^0.2.0

Alternatively, for a local build, point OpenCode at the built plugin directory
(see docs/DEV-SETUP.md). V2 loads local plugins from a directory/package, not a single file.

### Step 2: Register the Plugin
IMPORTANT: Installing the package may register it automatically; verify and, if needed, add it
to the global config.

Edit the global config file:

**Linux/macOS:** ~/.config/opencode/opencode.json(c)
**Windows:** %USERPROFILE%\.config\opencode\opencode.json(c)

Use the V2 "plugins" (plural) field:

{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["oc-sync"]
}

For a local build, use an absolute directory path:

{
  "plugins": ["/absolute/path/to/oc-sync"]
}

NOTE: In OpenCode V2 the key is "plugins" (plural). The V1 key "plugin" (singular) is NOT used by
OpenCode v2. Plugin package directories placed directly under ~/.config/opencode/plugins/ are
discovered automatically and do not need an explicit entry.


### Step 3: Generate GitHub Personal Access Token
Guide the user step by step:
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Token name: "opencode-sync"
4. Expiration: recommend "90 days" or "No expiration" based on user preference
5. Select scope: "repo" (Full control of private repositories)
6. Click "Generate token"
7. IMPORTANT: Tell user to copy the token immediately (starts with "ghp_")
8. Ask user: "Please paste your token here" - Save this as TOKEN

### Step 4: Create Token Configuration
Create the config file opencode-sync.json in the config directory:

**Linux/macOS:** ~/.config/opencode/opencode-sync.json
**Windows:** %USERPROFILE%\.config\opencode\opencode-sync.json

{
  "token": "<TOKEN from Step 3>"
}

That's it! The plugin will automatically:
- Detect your GitHub username
- Create a private repository (.opencode-sync)
- Detect the default branch (main/master)

### Step 5: Verify Installation
Tell user to restart OpenCode so the plugin loads:

opencode service restart

Then confirm it is active:

opencode plugin list

The plugin will:
- Auto-create the sync repository if needed
- Sync on startup
- Watch for file changes
- Push/pull automatically

Check logs at:
**Linux/macOS:** ~/.local/share/opencode/log/opencode-sync.log
**Windows:** %USERPROFILE%\.local\share\opencode\log\opencode-sync.log

Expected output:
[opencode-sync] Plugin starting...
[opencode-sync] Token loaded from: config file
[opencode-sync] Setting up sync storage...
[opencode-sync] Linked to repo: username/.opencode-sync
[opencode-sync] Plugin ready

### Troubleshooting

#### Plugin not loading (no log output)
- Check OpenCode is v2 and the plugin is listed: `opencode plugin list` (should show `oc-sync`)
- Check the global config registers it under `plugins` (plural), not `plugin` (singular)
- For a local build, confirm the config path is an absolute path to the plugin directory and that `npm run build` succeeded
- Check the config file is valid JSON/JSONC (no stray commas, etc.)
- Restart the service after changes: `opencode service restart`

#### API Errors
- "401 Unauthorized": Token is invalid or expired. Generate a new one.
- "403 Forbidden": Token lacks "repo" scope. Recreate with correct permissions.
- "Not Found": Check token has repo scope for creating private repositories.

### Advanced Options (Optional)
These settings are auto-detected but can be overridden if needed:

{
  "token": "ghp_...",
  "repoOwner": "custom-username",      // Override auto-detected username
  "repoName": "custom-repo-name",      // Override default .opencode-sync
  "branch": "custom-branch",           // Override auto-detected main/master
  "encryptionKey": "your-secret-key"   // Encrypt credentials before sync
}

### Encryption (Optional)
If user wants to encrypt credentials:
1. Add encryptionKey to config (minimum 16 characters)
2. WARNING: Same key must be used on ALL machines
3. WARNING: If key is lost, encrypted credentials cannot be recovered

### Key Rotation (Advanced)
If user needs to change their encryption key:

1. On ALL machines, update config to include BOTH keys:
{
  "token": "...",
  "encryptionKey": "<NEW_KEY>",
  "oldEncryptionKey": "<OLD_KEY>"
}

2. Restart OpenCode on each machine. The plugin will:
   - Decrypt using old key (fallback)
   - Re-encrypt using new key on push

3. After ALL machines have synced, remove oldEncryptionKey.

### Summary
After setup, confirm with user:
- Token: configured (never display full token)
- Status: Ready to sync
```

---
