import { z } from "zod";
import type { Config } from "../types.js";
import { getBudgetStatus } from "../budget.js";

export const checkBudgetSchema = z.object({});

export function checkBudget(config: Config) {
  const snapshot = getBudgetStatus(config);

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

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
    data: snapshot,
  };
}
