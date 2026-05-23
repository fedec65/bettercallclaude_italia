# Contributing to BetterCallClaude Italia

Thank you for your interest in contributing! This document outlines the workflow and rules for submitting changes.

## Development Workflow

1. **Fork** the repository
2. **Create a branch** for your change: `git checkout -b feature/your-change`
3. **Make your changes** following the guidelines below
4. **Test locally** — run `npm run validate` before submitting
5. **Submit a Pull Request** with a clear description

## Critical Rules

### ⚠️ `user_config` templating in `.mcp.json`

**`${user_config.*}` must NOT appear in `url:` fields of `.mcp.json`.**

Cowork's upload validation runs before the user is prompted for config values. If `${user_config.*}` appears in a `url:` field, the plugin will be rejected with "PLUGIN VALIDATION FAILED".

- ✅ **Allowed:** `env:`, `args:`, `headers:` blocks (e.g. `OLLAMA_HOST: ${user_config.ollama_host}`)
- ❌ **Forbidden:** `url: "https://${user_config.api_host}/mcp"`

If you need dynamic URLs, hardcode them or use environment variables.

### Version Bumping

When making changes that affect functionality, update the version in **all three files**:
- `package.json` (root)
- `.claude-plugin/marketplace.json` → `plugins[0].version`
- `bettercallclaude_italia/.claude-plugin/plugin.json` → `version`

Follow [Semantic Versioning](https://semver.org/):
- `MAJOR` — breaking changes to an established API (removing commands or MCP servers that users depend on)
- `MINOR` — new features (new agents, commands, skills)
- `PATCH` — bug fixes, documentation updates, localization corrections

**Note:** Initial localization changes (e.g. translating command names from the Swiss version, correcting inherited terminology like "federale" → "nazionale") are classified as `PATCH` since they are part of the initial adaptation and not breaking changes to an established user base.

### Content Language

All agent, skill, and command content must be in **Italian only**. This is a legal-domain plugin for Italian practitioners.

## Testing

Run the validation script before submitting:

```bash
npm run validate
```

This checks:
- `marketplace.json` schema validity
- `plugin.json` schema validity
- `.mcp.json` MCP server configuration
- Privacy hook script syntax

## Code of Conduct

Be respectful. Legal practice is a serious domain — contributions should maintain the highest standards of accuracy and professionalism.

## Questions?

Open an issue or email info@bettercallclaude.ch.
