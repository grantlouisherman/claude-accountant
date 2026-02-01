import { z } from "zod";
import type { Config, UsageSource } from "../types.js";
import { logUsage } from "../db.js";
import { calculateCost } from "../pricing.js";

export const logUsageSchema = z.object({
  session_id: z.string().describe("Current session identifier"),
  model: z.string().optional().describe("Model used (defaults to config default)"),
  input_tokens: z.number().int().min(0).describe("Input tokens consumed"),
  output_tokens: z.number().int().min(0).describe("Output tokens consumed"),
  cache_read_tokens: z.number().int().min(0).default(0),
  cache_write_tokens: z.number().int().min(0).default(0),
  task_description: z.string().default("").describe("What was done"),
  source: z
    .enum(["estimate", "admin_api", "hook", "manual"])
    .default("estimate")
    .describe("Source of token counts"),
});

export type LogUsageInput = z.infer<typeof logUsageSchema>;

export function logUsageTool(config: Config, input: LogUsageInput) {
  const model = input.model ?? config.default_model;
  const cost = calculateCost(
    model,
    input.input_tokens,
    input.output_tokens,
    input.cache_read_tokens,
    input.cache_write_tokens
  );

  logUsage(config, {
    timestamp: new Date().toISOString(),
    session_id: input.session_id,
    model,
    input_tokens: input.input_tokens,
    output_tokens: input.output_tokens,
    cache_read_tokens: input.cache_read_tokens,
    cache_write_tokens: input.cache_write_tokens,
    estimated_cost_usd: cost,
    task_description: input.task_description,
    source: input.source as UsageSource,
  });

  return {
    content: [
      {
        type: "text" as const,
        text: `Logged: ${input.input_tokens} input + ${input.output_tokens} output tokens ($${cost.toFixed(4)})`,
      },
    ],
    data: { cost, model },
  };
}
