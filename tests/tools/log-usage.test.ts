import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { logUsageTool } from "../../src/tools/log-usage.js";
import { getTodayUsage, closeDb } from "../../src/db.js";
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

describe("log_usage tool", () => {
  let config: Config;

  beforeEach(() => {
    config = makeTestConfig();
  });

  afterEach(() => {
    closeDb();
    fs.rmSync(config.data_dir, { recursive: true, force: true });
  });

  it("logs usage and returns cost", () => {
    const result = logUsageTool(config, {
      session_id: "test-session",
      input_tokens: 10000,
      output_tokens: 5000,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      task_description: "test task",
      source: "estimate",
    });

    expect(result.data.cost).toBeGreaterThan(0);
    expect(result.content[0].text).toContain("Logged:");

    const today = getTodayUsage(config);
    expect(today.request_count).toBe(1);
  });

  it("uses default model from config when not specified", () => {
    const result = logUsageTool(config, {
      session_id: "test",
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      task_description: "",
      source: "estimate",
    });

    expect(result.data.model).toBe("claude-sonnet-4-5-20250514");
  });
});
