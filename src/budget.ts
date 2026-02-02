import type { BudgetSnapshot, BudgetStatus, Config } from "./types.js";
import { getTodayUsage, getMonthUsage, ingestHookEvents } from "./db.js";
import { fetchApiUsage } from "./admin-api.js";

export async function getBudgetStatus(config: Config): Promise<BudgetSnapshot> {
  // Ingest any pending hook events before calculating budget
  ingestHookEvents(config);

  const today = getTodayUsage(config);
  const dailyLimit = config.budget.daily_limit_usd;
  const spentToday = today.total_cost_usd;
  const remaining = Math.max(0, dailyLimit - spentToday);
  const pctUsed = dailyLimit > 0 ? (spentToday / dailyLimit) * 100 : 0;

  const monthlyLimit = config.budget.monthly_limit_usd;
  const spentThisMonth = monthlyLimit !== null ? getMonthUsage(config) : null;

  const snapshot: BudgetSnapshot = {
    status: "ok",
    daily_limit_usd: dailyLimit,
    spent_today_usd: Math.round(spentToday * 10000) / 10000,
    remaining_usd: Math.round(remaining * 10000) / 10000,
    pct_used: Math.round(pctUsed * 100) / 100,
    request_count_today: today.request_count,
    monthly_limit_usd: monthlyLimit,
    spent_this_month_usd:
      spentThisMonth !== null
        ? Math.round(spentThisMonth * 10000) / 10000
        : null,
  };

  // Try to fetch real API usage if configured
  let effectivePctUsed = pctUsed;
  if (config.admin_api) {
    try {
      const apiUsage = await fetchApiUsage(config);
      const apiPctUsed =
        dailyLimit > 0 ? (apiUsage.total_cost_usd / dailyLimit) * 100 : 0;

      snapshot.api_usage = apiUsage;
      snapshot.api_spent_today_usd =
        Math.round(apiUsage.total_cost_usd * 10000) / 10000;
      snapshot.api_pct_used = Math.round(apiPctUsed * 100) / 100;

      // Use the higher of local estimate or API-reported spend
      effectivePctUsed = Math.max(pctUsed, apiPctUsed);

      // Update remaining based on API data if it's higher
      if (apiUsage.total_cost_usd > spentToday) {
        snapshot.remaining_usd = Math.round(
          Math.max(0, dailyLimit - apiUsage.total_cost_usd) * 10000
        ) / 10000;
      }
    } catch {
      // API fetch failed — fall back to local estimates silently
    }
  }

  snapshot.status = computeStatus(
    effectivePctUsed,
    config.budget.warning_threshold_pct,
    config.budget.critical_threshold_pct
  );

  return snapshot;
}

export function computeStatus(
  pctUsed: number,
  warningPct: number,
  criticalPct: number
): BudgetStatus {
  if (pctUsed >= 100) return "exceeded";
  if (pctUsed >= criticalPct) return "critical";
  if (pctUsed >= warningPct) return "warning";
  return "ok";
}
