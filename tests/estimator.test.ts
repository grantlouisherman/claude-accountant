import { describe, it, expect } from "vitest";
import { estimateTaskCost, inferComplexity } from "../src/estimator.js";

describe("estimateTaskCost", () => {
  it("returns higher cost for more complex tasks", () => {
    const trivial = estimateTaskCost(
      "claude-sonnet-4-5-20250514",
      "trivial",
      0,
      10
    );
    const complex = estimateTaskCost(
      "claude-sonnet-4-5-20250514",
      "complex",
      5,
      10
    );
    expect(complex.estimated_cost_usd).toBeGreaterThan(
      trivial.estimated_cost_usd
    );
  });

  it("increases cost with more files", () => {
    const few = estimateTaskCost(
      "claude-sonnet-4-5-20250514",
      "moderate",
      2,
      10
    );
    const many = estimateTaskCost(
      "claude-sonnet-4-5-20250514",
      "moderate",
      10,
      10
    );
    expect(many.estimated_cost_usd).toBeGreaterThan(few.estimated_cost_usd);
  });

  it("applies 3x multiplier for extended thinking", () => {
    const normal = estimateTaskCost(
      "claude-sonnet-4-5-20250514",
      "moderate",
      1,
      10,
      false
    );
    const thinking = estimateTaskCost(
      "claude-sonnet-4-5-20250514",
      "moderate",
      1,
      10,
      true
    );
    expect(thinking.estimated_output_tokens).toBe(
      normal.estimated_output_tokens * 3
    );
  });

  it("calculates budget percentage correctly", () => {
    const estimate = estimateTaskCost(
      "claude-sonnet-4-5-20250514",
      "trivial",
      0,
      10
    );
    expect(estimate.pct_of_daily_budget).toBeGreaterThan(0);
    expect(estimate.pct_of_daily_budget).toBeLessThan(100);
  });
});

describe("inferComplexity", () => {
  it("detects massive tasks", () => {
    expect(inferComplexity("refactor the entire auth system")).toBe("massive");
    expect(inferComplexity("migrate from JS to TS")).toBe("massive");
  });

  it("detects complex tasks", () => {
    expect(inferComplexity("implement user authentication")).toBe("complex");
    expect(inferComplexity("add a new feature for exports")).toBe("complex");
  });

  it("detects moderate tasks", () => {
    expect(inferComplexity("update the error messages")).toBe("moderate");
    expect(inferComplexity("add a tooltip")).toBe("moderate");
  });

  it("detects simple tasks", () => {
    expect(inferComplexity("fix the typo in header")).toBe("simple");
    expect(inferComplexity("small tweak to padding")).toBe("simple");
  });

  it("defaults to trivial", () => {
    expect(inferComplexity("hello")).toBe("trivial");
  });
});
