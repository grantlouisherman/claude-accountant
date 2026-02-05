import { z } from "zod";
import type { ComplexityTier, Config } from "../types.js";
import {
  estimateTaskCost,
  inferComplexity,
  enrichWithPlan,
  estimateProject,
} from "../estimator.js";
import { getPlanLabel, getEffectiveMonthlyAllowance } from "../plans.js";

const subtaskSchema = z.object({
  description: z.string().describe("Brief description of the subtask"),
  complexity: z
    .enum(["trivial", "simple", "moderate", "complex", "massive"])
    .optional()
    .describe("Override complexity tier (auto-detected if omitted)"),
  file_count: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Number of files involved in this subtask"),
});

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
  subtasks: z
    .array(subtaskSchema)
    .optional()
    .describe(
      "Array of subtasks for project-level breakdown. When provided, returns per-subtask and total estimates."
    ),
  sessions: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe("Number of sessions to multiply estimate over (default 1)"),
});

export type EstimateTaskCostInput = z.infer<typeof estimateTaskCostSchema>;

export function estimateTaskCostTool(
  config: Config,
  input: EstimateTaskCostInput
) {
  const model = input.model ?? config.default_model;
  const plan = config.plan;

  if (input.subtasks && input.subtasks.length > 0) {
    return formatProjectEstimate(config, input, model);
  }

  return formatSingleEstimate(config, input, model);
}

function formatSingleEstimate(
  config: Config,
  input: EstimateTaskCostInput,
  model: string
) {
  const complexity: ComplexityTier =
    input.complexity ?? inferComplexity(input.task_description);

  let estimate = estimateTaskCost(
    model,
    complexity,
    input.file_count,
    config.budget.daily_limit_usd,
    input.extended_thinking
  );

  estimate = enrichWithPlan(estimate, config.plan);

  const lines = [
    `Task: ${input.task_description}`,
    `Model: ${model}`,
    estimate.breakdown,
    `Estimated Cost: $${estimate.estimated_cost_usd.toFixed(4)}`,
    `% of Daily Budget: ${estimate.pct_of_daily_budget.toFixed(2)}%`,
  ];

  if (estimate.plan_label && estimate.plan_allowance_usd) {
    lines.push(
      `Plan: ${estimate.plan_label} ($${estimate.plan_allowance_usd.toFixed(2)}/mo)`
    );
    if (estimate.pct_of_plan != null) {
      lines.push(`% of Monthly Plan: ${estimate.pct_of_plan.toFixed(2)}%`);
    }
  }

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
    data: estimate,
  };
}

function formatProjectEstimate(
  config: Config,
  input: EstimateTaskCostInput,
  model: string
) {
  const plan = config.plan;
  const sessions = input.sessions ?? 1;

  const project = estimateProject(
    model,
    input.subtasks!,
    config.budget.daily_limit_usd,
    sessions,
    input.extended_thinking,
    plan
  );

  const lines = [
    `Project Estimate: ${input.task_description}`,
    `Model: ${model}`,
    `Sessions: ${sessions}`,
    "",
    "Subtasks:",
  ];

  project.subtasks.forEach((st, i) => {
    let line = `  ${i + 1}. ${st.description} (${st.complexity}, ${st.file_count} files): $${st.estimated_cost_usd.toFixed(4)} - ${st.pct_of_daily_budget.toFixed(2)}% daily`;
    if (st.pct_of_plan != null) {
      line += ` / ${st.pct_of_plan.toFixed(2)}% plan`;
    }
    lines.push(line);
  });

  lines.push("");
  lines.push(`Project Total: $${project.total_cost_usd.toFixed(4)}`);
  lines.push(`% of Daily Budget: ${project.pct_of_daily_budget.toFixed(2)}%`);

  if (plan) {
    const label = getPlanLabel(plan);
    const allowance = getEffectiveMonthlyAllowance(plan);
    lines.push(`Plan: ${label} ($${allowance.toFixed(2)}/mo)`);
    if (project.pct_of_plan != null) {
      lines.push(`% of Monthly Plan: ${project.pct_of_plan.toFixed(2)}%`);
    }
    if (sessions > 1) {
      lines.push(
        `Estimated over ${sessions} sessions: $${project.total_over_sessions_usd.toFixed(4)}${project.pct_of_plan_over_sessions != null ? ` (${project.pct_of_plan_over_sessions.toFixed(2)}% of plan)` : ""}`
      );
    }
  }

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
    data: project,
  };
}
