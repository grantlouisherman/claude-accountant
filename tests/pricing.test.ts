import { describe, it, expect } from "vitest";
import { getPricing, calculateCost, MODEL_PRICING } from "../src/pricing.js";

describe("pricing", () => {
  it("returns pricing for known models", () => {
    const pricing = getPricing("claude-sonnet-4-5-20250514");
    expect(pricing).toBeDefined();
    expect(pricing!.input_per_mtok).toBe(3.0);
    expect(pricing!.output_per_mtok).toBe(15.0);
  });

  it("returns undefined for unknown models", () => {
    expect(getPricing("gpt-4")).toBeUndefined();
  });

  it("calculates cost correctly for Sonnet", () => {
    const cost = calculateCost(
      "claude-sonnet-4-5-20250514",
      1_000_000,
      100_000
    );
    // 1M input * $3/M + 100K output * $15/M = $3 + $1.5 = $4.5
    expect(cost).toBeCloseTo(4.5, 2);
  });

  it("calculates cost with cache tokens", () => {
    const cost = calculateCost(
      "claude-sonnet-4-5-20250514",
      500_000,
      50_000,
      200_000,
      100_000
    );
    // 500K * $3/M + 50K * $15/M + 200K * $0.3/M + 100K * $3.75/M
    // = $1.5 + $0.75 + $0.06 + $0.375 = $2.685
    expect(cost).toBeCloseTo(2.685, 3);
  });

  it("falls back to Sonnet pricing for unknown models", () => {
    const knownCost = calculateCost(
      "claude-sonnet-4-5-20250514",
      10_000,
      5_000
    );
    const unknownCost = calculateCost("unknown-model", 10_000, 5_000);
    expect(unknownCost).toBe(knownCost);
  });

  it("has pricing for all expected models", () => {
    expect(MODEL_PRICING.length).toBeGreaterThanOrEqual(4);
    const modelNames = MODEL_PRICING.map((p) => p.model);
    expect(modelNames).toContain("claude-opus-4-5-20251101");
    expect(modelNames).toContain("claude-sonnet-4-5-20250514");
    expect(modelNames).toContain("claude-haiku-3-5-20241022");
  });
});
