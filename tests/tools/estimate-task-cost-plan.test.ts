import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { estimateTaskCostTool } from "../../src/tools/estimate-task-cost.js";
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

describe("estimate_task_cost tool with plan", () => {
  let config: Config;

  afterEach(() => {
    closeDb();
    fs.rmSync(config.data_dir, { recursive: true, force: true });
  });

  it("includes plan context in single-task output", () => {
    config = makeTestConfig(true);
    const result = estimateTaskCostTool(config, {
      task_description: "fix a bug",
      file_count: 1,
      extended_thinking: false,
      sessions: 1,
    });

    const text = result.content[0].text;
    expect(text).toContain("Plan: Max 5x ($100.00/mo)");
    expect(text).toContain("% of Monthly Plan:");
  });

  it("omits plan context when no plan configured", () => {
    config = makeTestConfig(false);
    const result = estimateTaskCostTool(config, {
      task_description: "fix a bug",
      file_count: 1,
      extended_thinking: false,
      sessions: 1,
    });

    const text = result.content[0].text;
    expect(text).not.toContain("Plan:");
    expect(text).not.toContain("% of Monthly Plan:");
  });

  it("returns project estimate with subtasks", () => {
    config = makeTestConfig(true);
    const result = estimateTaskCostTool(config, {
      task_description: "implement auth",
      file_count: 0,
      extended_thinking: false,
      sessions: 1,
      subtasks: [
        { description: "design schema", complexity: "moderate", file_count: 3 },
        { description: "implement login", complexity: "complex", file_count: 5 },
      ],
    });

    const text = result.content[0].text;
    expect(text).toContain("Project Estimate: implement auth");
    expect(text).toContain("Subtasks:");
    expect(text).toContain("design schema");
    expect(text).toContain("implement login");
    expect(text).toContain("Project Total:");
    expect(text).toContain("Plan: Max 5x ($100.00/mo)");
  });

  it("shows session multiplier when sessions > 1", () => {
    config = makeTestConfig(true);
    const result = estimateTaskCostTool(config, {
      task_description: "big project",
      file_count: 0,
      extended_thinking: false,
      sessions: 3,
      subtasks: [
        { description: "step 1", complexity: "moderate", file_count: 2 },
      ],
    });

    const text = result.content[0].text;
    expect(text).toContain("Sessions: 3");
    expect(text).toContain("Estimated over 3 sessions:");
    expect(text).toContain("% of plan)");
  });

  it("does not show session line when sessions = 1", () => {
    config = makeTestConfig(true);
    const result = estimateTaskCostTool(config, {
      task_description: "single session project",
      file_count: 0,
      extended_thinking: false,
      sessions: 1,
      subtasks: [
        { description: "step 1", complexity: "simple", file_count: 1 },
      ],
    });

    const text = result.content[0].text;
    expect(text).not.toContain("Estimated over");
  });
});
