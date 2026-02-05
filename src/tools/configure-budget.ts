import { z } from "zod";
import type { Config, PlanType } from "../types.js";
import { saveConfig } from "../config.js";
import { getPlanLabel, getEffectiveMonthlyAllowance } from "../plans.js";

export const configureBudgetSchema = z.object({
  daily_limit_usd: z
    .number()
    .positive()
    .optional()
    .describe("New daily spending limit in USD"),
  monthly_limit_usd: z
    .number()
    .positive()
    .nullable()
    .optional()
    .describe("New monthly limit (null to disable)"),
  warning_threshold_pct: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe("Warning threshold percentage"),
  critical_threshold_pct: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe("Critical threshold percentage"),
  plan_type: z
    .enum(["pro", "max_5x", "max_20x", "team", "enterprise", "api"])
    .optional()
    .describe("Anthropic plan type"),
  plan_seats: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Number of seats (for team/enterprise plans)"),
  plan_monthly_allowance_usd: z
    .number()
    .min(0)
    .optional()
    .describe("Override monthly allowance in USD for the plan"),
});

export type ConfigureBudgetInput = z.infer<typeof configureBudgetSchema>;

export function configureBudgetTool(
  config: Config,
  input: ConfigureBudgetInput
): { content: Array<{ type: "text"; text: string }>; config: Config } {
  if (input.daily_limit_usd !== undefined) {
    config.budget.daily_limit_usd = input.daily_limit_usd;
  }
  if (input.monthly_limit_usd !== undefined) {
    config.budget.monthly_limit_usd = input.monthly_limit_usd;
  }
  if (input.warning_threshold_pct !== undefined) {
    config.budget.warning_threshold_pct = input.warning_threshold_pct;
  }
  if (input.critical_threshold_pct !== undefined) {
    config.budget.critical_threshold_pct = input.critical_threshold_pct;
  }

  if (input.plan_type !== undefined) {
    const existing = config.plan;
    config.plan = {
      type: input.plan_type as PlanType,
      monthly_allowance_usd:
        input.plan_monthly_allowance_usd ??
        existing?.monthly_allowance_usd ??
        0,
      seats: input.plan_seats ?? existing?.seats,
    };
  } else {
    if (input.plan_seats !== undefined && config.plan) {
      config.plan.seats = input.plan_seats;
    }
    if (input.plan_monthly_allowance_usd !== undefined && config.plan) {
      config.plan.monthly_allowance_usd = input.plan_monthly_allowance_usd;
    }
  }

  saveConfig(config);

  const lines = [
    "Budget configuration updated:",
    `  Daily limit: $${config.budget.daily_limit_usd.toFixed(2)}`,
    `  Monthly limit: ${config.budget.monthly_limit_usd !== null ? "$" + config.budget.monthly_limit_usd.toFixed(2) : "disabled"}`,
    `  Warning at: ${config.budget.warning_threshold_pct}%`,
    `  Critical at: ${config.budget.critical_threshold_pct}%`,
  ];

  if (config.plan) {
    const label = getPlanLabel(config.plan);
    const allowance = getEffectiveMonthlyAllowance(config.plan);
    lines.push(`  Plan: ${label}`);
    lines.push(`  Plan allowance: $${allowance.toFixed(2)}/mo`);
  }

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
    config,
  };
}
