import type {
  BudgetSnapshot,
  ComplexityTier,
  Recommendation,
} from "./types.js";

export function getRecommendations(
  budget: BudgetSnapshot,
  currentModel: string,
  taskComplexity?: ComplexityTier,
  isUrgent: boolean = true
): Recommendation[] {
  const recs: Recommendation[] = [];
  const pct = budget.pct_used;

  // Model downgrade suggestions
  if (currentModel.includes("opus")) {
    recs.push({
      action: "Switch to Sonnet",
      description:
        "Use claude-sonnet-4-5 instead of Opus for this task. Sonnet handles most coding tasks well at lower cost.",
      estimated_savings_pct: 40,
      priority: pct > 60 ? "high" : "medium",
    });
  }

  if (
    (currentModel.includes("sonnet") || currentModel.includes("opus")) &&
    taskComplexity &&
    ["trivial", "simple"].includes(taskComplexity)
  ) {
    recs.push({
      action: "Switch to Haiku",
      description:
        "Use claude-haiku-3-5 for simple tasks like quick lookups, formatting, or short answers.",
      estimated_savings_pct: 67,
      priority: pct > 50 ? "high" : "low",
    });
  }

  // Defer non-urgent work
  if (pct > 80 && !isUrgent) {
    recs.push({
      action: "Defer to tomorrow",
      description:
        "Budget is above 80%. Non-urgent work can be deferred to preserve remaining budget for critical tasks.",
      estimated_savings_pct: 100,
      priority: "high",
    });
  }

  // Break into smaller tasks
  if (
    pct > 60 &&
    taskComplexity &&
    ["complex", "massive"].includes(taskComplexity)
  ) {
    recs.push({
      action: "Break into smaller tasks",
      description:
        "Split this large task into focused subtasks. Complete the most important parts now and defer the rest.",
      estimated_savings_pct: 30,
      priority: "medium",
    });
  }

  // Shorter responses
  if (pct > 70) {
    recs.push({
      action: "Use shorter responses",
      description:
        "Ask Claude for concise answers. Avoid extended explanations and verbose output to reduce output tokens.",
      estimated_savings_pct: 20,
      priority: pct > 90 ? "high" : "low",
    });
  }

  // Batch API
  if (
    taskComplexity &&
    ["complex", "massive"].includes(taskComplexity) &&
    !isUrgent
  ) {
    recs.push({
      action: "Use Batch API",
      description:
        "For non-time-sensitive bulk operations, use the Batch API for 50% cost reduction.",
      estimated_savings_pct: 50,
      priority: pct > 70 ? "high" : "medium",
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recs;
}
