import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkBudget } from "../../src/tools/check-budget.js";
import { logUsage, closeDb } from "../../src/db.js";
import type { Config } from "../../src/types.js";

function makeTestConfig(): Config {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "usage-test-"));
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

describe("check_budget tool", () => {
  let config: Config;

  beforeEach(() => {
    config = makeTestConfig();
  });

  afterEach(() => {
    closeDb();
    fs.rmSync(config.data_dir, { recursive: true, force: true });
  });

  it("returns OK status when no usage", () => {
    const result = checkBudget(config);
    expect(result.data.status).toBe("ok");
    expect(result.data.spent_today_usd).toBe(0);
    expect(result.data.remaining_usd).toBe(10);
  });

  it("reflects logged usage", () => {
    logUsage(config, {
      timestamp: new Date().toISOString(),
      session_id: "test",
      model: "claude-sonnet-4-5-20250514",
      input_tokens: 100000,
      output_tokens: 50000,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      estimated_cost_usd: 5.0,
      task_description: "expensive task",
      source: "estimate",
    });

    const result = checkBudget(config);
    expect(result.data.spent_today_usd).toBe(5.0);
    expect(result.data.pct_used).toBe(50);
    expect(result.data.status).toBe("ok");
  });

  it("returns text content", () => {
    const result = checkBudget(config);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Budget Status: OK");
  });
});
