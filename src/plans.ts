import type { PlanConfig, PlanType } from "./types.js";

interface PlanDefault {
  label: string;
  monthly_usd: number;
}

const PLAN_DEFAULTS: Record<PlanType, PlanDefault> = {
  pro: { label: "Pro", monthly_usd: 20 },
  max_5x: { label: "Max 5x", monthly_usd: 100 },
  max_20x: { label: "Max 20x", monthly_usd: 200 },
  team: { label: "Team", monthly_usd: 30 },
  enterprise: { label: "Enterprise", monthly_usd: 0 },
  api: { label: "API", monthly_usd: 0 },
};

export function getPlanLabel(plan: PlanConfig): string {
  if (plan.custom_label) return plan.custom_label;
  const base = PLAN_DEFAULTS[plan.type]?.label ?? plan.type;
  if ((plan.type === "team" || plan.type === "enterprise") && plan.seats) {
    return `${base} (${plan.seats} seats)`;
  }
  return base;
}

export function getEffectiveMonthlyAllowance(plan: PlanConfig): number {
  if (plan.monthly_allowance_usd > 0) {
    const seats = plan.seats ?? 1;
    if (plan.type === "team" || plan.type === "enterprise") {
      return plan.monthly_allowance_usd * seats;
    }
    return plan.monthly_allowance_usd;
  }
  const defaults = PLAN_DEFAULTS[plan.type];
  if (!defaults) return 0;
  const seats = plan.seats ?? 1;
  if (plan.type === "team" || plan.type === "enterprise") {
    return defaults.monthly_usd * seats;
  }
  return defaults.monthly_usd;
}

export function calculatePlanPct(
  costUsd: number,
  plan: PlanConfig
): number | null {
  const allowance = getEffectiveMonthlyAllowance(plan);
  if (allowance <= 0) return null;
  return Math.round((costUsd / allowance) * 10000) / 100;
}
