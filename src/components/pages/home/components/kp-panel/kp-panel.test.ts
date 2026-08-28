import { describe, expect, it } from "vitest";
import { kpClass } from "./kp-panel";

describe("kpClass", () => {
  it("maps Kp values to the frozen .kp01–.kp9 band classes", () => {
    expect(kpClass(1)).toBe("kp12");
    expect(kpClass(4.5)).toBe("kp56");
    expect(kpClass(5)).toBe("kp56");
    expect(kpClass(5.67)).toBe("kp67");
    expect(kpClass(6)).toBe("kp67");
    expect(kpClass(8.5)).toBe("kp9");
    expect(kpClass(9)).toBe("kp9");
    expect(kpClass(10)).toBe("kp9");
  });

  it("stays on a valid band for values below 1", () => {
    expect(kpClass(0.5)).toBe("kp12");
    expect(kpClass(0)).toBe("kp01");
  });
});