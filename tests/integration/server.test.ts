import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { closeDb } from "../../src/db.js";

// Mock config to use temp directory
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "usage-server-test-"));

vi.mock("../../src/config.js", () => ({
  loadConfig: () => ({
    budget: {
      daily_limit_usd: 10,
      monthly_limit_usd: null,
      warning_threshold_pct: 80,
      critical_threshold_pct: 95,
    },
    pricing_tier: "standard",
    default_model: "claude-sonnet-4-5-20250514",
    data_dir: tmpDir,
  }),
  saveConfig: () => {},
  resolveDataDir: () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    return tmpDir;
  },
}));

import { createServer } from "../../src/server.js";

describe("MCP server integration", () => {
  afterEach(() => {
    closeDb();
  });

  it("creates a server instance", () => {
    const server = createServer();
    expect(server).toBeDefined();
  });
});
