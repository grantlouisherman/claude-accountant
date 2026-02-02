import { z } from "zod";
import type { Config } from "../types.js";
import { getBudgetStatus } from "../budget.js";

export const checkBudgetSchema = z.object({});

export async function checkBudget(config: Config) {
  const snapshot = await getBudgetStatus(config);

  const lines = [
    `Budget Status: ${snapshot.status.toUpperCase()}`,
    `Daily Limit: $${snapshot.daily_limit_usd.toFixed(2)}`,
    `Spent Today: $${snapshot.spent_today_usd.toFixed(4)}`,
    `Remaining: $${snapshot.remaining_usd.toFixed(4)}`,
    `Used: ${snapshot.pct_used.toFixed(1)}%`,
    `Requests Today: ${snapshot.request_count_today}`,
  ];

  if (snapshot.monthly_limit_usd !== null) {
    lines.push(`Monthly Limit: $${snapshot.monthly_limit_usd.toFixed(2)}`);
    lines.push(
      `Spent This Month: $${snapshot.spent_this_month_usd?.toFixed(4) ?? "0.0000"}`
    );
  }

  if (snapshot.api_spent_today_usd !== undefined) {
    lines.push("");
    lines.push(`API Reported Spend: $${snapshot.api_spent_today_usd.toFixed(4)}`);
    lines.push(`API Usage: ${snapshot.api_pct_used?.toFixed(1)}% of daily limit`);
    lines.push(`Source: Anthropic Admin API`);

    if (snapshot.api_usage && snapshot.api_usage.by_model.length > 0) {
      lines.push("");
      lines.push("Breakdown by model:");
      for (const m of snapshot.api_usage.by_model) {
        lines.push(
          `  ${m.model}: $${m.cost_usd.toFixed(4)} (${m.input_tokens} in / ${m.output_tokens} out)`
        );
      }
    }
  }

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
    data: snapshot,
  };
}
