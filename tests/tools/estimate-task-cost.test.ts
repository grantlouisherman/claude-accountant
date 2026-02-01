import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { estimateTaskCostTool } from "../../src/tools/estimate-task-cost.js";
import { closeDb } from "../../src/db.js";
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

describe("estimate_task_cost tool", () => {
  let config: Config;

  beforeEach(() => {
    config = makeTestConfig();
  });

  afterEach(() => {
    closeDb();
    fs.rmSync(config.data_dir, { recursive: true, force: true });
  });

  it("estimates cost for a simple task", () => {
    const result = estimateTaskCostTool(config, {
      task_description: "fix a bug",
      file_count: 1,
      extended_thinking: false,
    });

    expect(result.data.estimated_cost_usd).toBeGreaterThan(0);
    expect(result.data.complexity).toBe("simple");
    expect(result.content[0].text).toContain("fix a bug");
  });

  it("allows complexity override", () => {
    const result = estimateTaskCostTool(config, {
      task_description: "hello",
      complexity: "massive",
      file_count: 10,
      extended_thinking: false,
    });

    expect(result.data.complexity).toBe("massive");
    expect(result.data.estimated_cost_usd).toBeGreaterThan(0.01);
  });

  it("includes budget percentage", () => {
    const result = estimateTaskCostTool(config, {
      task_description: "implement feature",
      file_count: 5,
      extended_thinking: false,
    });

    expect(result.data.pct_of_daily_budget).toBeGreaterThan(0);
  });
});
