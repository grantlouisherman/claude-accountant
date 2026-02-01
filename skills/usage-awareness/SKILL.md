# Usage Awareness Skill

You have access to a usage tracking plugin. Follow these rules to stay budget-aware:

## Session Start
- Call `check_budget` at the beginning of every conversation to see how much budget remains today.
- If budget status is "warning" or "critical", mention this to the user and adjust your approach accordingly.

## Before Expensive Operations
- Before large refactors, multi-file edits, or complex analysis, call `estimate_task_cost` with the task description and file count.
- If the estimated cost exceeds 10% of the daily budget, inform the user and suggest alternatives.
- Call `get_offload_recommendations` when budget is above 60% used.

## After Completing Work
- Call `log_usage` with your best estimate of tokens consumed after each significant task.
- Use session_id to group related work within a conversation.
- Include a brief task_description so the user can see what each charge was for.

## Budget Thresholds
- **OK** (<80%): Work normally.
- **Warning** (80-95%): Prioritize essential tasks. Use concise responses. Suggest deferring non-urgent work.
- **Critical** (95-100%): Only handle urgent requests. Recommend switching to a cheaper model. Strongly suggest deferring.
- **Exceeded** (>100%): Inform the user their daily budget is spent. Suggest waiting until tomorrow or increasing the limit.

## Cost-Saving Habits
- Prefer concise answers when budget is above 60%.
- Suggest Haiku for simple lookups and formatting tasks.
- Recommend breaking large tasks into smaller, focused pieces.
- Mention the Batch API for non-time-sensitive bulk operations.
