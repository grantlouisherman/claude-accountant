import type { Config } from "./types.js";
import { logUsage } from "./db.js";
import { calculateCost } from "./pricing.js";

interface AdminApiUsageRecord {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

interface AdminApiResponse {
  data: AdminApiUsageRecord[];
}

export async function syncFromAdminApi(config: Config): Promise<number> {
  if (!config.admin_api) {
    throw new Error("Admin API not configured");
  }

  const { api_key, organization_id } = config.admin_api;
  const today = new Date().toISOString().split("T")[0];

  const url = `https://api.anthropic.com/v1/organizations/${organization_id}/usage?start_date=${today}&end_date=${today}`;

  const response = await fetch(url, {
    headers: {
      "x-api-key": api_key,
      "anthropic-version": "2023-06-01",
    },
  });

  if (!response.ok) {
    throw new Error(`Admin API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as AdminApiResponse;
  let synced = 0;

  for (const record of data.data) {
    const cost = calculateCost(
      record.model,
      record.input_tokens,
      record.output_tokens,
      record.cache_read_input_tokens,
      record.cache_creation_input_tokens
    );

    logUsage(config, {
      timestamp: new Date().toISOString(),
      session_id: "admin-api-sync",
      model: record.model,
      input_tokens: record.input_tokens,
      output_tokens: record.output_tokens,
      cache_read_tokens: record.cache_read_input_tokens,
      cache_write_tokens: record.cache_creation_input_tokens,
      estimated_cost_usd: cost,
      task_description: "Synced from Admin API",
      source: "admin_api",
    });
    synced++;
  }

  return synced;
}
