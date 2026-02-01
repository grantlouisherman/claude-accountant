#!/bin/bash
# PostToolUse hook: logs tool invocations to JSONL for usage tracking
# Called automatically after each tool use in Claude Code

TOOL_NAME="${1:-unknown}"
SESSION_ID="${2:-unknown}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

DATA_DIR="${HOME}/.config/usage-plugin/data"
mkdir -p "$DATA_DIR"

LOG_FILE="${DATA_DIR}/hook_events.jsonl"

echo "{\"timestamp\":\"${TIMESTAMP}\",\"tool\":\"${TOOL_NAME}\",\"session_id\":\"${SESSION_ID}\"}" >> "$LOG_FILE"
