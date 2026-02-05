import { describe, it, expect } from "vitest";
import { enrichWithPlan, estimateProject } from "../src/estimator.js";
import { estimateTaskCost } from "../src/estimator.js";
import type { PlanConfig } from "../src/types.js";

describe("enrichWithPlan", () => {
  const base = estimateTaskCost(
    "claude-sonnet-4-5-20250514",
    "moderate",
    2,
    10,
    false
  );

  it("returns estimate unchanged when no plan", () => {
    const result = enrichWithPlan(base);
    expect(result.pct_of_plan).toBeUndefined();
    expect(result.plan_label).toBeUndefined();
    expect(result.plan_allowance_usd).toBeUndefined();
  });

  it("adds plan fields when plan is configured", () => {
    const plan: PlanConfig = { type: "max_5x", monthly_allowance_usd: 100 };
    const result = enrichWithPlan(base, plan);
    expect(result.plan_label).toBe("Max 5x");
    expect(result.plan_allowance_usd).toBe(100);
    expect(result.pct_of_plan).toBeTypeOf("number");
    expect(result.pct_of_plan!).toBeGreaterThan(0);
    expect(result.pct_of_plan!).toBeLessThan(100);
  });

  it("preserves original estimate fields", () => {
    const plan: PlanConfig = { type: "pro", monthly_allowance_usd: 20 };
    const result = enrichWithPlan(base, plan);
    expect(result.estimated_cost_usd).toBe(base.estimated_cost_usd);
    expect(result.complexity).toBe(base.complexity);
    expect(result.pct_of_daily_budget).toBe(base.pct_of_daily_budget);
  });
});

describe("estimateProject", () => {
  const subtasks = [
    { description: "design schema", complexity: "moderate" as const, file_count: 3 },
    { description: "implement login", complexity: "complex" as const, file_count: 5 },
    { description: "write tests", complexity: "moderate" as const, file_count: 8 },
  ];

  it("returns per-subtask estimates", () => {
    const project = estimateProject(
      "claude-sonnet-4-5-20250514",
      subtasks,
      10,
      1,
      false
    );
    expect(project.subtasks).toHaveLength(3);
    expect(project.subtasks[0].description).toBe("design schema");
    expect(project.subtasks[1].complexity).toBe("complex");
  });

  it("sums total cost from subtasks", () => {
    const project = estimateProject(
      "claude-sonnet-4-5-20250514",
      subtasks,
      10,
      1,
      false
    );
    const manualSum = project.subtasks.reduce(
      (s, st) => s + st.estimated_cost_usd,
      0
    );
    expect(project.total_cost_usd).toBeCloseTo(manualSum, 3);
  });

  it("multiplies by sessions", () => {
    const project = estimateProject(
      "claude-sonnet-4-5-20250514",
      subtasks,
      10,
      3,
      false
    );
    expect(project.sessions).toBe(3);
    expect(project.total_over_sessions_usd).toBeCloseTo(
      project.total_cost_usd * 3,
      3
    );
  });

  it("includes plan percentages when plan is set", () => {
    const plan: PlanConfig = { type: "max_5x", monthly_allowance_usd: 100 };
    const project = estimateProject(
      "claude-sonnet-4-5-20250514",
      subtasks,
      10,
      2,
      false,
      plan
    );
    expect(project.pct_of_plan).toBeTypeOf("number");
    expect(project.pct_of_plan_over_sessions).toBeTypeOf("number");
    project.subtasks.forEach((st) => {
      expect(st.pct_of_plan).toBeTypeOf("number");
    });
  });

  it("returns null plan pcts when no plan", () => {
    const project = estimateProject(
      "claude-sonnet-4-5-20250514",
      subtasks,
      10,
      1,
      false
    );
    expect(project.pct_of_plan).toBeNull();
    expect(project.pct_of_plan_over_sessions).toBeNull();
    project.subtasks.forEach((st) => {
      expect(st.pct_of_plan).toBeNull();
    });
  });

  it("auto-infers complexity when not provided", () => {
    const project = estimateProject(
      "claude-sonnet-4-5-20250514",
      [{ description: "fix a bug" }, { description: "refactor auth" }],
      10,
      1,
      false
    );
    expect(project.subtasks[0].complexity).toBe("simple");
    expect(project.subtasks[1].complexity).toBe("massive");
  });
});
