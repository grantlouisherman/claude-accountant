# claude-accountant

A [Claude Code](https://docs.anthropic.com/en/docs/claude-code) MCP plugin that makes Claude budget-aware. It tracks API usage, estimates costs, and recommends actions based on your remaining daily budget.

## What it does

- **Checks your budget** at the start of every session so Claude knows how much is left
- **Estimates costs** before expensive operations (large refactors, multi-file edits)
- **Tracks spending** in a local SQLite database -- no external API needed
- **Recommends offloading** when budget runs low (cheaper model, defer, reduce scope, Batch API)
- **Shows usage history** over the past week for planning

## Install

### Option 1: npx (recommended)

Add to your `~/.claude.json`:

```json
{
  "mcpServers": {
    "usage-tracker": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "claude-accountant"]
    }
  }
}
```

### Option 2: Global install

```bash
npm install -g claude-accountant
```

Then add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "usage-tracker": {
      "type": "stdio",
      "command": "claude-accountant"
    }
  }
}
```

### Option 3: From source

```bash
git clone https://github.com/grantlouisherman/claude-accountant.git
cd claude-accountant
npm install && npm run build
```

Add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "usage-tracker": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/usage_plugin/dist/index.js"]
    }
  }
}
```

## Tools

Once installed, Claude Code gains these tools:

| Tool | Description |
|------|-------------|
| `check_budget` | Current daily spending vs limits, returns status (ok/warning/critical/exceeded) |
| `estimate_task_cost` | Predict token cost of an upcoming task before starting it |
| `log_usage` | Record token usage after completing work |
| `get_usage_history` | Daily spending breakdown over the past N days |
| `get_offload_recommendations` | Cost-saving suggestions based on budget status |
| `configure_budget` | Update budget limits and thresholds at runtime |

## Configuration

Config is created automatically at `~/.config/usage-plugin/config.json` on first run:

```json
{
  "budget": {
    "daily_limit_usd": 10.00,
    "monthly_limit_usd": null,
    "warning_threshold_pct": 80,
    "critical_threshold_pct": 95
  },
  "pricing_tier": "standard",
  "default_model": "claude-sonnet-4-5-20250514",
  "data_dir": "~/.config/usage-plugin/data"
}
```

You can edit this file directly or use the `configure_budget` tool during a session.

### Optional: Anthropic Admin API

For exact usage data instead of estimates, add your Admin API credentials:

```json
{
  "admin_api": {
    "api_key": "sk-ant-admin-...",
    "organization_id": "org-...",
    "sync_interval_minutes": 5
  }
}
```

## How it works

The plugin uses an estimation-based approach since MCP tools can't introspect Claude's actual token usage mid-conversation:

1. **Complexity tiers** (trivial/simple/moderate/complex/massive) map to token ranges
2. **Per-file multipliers** account for reads (~1500 input tokens) and edits (~3000 output tokens)
3. **Extended thinking** multiplies output estimates by 3x
4. All data is stored locally in SQLite with WAL mode for fast concurrent access

When the Admin API is configured, real usage data supersedes local estimates.

## Budget thresholds

| Status | % Used | Behavior |
|--------|--------|----------|
| OK | <80% | Work normally |
| Warning | 80-95% | Prioritize essential tasks, concise responses |
| Critical | 95-100% | Urgent requests only, recommend cheaper model |
| Exceeded | >100% | Inform user, suggest waiting or increasing limit |

## Skills and hooks

The plugin ships with:

- **`skills/usage-awareness/SKILL.md`** -- persistent instructions that tell Claude when to check budgets and log usage
- **`hooks/hooks.json`** -- a PostToolUse hook that automatically tracks tool invocations

## License

MIT
