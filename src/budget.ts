import type { BudgetSnapshot, BudgetStatus, Config } from "./types.js";
import { getTodayUsage, getMonthUsage } from "./db.js";

export function getBudgetStatus(config: Config): BudgetSnapshot {
  const today = getTodayUsage(config);
  const dailyLimit = config.budget.daily_limit_usd;
  const spentToday = today.total_cost_usd;
  const remaining = Math.max(0, dailyLimit - spentToday);
  const pctUsed = dailyLimit > 0 ? (spentToday / dailyLimit) * 100 : 0;

  const status = computeStatus(
    pctUsed,
    config.budget.warning_threshold_pct,
    config.budget.critical_threshold_pct
  );

  const monthlyLimit = config.budget.monthly_limit_usd;
  const spentThisMonth = monthlyLimit !== null ? getMonthUsage(config) : null;

  return {
    status,
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
