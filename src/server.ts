import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { loadConfig } from "./config.js";
import type { Config } from "./types.js";

// Tools
import { checkBudgetSchema, checkBudget } from "./tools/check-budget.js";
import {
  estimateTaskCostSchema,
  estimateTaskCostTool,
} from "./tools/estimate-task-cost.js";
import { logUsageSchema, logUsageTool } from "./tools/log-usage.js";
import {
  getUsageHistorySchema,
  getUsageHistoryTool,
} from "./tools/get-usage-history.js";
import {
  getRecommendationsSchema,
  getRecommendationsTool,
} from "./tools/get-recommendations.js";
import {
  configureBudgetSchema,
  configureBudgetTool,
} from "./tools/configure-budget.js";

// Resources
import { budgetStatusResource } from "./resources/budget-status.js";
import { usageSummaryResource } from "./resources/usage-summary.js";
import { pricingTableResource } from "./resources/pricing-table.js";

export function createServer(): Server {
  let config: Config = loadConfig();

  const server = new Server(
    { name: "usage-tracker", version: "1.0.0" },
    { capabilities: { tools: {}, resources: {} } }
  );

  // --- List Tools ---
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "check_budget",
        description:
          "Check current daily spending against budget limits. Call this at the start of every session and before expensive operations to stay budget-aware.",
        inputSchema: {
          type: "object" as const,
          properties: {},
        },
      },
      {
        name: "estimate_task_cost",
        description:
          "Estimate the token cost of an upcoming task before starting it. Helps decide whether to proceed, simplify, or defer.",
        inputSchema: {
          type: "object" as const,
          properties: {
            task_description: {
              type: "string",
              description: "Brief description of the planned task",
            },
            complexity: {
              type: "string",
              enum: ["trivial", "simple", "moderate", "complex", "massive"],
              description: "Override complexity tier (auto-detected if omitted)",
            },
            file_count: {
              type: "number",
              description: "Number of files involved",
              default: 0,
            },
            model: {
              type: "string",
              description: "Model to use for cost calculation",
            },
            extended_thinking: {
              type: "boolean",
              description: "Whether extended thinking will be used",
              default: false,
            },
          },
          required: ["task_description"],
        },
      },
      {
        name: "log_usage",
        description:
          "Record token usage after completing work. Call this after each significant task to keep budget tracking accurate.",
        inputSchema: {
          type: "object" as const,
          properties: {
            session_id: {
              type: "string",
              description: "Current session identifier",
            },
            model: {
              type: "string",
              description: "Model used",
            },
            input_tokens: {
              type: "number",
              description: "Input tokens consumed",
            },
            output_tokens: {
              type: "number",
              description: "Output tokens consumed",
            },
            cache_read_tokens: { type: "number", default: 0 },
            cache_write_tokens: { type: "number", default: 0 },
            task_description: {
              type: "string",
              description: "What was done",
              default: "",
            },
            source: {
              type: "string",
              enum: ["estimate", "admin_api", "hook", "manual"],
              default: "estimate",
            },
          },
          required: ["session_id", "input_tokens", "output_tokens"],
        },
      },
      {
        name: "get_usage_history",
        description:
          "Get daily usage breakdown over the past N days. Shows spending trends to help plan work.",
        inputSchema: {
          type: "object" as const,
          properties: {
            days: {
              type: "number",
              description: "Number of days of history (1-90)",
              default: 7,
            },
          },
        },
      },
      {
        name: "get_offload_recommendations",
        description:
          "Get cost-saving recommendations based on current budget status and planned work. Suggests model downgrades, deferrals, and scope reduction.",
        inputSchema: {
          type: "object" as const,
          properties: {
            current_model: {
              type: "string",
              description: "Model currently being used",
            },
            task_complexity: {
              type: "string",
              enum: ["trivial", "simple", "moderate", "complex", "massive"],
            },
            is_urgent: {
              type: "boolean",
              description: "Whether the task is time-sensitive",
              default: true,
            },
          },
        },
      },
      {
        name: "configure_budget",
        description:
          "Update budget limits and thresholds at runtime. Changes are persisted to config file.",
        inputSchema: {
          type: "object" as const,
          properties: {
            daily_limit_usd: {
              type: "number",
              description: "New daily limit in USD",
            },
            monthly_limit_usd: {
              type: ["number", "null"] as any,
              description: "Monthly limit (null to disable)",
            },
            warning_threshold_pct: {
              type: "number",
              description: "Warning threshold %",
            },
            critical_threshold_pct: {
              type: "number",
              description: "Critical threshold %",
            },
          },
        },
      },
    ],
  }));

  // --- Call Tool ---
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "check_budget":
        return await checkBudget(config);

      case "estimate_task_cost": {
        const input = estimateTaskCostSchema.parse(args);
        return estimateTaskCostTool(config, input);
      }

      case "log_usage": {
        const input = logUsageSchema.parse(args);
        return logUsageTool(config, input);
      }

      case "get_usage_history": {
        const input = getUsageHistorySchema.parse(args ?? {});
        return getUsageHistoryTool(config, input);
      }

      case "get_offload_recommendations": {
        const input = getRecommendationsSchema.parse(args ?? {});
        return await getRecommendationsTool(config, input);
      }

      case "configure_budget": {
        const input = configureBudgetSchema.parse(args);
        const result = configureBudgetTool(config, input);
        config = result.config;
        return { content: result.content };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  // --- List Resources ---
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: "budget://status",
        name: "Budget Status",
        description: "Real-time budget snapshot with spending and limits",
        mimeType: "application/json",
      },
      {
        uri: "usage://today",
        name: "Today's Usage",
        description: "Detailed usage breakdown for today",
        mimeType: "application/json",
      },
      {
        uri: "pricing://models",
        name: "Model Pricing",
        description: "Per-token pricing for all supported Claude models",
        mimeType: "application/json",
      },
    ],
  }));

  // --- Read Resource ---
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    switch (uri) {
      case "budget://status":
        return { contents: [await budgetStatusResource(config)] };

      case "usage://today":
        return { contents: [usageSummaryResource(config)] };

      case "pricing://models":
        return { contents: [pricingTableResource()] };

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  });

  return server;
}
