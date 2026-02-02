import type { ApiUsageByModel, ApiUsageSummary, Config } from "./types.js";
import { calculateCost } from "./pricing.js";

interface UsageReportResult {
  model: string;
  uncached_input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation: {
    ephemeral_5m_input_tokens: number;
    ephemeral_1h_input_tokens: number;
  };
  api_key_id: string;
  workspace_id: string;
  service_tier: string;
  context_window: string;
  server_tool_use: {
    web_search_requests: number;
  };
}

interface UsageReportBucket {
  starting_at: string;
  ending_at: string;
  results: UsageReportResult[];
}

interface UsageReportResponse {
  data: UsageReportBucket[];
  has_more: boolean;
  next_page: string;
}

export async function fetchApiUsage(
  config: Config
): Promise<ApiUsageSummary> {
  if (!config.admin_api) {
    throw new Error("Admin API not configured");
  }

  const { api_key } = config.admin_api;

  // Start of today in UTC (RFC 3339)
  const now = new Date();
  const startOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const startingAt = startOfDay.toISOString();

  const params = new URLSearchParams({
    starting_at: startingAt,
    bucket_width: "1d",
    "group_by[]": "model",
  });

  const url = `https://api.anthropic.com/v1/organizations/usage_report/messages?${params}`;

  const response = await fetch(url, {
    headers: {
      "x-api-key": api_key,
      "anthropic-version": "2023-06-01",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Admin API error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as UsageReportResponse;

  const byModel: ApiUsageByModel[] = [];
  let totalCost = 0;
  let totalInput = 0;
  let totalOutput = 0;

  for (const bucket of data.data) {
    for (const result of bucket.results) {
      const cacheWriteTokens =
        (result.cache_creation?.ephemeral_5m_input_tokens ?? 0) +
        (result.cache_creation?.ephemeral_1h_input_tokens ?? 0);

      const cost = calculateCost(
        result.model,
        result.uncached_input_tokens,
        result.output_tokens,
        result.cache_read_input_tokens,
        cacheWriteTokens
      );

      byModel.push({
        model: result.model,
        input_tokens: result.uncached_input_tokens,
        output_tokens: result.output_tokens,
        cache_read_tokens: result.cache_read_input_tokens,
        cache_write_tokens: cacheWriteTokens,
        cost_usd: cost,
      });

      totalCost += cost;
      totalInput += result.uncached_input_tokens;
      totalOutput += result.output_tokens;
    }
  }

  return {
    total_cost_usd: totalCost,
    total_input_tokens: totalInput,
    total_output_tokens: totalOutput,
    by_model: byModel,
  };
}
