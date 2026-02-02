import type { Config } from "../types.js";
import { getBudgetStatus } from "../budget.js";

export async function budgetStatusResource(config: Config) {
  const snapshot = await getBudgetStatus(config);
  return {
    uri: "budget://status",
    mimeType: "application/json",
    text: JSON.stringify(snapshot, null, 2),
  };
}
