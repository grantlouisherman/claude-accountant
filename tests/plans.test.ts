import { describe, it, expect } from "vitest";
import {
  getPlanLabel,
  getEffectiveMonthlyAllowance,
  calculatePlanPct,
} from "../src/plans.js";
import type { PlanConfig } from "../src/types.js";

describe("getPlanLabel", () => {
  it("returns default label for pro", () => {
    expect(getPlanLabel({ type: "pro", monthly_allowance_usd: 20 })).toBe(
      "Pro"
    );
  });

  it("returns default label for max_5x", () => {
    expect(getPlanLabel({ type: "max_5x", monthly_allowance_usd: 100 })).toBe(
      "Max 5x"
    );
  });

  it("returns label with seats for team", () => {
    expect(
      getPlanLabel({ type: "team", monthly_allowance_usd: 30, seats: 5 })
    ).toBe("Team (5 seats)");
  });

  it("returns label with seats for enterprise", () => {
    expect(
      getPlanLabel({
        type: "enterprise",
        monthly_allowance_usd: 50,
        seats: 10,
      })
    ).toBe("Enterprise (10 seats)");
  });

  it("uses custom_label when provided", () => {
    expect(
      getPlanLabel({
        type: "pro",
        monthly_allowance_usd: 20,
        custom_label: "My Custom Plan",
      })
    ).toBe("My Custom Plan");
  });

  it("returns team without seats when not set", () => {
    expect(getPlanLabel({ type: "team", monthly_allowance_usd: 30 })).toBe(
      "Team"
    );
  });
});

describe("getEffectiveMonthlyAllowance", () => {
  it("returns configured allowance for non-team plans", () => {
    expect(
      getEffectiveMonthlyAllowance({ type: "max_5x", monthly_allowance_usd: 100 })
    ).toBe(100);
  });

  it("multiplies allowance by seats for team", () => {
    expect(
      getEffectiveMonthlyAllowance({
        type: "team",
        monthly_allowance_usd: 30,
        seats: 5,
      })
    ).toBe(150);
  });

  it("multiplies allowance by seats for enterprise", () => {
    expect(
      getEffectiveMonthlyAllowance({
        type: "enterprise",
        monthly_allowance_usd: 50,
        seats: 10,
      })
    ).toBe(500);
  });

  it("falls back to PLAN_DEFAULTS when allowance is 0", () => {
    expect(
      getEffectiveMonthlyAllowance({ type: "pro", monthly_allowance_usd: 0 })
    ).toBe(20);
  });

  it("falls back to PLAN_DEFAULTS with seat multiplier for team", () => {
    expect(
      getEffectiveMonthlyAllowance({
        type: "team",
        monthly_allowance_usd: 0,
        seats: 3,
      })
    ).toBe(90);
  });

  it("returns 0 for enterprise with no allowance and no default", () => {
    expect(
      getEffectiveMonthlyAllowance({
        type: "enterprise",
        monthly_allowance_usd: 0,
      })
    ).toBe(0);
  });

  it("defaults seats to 1 for team when not specified", () => {
    expect(
      getEffectiveMonthlyAllowance({ type: "team", monthly_allowance_usd: 30 })
    ).toBe(30);
  });
});

describe("calculatePlanPct", () => {
  it("calculates percentage correctly", () => {
    const plan: PlanConfig = { type: "max_5x", monthly_allowance_usd: 100 };
    expect(calculatePlanPct(1, plan)).toBe(1);
  });

  it("returns null when allowance is 0", () => {
    const plan: PlanConfig = {
      type: "enterprise",
      monthly_allowance_usd: 0,
    };
    expect(calculatePlanPct(5, plan)).toBeNull();
  });

  it("handles small costs with precision", () => {
    const plan: PlanConfig = { type: "max_5x", monthly_allowance_usd: 100 };
    const pct = calculatePlanPct(0.042, plan);
    expect(pct).toBe(0.04);
  });

  it("accounts for team seat multiplier", () => {
    const plan: PlanConfig = {
      type: "team",
      monthly_allowance_usd: 30,
      seats: 5,
    };
    // effective = 150, so $1.50 = 1%
    expect(calculatePlanPct(1.5, plan)).toBe(1);
  });
});
