import type { ModelPricing } from "./types.js";

export const MODEL_PRICING: ModelPricing[] = [
  {
    model: "claude-opus-4-5-20251101",
    input_per_mtok: 15.0,
    output_per_mtok: 75.0,
    cache_read_per_mtok: 1.5,
    cache_write_per_mtok: 18.75,
  },
  {
    model: "claude-sonnet-4-5-20250514",
    input_per_mtok: 3.0,
    output_per_mtok: 15.0,
    cache_read_per_mtok: 0.3,
    cache_write_per_mtok: 3.75,
  },
  {
    model: "claude-sonnet-4-20250514",
    input_per_mtok: 3.0,
    output_per_mtok: 15.0,
    cache_read_per_mtok: 0.3,
    cache_write_per_mtok: 3.75,
  },
  {
    model: "claude-haiku-3-5-20241022",
    input_per_mtok: 0.8,
    output_per_mtok: 4.0,
    cache_read_per_mtok: 0.08,
    cache_write_per_mtok: 1.0,
  },
];

export function getPricing(model: string): ModelPricing | undefined {
  return MODEL_PRICING.find((p) => p.model === model);
}

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number = 0,
  cacheWriteTokens: number = 0
): number {
  const pricing = getPricing(model);
  if (!pricing) {
    // Fallback to Sonnet pricing
    const fallback = MODEL_PRICING.find((p) =>
      p.model.includes("sonnet-4-5")
    )!;
    return computeCost(
      fallback,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens
    );
  }
  return computeCost(
    pricing,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens
  );
}

function computeCost(
  pricing: ModelPricing,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  cacheWriteTokens: number
): number {
  return (
    (inputTokens / 1_000_000) * pricing.input_per_mtok +
    (outputTokens / 1_000_000) * pricing.output_per_mtok +
    (cacheReadTokens / 1_000_000) * pricing.cache_read_per_mtok +
    (cacheWriteTokens / 1_000_000) * pricing.cache_write_per_mtok
  );
}
