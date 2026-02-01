# Claude Code Usage Tracking Plugin - Implementation Plan

TypeScript MCP server that injects usage/budget context into Claude Code sessions, estimates task costs, and recommends when to offload work.

## File Structure

```
usage_plugin/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest for marketplace
├── .mcp.json                    # MCP server config (stdio)
├── skills/
│   └── usage-awareness/
│       └── SKILL.md             # Always-on instructions for budget-aware behavior
├── hooks/
│   └── hooks.json               # PostToolUse hook for auto-tracking tool calls
├── scripts/
│   └── post-tool-hook.sh        # Hook script: logs tool invocations to JSONL
├── src/
│   ├── index.ts                 # Entry point: stdio transport
│   ├── server.ts                # Register all tools + resources
│   ├── types.ts                 # Shared interfaces
│   ├── config.ts                # Load/validate ~/.config/usage-plugin/config.json
│   ├── db.ts                    # SQLite via better-sqlite3 (usage_log + daily_summary)
│   ├── pricing.ts               # Model pricing tables + calculateCost()
│   ├── estimator.ts             # Token estimation heuristics by complexity
│   ├── budget.ts                # Budget status calculation (ok/warning/critical/exceeded)
│   ├── offload.ts               # Recommendation engine (model downgrade, defer, reduce scope)
│   ├── admin-api.ts             # Optional: fetch real usage from Anthropic Admin API
│   ├── tools/
│   │   ├── check-budget.ts      # check_budget - current spending vs limits
│   │   ├── estimate-task-cost.ts # estimate_task_cost - predict cost before doing work
│   │   ├── log-usage.ts         # log_usage - record tokens after work
│   │   ├── get-usage-history.ts # get_usage_history - daily breakdown over N days
│   │   ├── get-recommendations.ts # get_offload_recommendations - cost-saving suggestions
│   │   └── configure-budget.ts  # configure_budget - update limits at runtime
│   └── resources/
│       ├── budget-status.ts     # budget://status resource
│       ├── usage-summary.ts     # usage://today resource
│       └── pricing-table.ts     # pricing://models resource
├── tests/
│   ├── budget.test.ts
│   ├── estimator.test.ts
│   ├── offload.test.ts
│   ├── pricing.test.ts
│   ├── db.test.ts
│   ├── tools/
│   │   ├── check-budget.test.ts
│   │   ├── log-usage.test.ts
│   │   └── estimate-task-cost.test.ts
│   └── integration/
│       └── server.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## User Configuration

Config lives at `~/.config/usage-plugin/config.json`, created on first run:

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

Optional Admin API block for real usage data:
```json
{
  "admin_api": {
    "api_key": "sk-ant-admin-...",
    "organization_id": "org-...",
    "sync_interval_minutes": 5
  }
}
```

## How Usage Tracking Works

### Without Admin API (primary mode)

1. **SKILL.md** instructs Claude to call `check_budget` at conversation start and `log_usage` after completing work with token estimates
2. **PostToolUse hook** logs every tool invocation to `hook_events.jsonl` automatically
3. **Token estimation** uses complexity tiers (trivial/simple/moderate/complex/massive) mapped to token ranges, plus per-file multipliers:
   - File read: ~1500 input tokens
   - File edit: ~3000 output tokens
   - Simple Q&A: ~500 input + 500 output
   - Extended thinking: 3x output tokens
4. All data stored in local SQLite database

### With Admin API (optional, highest fidelity)

If configured, periodically fetches real usage from Anthropic endpoints:
- `GET /v1/organizations/{org}/usage_report/messages` - token counts by model
- `GET /v1/organizations/{org}/cost_report` - actual dollar amounts

Real data supersedes local estimates when available.

## MCP Tools

| Tool | Purpose |
|------|---------|
| `check_budget` | Current daily/monthly spend vs limits, status (ok/warning/critical/exceeded) |
| `estimate_task_cost` | Predict cost of upcoming task by complexity + file count |
| `log_usage` | Record token usage after completing work |
| `get_usage_history` | Daily breakdowns over past N days with trends |
| `get_offload_recommendations` | Cost-saving suggestions based on budget status + planned task |
| `configure_budget` | Update budget limits at runtime |

## MCP Resources

| Resource URI | Purpose |
|-------------|---------|
| `budget://status` | Real-time budget snapshot |
| `usage://today` | Today's detailed usage breakdown |
| `pricing://models` | Per-token pricing for all Claude models |

## Context Injection Strategy

Four complementary mechanisms ensure Claude is always budget-aware:

1. **SKILL.md**: Persistent system instructions loaded every session. Tells Claude when/how to check budgets and log usage.
2. **MCP Resources**: Pullable context (budget status, pricing) available on demand.
3. **Tool descriptions**: Nudge Claude to call tools at appropriate moments via description text.
4. **Hook tracking**: Automatic tool invocation counting even when Claude forgets to call `log_usage`.

## Offload Recommendation Rules

| Condition | Recommendation | Savings |
|-----------|---------------|---------|
| Using Opus | Switch to Sonnet | ~40% |
| Using Sonnet | Switch to Haiku for simple tasks | ~67% |
| Budget >80%, low urgency | Defer to tomorrow | 100% |
| Budget >60% | Break task into smaller pieces | ~30% |
| Budget >70% | Use shorter responses | ~20% |
| Bulk operations | Use Batch API | 50% |

## SQLite Schema

Two tables in `~/.config/usage-plugin/data/usage.db`:

- **usage_log**: per-event records (id, timestamp, session_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, estimated_cost_usd, task_description, source)
- **daily_summary**: aggregated per-day totals (date, total tokens by type, total_cost_usd, request_count)

## Dependencies

- `@modelcontextprotocol/sdk` - MCP server framework
- `better-sqlite3` - Local persistence (synchronous, WAL mode)
- `zod` - Input validation for tool schemas

## Build Order

1. **Foundation**: package.json, tsconfig.json, types.ts, config.ts, pricing.ts, db.ts
2. **Core logic**: estimator.ts, budget.ts, offload.ts
3. **MCP tools + resources**: tools/*.ts, resources/*.ts, server.ts, index.ts
4. **Plugin packaging**: .claude-plugin/plugin.json, .mcp.json, SKILL.md, hooks
5. **Admin API**: admin-api.ts (optional module)
6. **Tests**: all test files + vitest.config.ts

## Verification

1. `npm run build` compiles without errors
2. `npm test` passes all unit + integration tests
3. Manual: run `node dist/index.js`, send MCP tool calls via stdin JSON-RPC
4. Install in Claude Code: add to `~/.claude.json` mcpServers, verify budget checks work
5. Log usage, verify history retrieval works
6. Set low budget, verify offload recommendations trigger
