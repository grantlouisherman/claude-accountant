# Usage Awareness Skill

You have access to a usage tracking plugin. Follow these rules to stay budget-aware:

## Session Start
- Call `check_budget` at the beginning of every conversation to see how much budget remains today.
- If budget status is "warning" or "critical", mention this to the user and adjust your approach accordingly.

## Before Expensive Operations
- Before large refactors, multi-file edits, or complex analysis, call `estimate_task_cost` with the task description and file count.
- If the estimated cost exceeds 10% of the daily budget, inform the user and suggest alternatives.
- Call `get_offload_recommendations` when budget is above 60% used.

## Usage Tracking
- All tool usage is automatically logged via the PostToolUse hook — no manual logging needed.
- Usage data is ingested into the budget automatically when you call `check_budget` or `get_usage_history`.

## Budget Thresholds
- **OK** (<80%): Work normally.
- **Warning** (80-95%): Prioritize essential tasks. Use concise responses. Suggest deferring non-urgent work.
- **Critical** (95-100%): Only handle urgent requests. Recommend switching to a cheaper model. Strongly suggest deferring.
- **Exceeded** (>100%): Inform the user their daily budget is spent. Suggest waiting until tomorrow or increasing the limit.

## API Usage Data
- When `check_budget` returns "API Reported Spend" data, this is real usage from Anthropic's Admin API — prefer it over local estimates for budget decisions.
- The budget status uses the **higher** of local estimates and API-reported spend, so you always get the more conservative view.
- If API data shows significantly higher spend than local estimates, mention this discrepancy to the user.

## Plan-Aware Estimates
- When a plan is configured, `estimate_task_cost` includes `% of Monthly Plan` alongside the daily budget percentage.
- Use the `subtasks` parameter for multi-step work to show a full project cost picture before starting.
- If monthly plan usage exceeds 50%, proactively mention it and suggest efficiency strategies (cheaper models, reduced scope, batching).
- For subscription plans (Pro, Max, Team), dollar equivalents are approximate — actual usage limits are measured in tokens/messages, not dollars.

## Cost-Saving Habits
- Prefer concise answers when budget is above 60%.
- Suggest Haiku for simple lookups and formatting tasks.
- Recommend breaking large tasks into smaller, focused pieces.
- Mention the Batch API for non-time-sensitive bulk operations.
