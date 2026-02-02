/**
 * Rough token estimates per tool invocation for auto-logging via hooks.
 * These are heuristics — the goal is ballpark tracking without manual input.
 */

interface ToolEstimate {
  input_tokens: number;
  output_tokens: number;
}

const TOOL_ESTIMATES: Record<string, ToolEstimate> = {
  Read: { input_tokens: 2000, output_tokens: 500 },
  Write: { input_tokens: 3000, output_tokens: 200 },
  Edit: { input_tokens: 3000, output_tokens: 1000 },
  Bash: { input_tokens: 1500, output_tokens: 800 },
  Grep: { input_tokens: 1000, output_tokens: 500 },
  Glob: { input_tokens: 800, output_tokens: 400 },
  WebFetch: { input_tokens: 2000, output_tokens: 1500 },
  WebSearch: { input_tokens: 1500, output_tokens: 1000 },
  Task: { input_tokens: 5000, output_tokens: 3000 },
  NotebookEdit: { input_tokens: 2500, output_tokens: 800 },
  AskUserQuestion: { input_tokens: 500, output_tokens: 200 },
};

const DEFAULT_ESTIMATE: ToolEstimate = {
  input_tokens: 1500,
  output_tokens: 600,
};

export function estimateToolTokens(toolName: string): ToolEstimate {
  return TOOL_ESTIMATES[toolName] ?? DEFAULT_ESTIMATE;
}
