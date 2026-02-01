import { describe, it, expect } from "vitest";
import { computeStatus } from "../src/budget.js";

describe("computeStatus", () => {
  it("returns ok when under warning threshold", () => {
    expect(computeStatus(50, 80, 95)).toBe("ok");
    expect(computeStatus(0, 80, 95)).toBe("ok");
    expect(computeStatus(79.9, 80, 95)).toBe("ok");
  });

  it("returns warning between warning and critical", () => {
    expect(computeStatus(80, 80, 95)).toBe("warning");
    expect(computeStatus(90, 80, 95)).toBe("warning");
    expect(computeStatus(94.9, 80, 95)).toBe("warning");
  });

  it("returns critical between critical and 100", () => {
    expect(computeStatus(95, 80, 95)).toBe("critical");
    expect(computeStatus(99.9, 80, 95)).toBe("critical");
  });

  it("returns exceeded at or above 100", () => {
    expect(computeStatus(100, 80, 95)).toBe("exceeded");
    expect(computeStatus(150, 80, 95)).toBe("exceeded");
  });
});
