# claude-accountant

A [Claude Code](https://docs.anthropic.com/en/docs/claude-code) MCP plugin that makes Claude budget-aware. It tracks API usage, estimates costs, and recommends actions based on your remaining daily budget.

## What it does

- **Checks your budget** at the start of every session so Claude knows how much is left
- **Estimates costs** before expensive operations (large refactors, multi-file edits)
- **Plan-aware estimates** -- see costs as a percentage of your Anthropic plan (Pro, Max, Team, Enterprise, API)
- **Project-level estimates** -- break work into subtasks and get a full cost picture before starting
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
| `estimate_task_cost` | Predict token cost of an upcoming task or project (supports subtasks and multi-session estimates) |
| `get_usage_history` | Daily spending breakdown over the past N days |
| `get_offload_recommendations` | Cost-saving suggestions based on budget status |
| `configure_budget` | Update budget limits, thresholds, and plan settings at runtime |

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

### Plan-aware usage estimates

> **New** -- configure your Anthropic plan and see every cost estimate as a percentage of your monthly allowance.

Add a `plan` block to your config to enable this:

```json
{
  "budget": {
    "daily_limit_usd": 10.00
  },
  "plan": {
    "type": "max_5x",
    "monthly_allowance_usd": 100
  }
}
```

Supported plan types:

| Plan | Default $/mo | Notes |
|------|-------------|-------|
| `pro` | $20 | Anthropic Pro subscription |
| `max_5x` | $100 | Max 5x subscription |
| `max_20x` | $200 | Max 20x subscription |
| `team` | $30/seat | Set `seats` to multiply (e.g. 5 seats = $150/mo) |
| `enterprise` | user-configured | Must set `monthly_allowance_usd` |
| `api` | uses `budget.monthly_limit_usd` | For direct API usage |

Team/enterprise example with seats:

```json
{
  "plan": {
    "type": "team",
    "monthly_allowance_usd": 30,
    "seats": 5
  }
}
```

This gives an effective allowance of $150/mo (30 x 5 seats).

You can also set or change the plan at runtime without editing the file:

```
configure_budget(plan_type: "max_5x", plan_monthly_allowance_usd: 100)
```

Once configured, `check_budget` and `estimate_task_cost` include plan context automatically:

```
Budget Status: OK
Daily Limit: $10.00
Spent Today: $1.2500
Remaining: $8.7500
Used: 12.5%
Requests Today: 8

Plan: Max 5x ($100.00/mo)
Monthly Plan Usage: 1.25%
Plan Remaining: ~$98.75
```

Single-task estimates show the plan percentage:

```
Task: fix authentication bug
Model: claude-sonnet-4-5-20250514
Complexity: simple; Files: 2; Est. input: 5,000 tokens; Est. output: 2,000 tokens
Estimated Cost: $0.0450
% of Daily Budget: 0.45%
Plan: Max 5x ($100.00/mo)
% of Monthly Plan: 0.05%
```

#### Project-level estimates

For larger work, pass `subtasks` to get a full project breakdown before starting:

```
estimate_task_cost(
  task_description: "implement new auth system",
  subtasks: [
    { description: "Design auth schema", complexity: "moderate", file_count: 3 },
    { description: "Implement login flow", complexity: "complex", file_count: 5 },
    { description: "Write tests", complexity: "moderate", file_count: 8 }
  ],
  sessions: 3
)
```

Output:

```
Project Estimate: implement new auth system
Model: claude-sonnet-4-5-20250514
Sessions: 3

Subtasks:
  1. Design auth schema (moderate, 3 files): $0.0390 - 0.39% daily / 0.04% plan
  2. Implement login flow (complex, 5 files): $0.4200 - 4.20% daily / 0.42% plan
  3. Write tests (moderate, 8 files): $0.0570 - 0.57% daily / 0.06% plan

Project Total: $0.5160
% of Daily Budget: 5.16%
Plan: Max 5x ($100.00/mo)
% of Monthly Plan: 0.52%
Estimated over 3 sessions: $1.5480 (1.55% of plan)
```

This helps you decide whether to proceed, split work across days, or switch to a cheaper model before committing.

> **Note:** For subscription plans (Pro, Max, Team), dollar equivalents are approximate. Actual usage limits are measured in tokens/messages, not dollars.

### Optional: Anthropic Admin API

For real usage data instead of estimates, add your Admin API key to the config. This calls the [`/v1/organizations/usage_report/messages`](https://platform.claude.com/docs/en/api/admin/usage_report/retrieve_messages) endpoint to fetch actual spend from Anthropic.

**Setup:**

1. Go to the [Anthropic Console](https://console.anthropic.com) and create an **Admin API key** (under your organization's admin settings). This is different from a regular API key.
2. Add the `admin_api` block to `~/.config/usage-plugin/config.json`:

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
  "data_dir": "~/.config/usage-plugin/data",
  "admin_api": {
    "api_key": "sk-ant-admin-...",
    "sync_interval_minutes": 5
  }
}
```

When configured, `check_budget` will show both local estimates and real API-reported spend:

```
Budget Status: WARNING
Daily Limit: $10.00
Spent Today: $7.5000
Remaining: $1.8200
Used: 75.0%
Requests Today: 42

API Reported Spend: $8.1800
API Usage: 81.8% of daily limit
Source: Anthropic Admin API

Breakdown by model:
  claude-opus-4-5-20251101: $6.2300 (15000 in / 3200 out)
  claude-sonnet-4-5-20250514: $1.9500 (45000 in / 8000 out)
```

The budget status uses the **higher** of local estimates and API-reported spend, so you always get the more conservative view.

### Auto-logging via hooks

The plugin ships with a PostToolUse hook that automatically logs every tool invocation. Each tool type has a rough token estimate (e.g., Read ~2000 input tokens, Edit ~3000 input tokens), so your budget tracks usage without any manual logging needed.

Hook events are written to `~/.config/usage-plugin/data/hook_events.jsonl` and ingested into SQLite automatically when you call `check_budget` or `get_usage_history`.

## How it works

The plugin uses an estimation-based approach since MCP tools can't introspect Claude's actual token usage mid-conversation:

1. **Complexity tiers** (trivial/simple/moderate/complex/massive) map to token ranges
2. **Per-file multipliers** account for reads (~1500 input tokens) and edits (~3000 output tokens)
3. **Extended thinking** multiplies output estimates by 3x
4. **Auto-logging hooks** track every tool call with per-tool-type token estimates
5. All data is stored locally in SQLite with WAL mode for fast concurrent access

When the Admin API is configured, real usage data is shown alongside local estimates, and the higher value drives budget status decisions.

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
