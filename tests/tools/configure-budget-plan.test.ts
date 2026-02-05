import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { configureBudgetTool } from "../../src/tools/configure-budget.js";
import type { Config } from "../../src/types.js";

function makeTestConfig(): Config {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "usage-test-"));
  // Create the config directory so saveConfig works
  const configDir = path.join(os.homedir(), ".config", "usage-plugin");
  fs.mkdirSync(configDir, { recursive: true });
  return {
    budget: {
      daily_limit_usd: 10,
      monthly_limit_usd: null,
      warning_threshold_pct: 80,
      critical_threshold_pct: 95,
    },
    pricing_tier: "standard",
    default_model: "claude-sonnet-4-5-20250514",
    data_dir: tmpDir,
  };
}

describe("configure_budget tool with plan params", () => {
  let config: Config;

  beforeEach(() => {
    config = makeTestConfig();
  });

  afterEach(() => {
    fs.rmSync(config.data_dir, { recursive: true, force: true });
  });

  it("sets plan when plan_type is provided", () => {
    const result = configureBudgetTool(config, {
      plan_type: "max_5x",
      plan_monthly_allowance_usd: 100,
    });

    expect(result.config.plan).toBeDefined();
    expect(result.config.plan!.type).toBe("max_5x");
    expect(result.config.plan!.monthly_allowance_usd).toBe(100);
    expect(result.content[0].text).toContain("Plan: Max 5x");
    expect(result.content[0].text).toContain("Plan allowance: $100.00/mo");
  });

  it("sets team plan with seats", () => {
    const result = configureBudgetTool(config, {
      plan_type: "team",
      plan_seats: 5,
      plan_monthly_allowance_usd: 30,
    });

    expect(result.config.plan!.type).toBe("team");
    expect(result.config.plan!.seats).toBe(5);
    expect(result.content[0].text).toContain("Plan: Team (5 seats)");
    expect(result.content[0].text).toContain("Plan allowance: $150.00/mo");
  });

  it("updates existing plan seats without changing type", () => {
    config.plan = { type: "team", monthly_allowance_usd: 30, seats: 3 };
    const result = configureBudgetTool(config, {
      plan_seats: 10,
    });

    expect(result.config.plan!.type).toBe("team");
    expect(result.config.plan!.seats).toBe(10);
  });

  it("updates plan allowance on existing plan", () => {
    config.plan = { type: "max_5x", monthly_allowance_usd: 100 };
    const result = configureBudgetTool(config, {
      plan_monthly_allowance_usd: 200,
    });

    expect(result.config.plan!.monthly_allowance_usd).toBe(200);
  });

  it("does not add plan when only seats provided without existing plan", () => {
    const result = configureBudgetTool(config, {
      plan_seats: 5,
    });

    expect(result.config.plan).toBeUndefined();
  });

  it("still updates budget fields alongside plan", () => {
    const result = configureBudgetTool(config, {
      daily_limit_usd: 20,
      plan_type: "pro",
    });

    expect(result.config.budget.daily_limit_usd).toBe(20);
    expect(result.config.plan!.type).toBe("pro");
  });
});
