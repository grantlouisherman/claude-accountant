import type { Config } from "../types.js";
import { getTodayUsage } from "../db.js";

export function usageSummaryResource(config: Config) {
  const today = getTodayUsage(config);
  return {
    uri: "usage://today",
    mimeType: "application/json",
    text: JSON.stringify(today, null, 2),
  };
}
