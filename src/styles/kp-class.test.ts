import { describe, expect, it } from "vitest";
import { kpClass } from "./kp-class";

describe("kpClass", () => {
  it("maps Kp values to the kp01–kp9 token classes", () => {
    expect(kpClass(0)).toBe("kp01");
    expect(kpClass(1)).toBe("kp12");
    expect(kpClass(2)).toBe("kp23");
    expect(kpClass(2.5)).toBe("kp23");
    expect(kpClass(5)).toBe("kp56");
    expect(kpClass(8)).toBe("kp89");
    expect(kpClass(9)).toBe("kp9");
    expect(kpClass(9.5)).toBe("kp9");
  });

  it("treats non-numeric input as the quietest class", () => {
    expect(kpClass(Number.NaN)).toBe("kp01");
  });
});