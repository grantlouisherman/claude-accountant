import { z } from "zod";
import type { Config } from "../types.js";
import { getBudgetStatus } from "../budget.js";
import { getRecommendations } from "../offload.js";

export const getRecommendationsSchema = z.object({
  current_model: z
    .string()
    .optional()
    .describe("Model currently being used"),
  task_complexity: z
    .enum(["trivial", "simple", "moderate", "complex", "massive"])
    .optional()
    .describe("Complexity of the planned task"),
  is_urgent: z
    .boolean()
    .default(true)
    .describe("Whether the current task is time-sensitive"),
});

export type GetRecommendationsInput = z.infer<typeof getRecommendationsSchema>;

export function getRecommendationsTool(
  config: Config,
  input: GetRecommendationsInput
) {
  const budget = getBudgetStatus(config);
  const model = input.current_model ?? config.default_model;
  const recs = getRecommendations(
    budget,
    model,
    input.task_complexity,
    input.is_urgent
  );

  if (recs.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: "No cost-saving recommendations at this time. Budget usage is healthy.",
        },
      ],
      data: { recommendations: [], budget_status: budget.status },
    };
  }

  const lines = [
    `Budget: ${budget.pct_used.toFixed(1)}% used ($${budget.spent_today_usd.toFixed(4)} / $${budget.daily_limit_usd.toFixed(2)})`,
    "",
    "Recommendations:",
  ];

  for (const rec of recs) {
    lines.push(
      `[${rec.priority.toUpperCase()}] ${rec.action} (~${rec.estimated_savings_pct}% savings)`
    );
    lines.push(`  ${rec.description}`);
  }

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
    data: { recommendations: recs, budget_status: budget.status },
  };
}
