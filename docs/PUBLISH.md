# Publishing to npm

## Release lines

- **`0.2.x`** targets **OpenCode v2** (V2 plugin API via `@opencode/plugin`, `{ id, setup }`).
- **`0.1.x`** targets **OpenCode 1.x** (V1 plugin API, function export). Keep these installable for
  older setups.

V1 and V2 export different module shapes, so `0.2.0` is a **breaking** release for V1 users.
Consider publishing `0.2.0` under a `next` dist-tag first, then promoting to `latest` once verified.

## Quick Command

```bash
npm version patch && git push && git push --tags
```

## Version Bump Options

| Command | Example |
|---------|---------|
| `npm version patch` | 0.1.0 → 0.1.1 |
| `npm version minor` | 0.1.0 → 0.2.0 |
| `npm version major` | 0.1.0 → 1.0.0 |

## What Happens

1. `npm version` bumps `package.json` version, commits, and creates a `v*` tag
2. `git push --tags` triggers the GitHub Actions publish workflow
3. Workflow authenticates via OIDC (no npm token needed)
4. Publishes to npm with provenance attestation

## Verify

```bash
gh run list --limit 1
npm view oc-sync version
```

## Security

- Uses OIDC trusted publishing (configured on npmjs.com)
- No long-lived NPM_TOKEN secret required
- Provenance links package to source commit
