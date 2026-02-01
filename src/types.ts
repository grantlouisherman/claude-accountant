export type BudgetStatus = "ok" | "warning" | "critical" | "exceeded";

export type ComplexityTier =
  | "trivial"
  | "simple"
  | "moderate"
  | "complex"
  | "massive";

export type UsageSource = "estimate" | "admin_api" | "hook" | "manual";

export interface Config {
  budget: {
    daily_limit_usd: number;
    monthly_limit_usd: number | null;
    warning_threshold_pct: number;
    critical_threshold_pct: number;
  };
  pricing_tier: string;
  default_model: string;
  data_dir: string;
  admin_api?: {
    api_key: string;
    organization_id: string;
    sync_interval_minutes: number;
  };
}

export interface UsageLogEntry {
  id?: number;
  timestamp: string;
  session_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  estimated_cost_usd: number;
  task_description: string;
  source: UsageSource;
}

export interface DailySummary {
  date: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_read_tokens: number;
  total_cache_write_tokens: number;
  total_cost_usd: number;
  request_count: number;
}

export interface BudgetSnapshot {
  status: BudgetStatus;
  daily_limit_usd: number;
  spent_today_usd: number;
  remaining_usd: number;
  pct_used: number;
  request_count_today: number;
  monthly_limit_usd: number | null;
  spent_this_month_usd: number | null;
}

export interface CostEstimate {
  estimated_input_tokens: number;
  estimated_output_tokens: number;
  estimated_cost_usd: number;
  pct_of_daily_budget: number;
  complexity: ComplexityTier;
  breakdown: string;
}

export interface Recommendation {
  action: string;
  description: string;
  estimated_savings_pct: number;
  priority: "low" | "medium" | "high";
}

export interface ModelPricing {
  model: string;
  input_per_mtok: number;
  output_per_mtok: number;
  cache_read_per_mtok: number;
  cache_write_per_mtok: number;
}
