import type { Config } from "../types.js";
import { getBudgetStatus } from "../budget.js";

export function budgetStatusResource(config: Config) {
  const snapshot = getBudgetStatus(config);
  return {
    uri: "budget://status",
    mimeType: "application/json",
    text: JSON.stringify(snapshot, null, 2),
  };
}
