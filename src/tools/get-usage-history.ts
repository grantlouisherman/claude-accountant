import { z } from "zod";
import type { Config } from "../types.js";
import { getUsageHistory, ingestHookEvents } from "../db.js";

export const getUsageHistorySchema = z.object({
  days: z
    .number()
    .int()
    .min(1)
    .max(90)
    .default(7)
    .describe("Number of days of history to retrieve"),
});

export type GetUsageHistoryInput = z.infer<typeof getUsageHistorySchema>;

export function getUsageHistoryTool(
  config: Config,
  input: GetUsageHistoryInput
) {
  // Ingest any pending hook events before returning history
  ingestHookEvents(config);

  const history = getUsageHistory(config, input.days);

  if (history.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: `No usage data found for the past ${input.days} days.`,
        },
      ],
      data: { history: [], trend: null },
    };
  }

  const totalCost = history.reduce((sum, d) => sum + d.total_cost_usd, 0);
  const avgDaily = totalCost / history.length;

  const lines = [
    `Usage History (past ${input.days} days, ${history.length} days with data):`,
    "",
  ];

  for (const day of history) {
    lines.push(
      `${day.date}: $${day.total_cost_usd.toFixed(4)} (${day.request_count} requests, ${(day.total_input_tokens + day.total_output_tokens).toLocaleString()} tokens)`
    );
  }

  lines.push("");
  lines.push(`Total: $${totalCost.toFixed(4)}`);
  lines.push(`Daily Average: $${avgDaily.toFixed(4)}`);

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
    data: { history, total_cost: totalCost, avg_daily: avgDaily },
  };
}
