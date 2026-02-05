import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Config } from "./types.js";

const DEFAULT_CONFIG: Config = {
  budget: {
    daily_limit_usd: 10.0,
    monthly_limit_usd: null,
    warning_threshold_pct: 80,
    critical_threshold_pct: 95,
  },
  pricing_tier: "standard",
  default_model: "claude-sonnet-4-5-20250514",
  data_dir: path.join(os.homedir(), ".config", "usage-plugin", "data"),
};

function getConfigPath(): string {
  return path.join(os.homedir(), ".config", "usage-plugin", "config.json");
}

export function loadConfig(): Config {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return { ...DEFAULT_CONFIG };
  }

  const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    budget: { ...DEFAULT_CONFIG.budget, ...raw.budget },
    plan: raw.plan ?? undefined,
  };
}

export function saveConfig(config: Config): void {
  const configPath = getConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function resolveDataDir(config: Config): string {
  const dir = config.data_dir.replace(/^~/, os.homedir());
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
