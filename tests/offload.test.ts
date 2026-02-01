import { describe, it, expect } from "vitest";
import { getRecommendations } from "../src/offload.js";
import type { BudgetSnapshot } from "../src/types.js";

function makeBudget(pctUsed: number): BudgetSnapshot {
  return {
    status: pctUsed >= 100 ? "exceeded" : pctUsed >= 95 ? "critical" : pctUsed >= 80 ? "warning" : "ok",
    daily_limit_usd: 10,
    spent_today_usd: (pctUsed / 100) * 10,
    remaining_usd: Math.max(0, 10 - (pctUsed / 100) * 10),
    pct_used: pctUsed,
    request_count_today: 5,
    monthly_limit_usd: null,
    spent_this_month_usd: null,
  };
}

describe("getRecommendations", () => {
  it("suggests switching from Opus to Sonnet", () => {
    const recs = getRecommendations(
      makeBudget(30),
      "claude-opus-4-5-20251101"
    );
    expect(recs.some((r) => r.action === "Switch to Sonnet")).toBe(true);
  });

  it("suggests Haiku for simple tasks on Sonnet", () => {
    const recs = getRecommendations(
      makeBudget(30),
      "claude-sonnet-4-5-20250514",
      "simple"
    );
    expect(recs.some((r) => r.action === "Switch to Haiku")).toBe(true);
  });

  it("suggests deferring when budget high and not urgent", () => {
    const recs = getRecommendations(
      makeBudget(85),
      "claude-sonnet-4-5-20250514",
      "moderate",
      false
    );
    expect(recs.some((r) => r.action === "Defer to tomorrow")).toBe(true);
  });

  it("does not suggest deferring when urgent", () => {
    const recs = getRecommendations(
      makeBudget(85),
      "claude-sonnet-4-5-20250514",
      "moderate",
      true
    );
    expect(recs.some((r) => r.action === "Defer to tomorrow")).toBe(false);
  });

  it("suggests breaking large tasks when budget above 60%", () => {
    const recs = getRecommendations(
      makeBudget(65),
      "claude-sonnet-4-5-20250514",
      "complex"
    );
    expect(
      recs.some((r) => r.action === "Break into smaller tasks")
    ).toBe(true);
  });

  it("suggests shorter responses when budget above 70%", () => {
    const recs = getRecommendations(
      makeBudget(75),
      "claude-sonnet-4-5-20250514"
    );
    expect(
      recs.some((r) => r.action === "Use shorter responses")
    ).toBe(true);
  });

  it("returns sorted by priority", () => {
    const recs = getRecommendations(
      makeBudget(90),
      "claude-opus-4-5-20251101",
      "complex",
      false
    );
    const priorities = recs.map((r) => r.priority);
    const order = { high: 0, medium: 1, low: 2 };
    for (let i = 1; i < priorities.length; i++) {
      expect(order[priorities[i]]).toBeGreaterThanOrEqual(
        order[priorities[i - 1]]
      );
    }
  });
});
