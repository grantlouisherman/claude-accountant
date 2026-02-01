import { z } from "zod";
import type { Config } from "../types.js";
import { saveConfig } from "../config.js";

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

  saveConfig(config);

  const lines = [
    "Budget configuration updated:",
    `  Daily limit: $${config.budget.daily_limit_usd.toFixed(2)}`,
    `  Monthly limit: ${config.budget.monthly_limit_usd !== null ? "$" + config.budget.monthly_limit_usd.toFixed(2) : "disabled"}`,
    `  Warning at: ${config.budget.warning_threshold_pct}%`,
    `  Critical at: ${config.budget.critical_threshold_pct}%`,
  ];

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
    config,
  };
}
