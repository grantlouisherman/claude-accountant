import { MODEL_PRICING } from "../pricing.js";

export function pricingTableResource() {
  return {
    uri: "pricing://models",
    mimeType: "application/json",
    text: JSON.stringify(MODEL_PRICING, null, 2),
  };
}
