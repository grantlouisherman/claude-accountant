import type { ComplexityTier, CostEstimate } from "./types.js";
import { calculateCost } from "./pricing.js";

interface ComplexityProfile {
  base_input_tokens: number;
  base_output_tokens: number;
  per_file_input: number;
  per_file_output: number;
}

const COMPLEXITY_PROFILES: Record<ComplexityTier, ComplexityProfile> = {
  trivial: {
    base_input_tokens: 500,
    base_output_tokens: 200,
    per_file_input: 0,
    per_file_output: 0,
  },
  simple: {
    base_input_tokens: 2_000,
    base_output_tokens: 1_000,
    per_file_input: 1_500,
    per_file_output: 500,
  },
  moderate: {
    base_input_tokens: 5_000,
    base_output_tokens: 3_000,
    per_file_input: 1_500,
    per_file_output: 1_500,
  },
  complex: {
    base_input_tokens: 15_000,
    base_output_tokens: 8_000,
    per_file_input: 2_000,
    per_file_output: 3_000,
  },
  massive: {
    base_input_tokens: 50_000,
    base_output_tokens: 20_000,
    per_file_input: 2_500,
    per_file_output: 4_000,
  },
};

export function estimateTaskCost(
  model: string,
  complexity: ComplexityTier,
  fileCount: number,
  dailyLimitUsd: number,
  useExtendedThinking: boolean = false
): CostEstimate {
  const profile = COMPLEXITY_PROFILES[complexity];

  const inputTokens =
    profile.base_input_tokens + profile.per_file_input * fileCount;
  let outputTokens =
    profile.base_output_tokens + profile.per_file_output * fileCount;

  if (useExtendedThinking) {
    outputTokens *= 3;
  }

  const cost = calculateCost(model, inputTokens, outputTokens);
  const pctOfBudget =
    dailyLimitUsd > 0 ? (cost / dailyLimitUsd) * 100 : 0;

  const parts: string[] = [
    `Complexity: ${complexity}`,
    `Files: ${fileCount}`,
    `Est. input: ${inputTokens.toLocaleString()} tokens`,
    `Est. output: ${outputTokens.toLocaleString()} tokens`,
  ];
  if (useExtendedThinking) {
    parts.push("Extended thinking: 3x output multiplier");
  }

  return {
    estimated_input_tokens: inputTokens,
    estimated_output_tokens: outputTokens,
    estimated_cost_usd: cost,
    pct_of_daily_budget: Math.round(pctOfBudget * 100) / 100,
    complexity,
    breakdown: parts.join("; "),
  };
}

export function inferComplexity(description: string): ComplexityTier {
  const lower = description.toLowerCase();
  const hasWord = (word: string) => new RegExp(`\\b${word}\\b`).test(lower);

  if (
    hasWord("refactor") ||
    hasWord("rewrite") ||
    hasWord("migrate") ||
    hasWord("overhaul")
  ) {
    return "massive";
  }
  if (
    hasWord("implement") ||
    hasWord("feature") ||
    hasWord("complex") ||
    lower.includes("multi-file")
  ) {
    return "complex";
  }
  if (
    hasWord("update") ||
    hasWord("modify") ||
    hasWord("add") ||
    hasWord("change")
  ) {
    return "moderate";
  }
  if (
    hasWord("fix") ||
    hasWord("bug") ||
    hasWord("tweak") ||
    hasWord("small")
  ) {
    return "simple";
  }
  return "trivial";
}
