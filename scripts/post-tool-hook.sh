#!/bin/bash
# PostToolUse hook: logs tool invocations to JSONL for automatic usage tracking
# Called automatically after each tool use in Claude Code
# Events are ingested into SQLite by the MCP server on next check_budget or get_usage_history call

TOOL_NAME="${1:-unknown}"
SESSION_ID="${2:-unknown}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

DATA_DIR="${HOME}/.config/usage-plugin/data"
mkdir -p "$DATA_DIR"

LOG_FILE="${DATA_DIR}/hook_events.jsonl"

# Log tool name, session, and timestamp — the MCP server estimates tokens per tool type
echo "{\"timestamp\":\"${TIMESTAMP}\",\"tool\":\"${TOOL_NAME}\",\"session_id\":\"${SESSION_ID}\"}" >> "$LOG_FILE"
