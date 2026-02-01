import { z } from "zod";
import type { ComplexityTier, Config } from "../types.js";
import { estimateTaskCost, inferComplexity } from "../estimator.js";

export const estimateTaskCostSchema = z.object({
  task_description: z.string().describe("Brief description of the planned task"),
  complexity: z
    .enum(["trivial", "simple", "moderate", "complex", "massive"])
    .optional()
    .describe("Override complexity tier (auto-detected if omitted)"),
  file_count: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of files involved"),
  model: z.string().optional().describe("Model to use for cost calculation"),
  extended_thinking: z
    .boolean()
    .default(false)
    .describe("Whether extended thinking will be used"),
});

export type EstimateTaskCostInput = z.infer<typeof estimateTaskCostSchema>;

export function estimateTaskCostTool(
  config: Config,
  input: EstimateTaskCostInput
) {
  const complexity: ComplexityTier =
    input.complexity ?? inferComplexity(input.task_description);
  const model = input.model ?? config.default_model;

  const estimate = estimateTaskCost(
    model,
    complexity,
    input.file_count,
    config.budget.daily_limit_usd,
    input.extended_thinking
  );

  const lines = [
    `Task: ${input.task_description}`,
    `Model: ${model}`,
    estimate.breakdown,
    `Estimated Cost: $${estimate.estimated_cost_usd.toFixed(4)}`,
    `% of Daily Budget: ${estimate.pct_of_daily_budget.toFixed(2)}%`,
  ];

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
    data: estimate,
  };
}
