import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getDb, logUsage, getTodayUsage, getUsageHistory, closeDb } from "../src/db.js";
import type { Config } from "../src/types.js";

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

describe("db", () => {
  let config: Config;

  beforeEach(() => {
    config = makeTestConfig();
  });

  afterEach(() => {
    closeDb();
    fs.rmSync(config.data_dir, { recursive: true, force: true });
  });

  it("creates database and tables", () => {
    const db = getDb(config);
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      )
      .all() as Array<{ name: string }>;
    const names = tables.map((t) => t.name);
    expect(names).toContain("usage_log");
    expect(names).toContain("daily_summary");
  });

  it("logs usage and updates daily summary", () => {
    logUsage(config, {
      timestamp: new Date().toISOString(),
      session_id: "test-session",
      model: "claude-sonnet-4-5-20250514",
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      estimated_cost_usd: 0.0105,
      task_description: "test task",
      source: "estimate",
    });

    const today = getTodayUsage(config);
    expect(today.request_count).toBe(1);
    expect(today.total_input_tokens).toBe(1000);
    expect(today.total_output_tokens).toBe(500);
    expect(today.total_cost_usd).toBeCloseTo(0.0105, 4);
  });

  it("accumulates multiple log entries in daily summary", () => {
    for (let i = 0; i < 3; i++) {
      logUsage(config, {
        timestamp: new Date().toISOString(),
        session_id: "test-session",
        model: "claude-sonnet-4-5-20250514",
        input_tokens: 1000,
        output_tokens: 500,
        cache_read_tokens: 0,
        cache_write_tokens: 0,
        estimated_cost_usd: 0.01,
        task_description: `task ${i}`,
        source: "estimate",
      });
    }

    const today = getTodayUsage(config);
    expect(today.request_count).toBe(3);
    expect(today.total_input_tokens).toBe(3000);
    expect(today.total_cost_usd).toBeCloseTo(0.03, 4);
  });

  it("returns empty summary when no data exists", () => {
    const today = getTodayUsage(config);
    expect(today.request_count).toBe(0);
    expect(today.total_cost_usd).toBe(0);
  });

  it("retrieves usage history", () => {
    logUsage(config, {
      timestamp: new Date().toISOString(),
      session_id: "test",
      model: "claude-sonnet-4-5-20250514",
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      estimated_cost_usd: 0.01,
      task_description: "test",
      source: "estimate",
    });

    const history = getUsageHistory(config, 7);
    expect(history.length).toBe(1);
    expect(history[0].request_count).toBe(1);
  });
});
