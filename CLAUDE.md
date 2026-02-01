# Usage Tracker Plugin for Claude Code

## What This Is

A Claude Code plugin (MCP server) that makes Claude budget-aware. It tracks API usage, estimates costs, and helps users decide what to do now vs. what to offload or defer based on remaining daily budget.

## Goals

1. **Inject usage context into every session** - Claude should know how much budget has been spent today before starting work, and factor this into its approach.

2. **Estimate costs before expensive operations** - Before large refactors, multi-file edits, or complex analysis, estimate the token cost and show what percentage of the daily budget it will consume.

3. **Track spending locally** - Store usage data in a local SQLite database so it works without requiring Anthropic Admin API access. Support Admin API as an optional upgrade for exact numbers.

4. **Recommend offloading** - When budget is running low, suggest concrete actions: use a cheaper model, defer non-urgent work, reduce scope, or use the Batch API.

5. **Provide historical context** - Show usage trends over the past week so users can plan their work and understand their spending patterns.

## Architecture

This is a **TypeScript MCP server** using `@modelcontextprotocol/sdk` that runs via stdio transport. It exposes 6 tools and 3 resources that Claude Code can call during conversations.

The plugin also includes:
- A **SKILL.md** that gives Claude persistent instructions to check budgets and log usage
- A **PostToolUse hook** that automatically tracks tool invocations

## Key Design Decisions

- **Local-first**: Works entirely without an internet connection or API keys beyond what Claude Code already uses. The Admin API integration is optional.
- **Estimation-based**: Since MCP tools can't introspect Claude's actual token usage mid-conversation, we use heuristics (complexity tiers, file counts, character-to-token ratios) and reconcile with real data when available.
- **SQLite for storage**: Synchronous reads via `better-sqlite3` mean tool calls return instantly. WAL mode handles concurrent writes from hooks.
- **Non-blocking**: The plugin never prevents Claude from working. It provides information and recommendations, not hard blocks.

## How to Work on This Project

### Setup
```bash
npm install
npm run build
```

### Development
```bash
npm run dev          # watch mode compilation
npm test             # run tests
npm run test:watch   # watch mode tests
```

### Testing locally with Claude Code
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

### Project structure
- `src/` - TypeScript source
- `src/tools/` - One file per MCP tool
- `src/resources/` - One file per MCP resource
- `skills/` - SKILL.md for Claude Code behavior instructions
- `hooks/` - PostToolUse hook config
- `tests/` - Vitest test suite

### Key files
- `src/server.ts` - Central registration of all tools and resources
- `src/db.ts` - All SQLite operations
- `src/budget.ts` - Budget status calculation logic
- `src/pricing.ts` - Model pricing tables (update when Anthropic changes prices)
- `src/offload.ts` - Recommendation engine rules
- `skills/usage-awareness/SKILL.md` - Instructions that shape Claude's budget-aware behavior

## Config

User config at `~/.config/usage-plugin/config.json`. Created with defaults on first run. Key settings:
- `budget.daily_limit_usd` - Daily spending cap (default: $10)
- `budget.warning_threshold_pct` - Warn at this % spent (default: 80)
- `budget.critical_threshold_pct` - Strong warning at this % (default: 95)
- `default_model` - Model for cost calculations
- `admin_api` - Optional block for real usage data from Anthropic

## Marketplace Distribution

The plugin is packaged with `.claude-plugin/plugin.json` and `.mcp.json` for installation via Claude Code's `/plugin` command. See PLAN.md for full marketplace submission details.
