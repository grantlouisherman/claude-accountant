import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkBudget } from "../../src/tools/check-budget.js";
import { closeDb } from "../../src/db.js";
import type { Config } from "../../src/types.js";

function makeTestConfig(withPlan = false): Config {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "usage-test-"));
  const config: Config = {
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
  if (withPlan) {
    config.plan = { type: "max_5x", monthly_allowance_usd: 100 };
  }
  return config;
}

describe("check_budget tool with plan", () => {
  let config: Config;

  afterEach(() => {
    closeDb();
    fs.rmSync(config.data_dir, { recursive: true, force: true });
  });

  it("includes plan context when plan is configured", async () => {
    config = makeTestConfig(true);
    const result = await checkBudget(config);
    const text = result.content[0].text;
    expect(text).toContain("Plan: Max 5x ($100.00/mo)");
    expect(text).toContain("Monthly Plan Usage:");
    expect(text).toContain("Plan Remaining:");
  });

  it("omits plan context when no plan configured", async () => {
    config = makeTestConfig(false);
    const result = await checkBudget(config);
    const text = result.content[0].text;
    expect(text).not.toContain("Plan:");
    expect(text).not.toContain("Monthly Plan Usage:");
  });

  it("shows plan with team seats", async () => {
    config = makeTestConfig(false);
    config.plan = { type: "team", monthly_allowance_usd: 30, seats: 5 };
    const result = await checkBudget(config);
    const text = result.content[0].text;
    expect(text).toContain("Plan: Team (5 seats) ($150.00/mo)");
    expect(text).toContain("Plan Remaining: ~$150.00");
  });
});
