import { describe, expect, it, vi } from "vitest";
import { formatAge } from "./live-helpers";

describe("formatAge", () => {
  it("returns 'just now' for timestamps within 60 seconds", () => {
    const now = new Date("2026-08-25T18:00:00Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);
    expect(formatAge("2026-08-25T17:59:30Z")).toBe("just now");
    vi.restoreAllMocks();
  });

  it("formats minutes ago", () => {
    const now = new Date("2026-08-25T18:00:00Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);
    expect(formatAge("2026-08-25T17:58:00Z")).toBe("2m ago");
    expect(formatAge("2026-08-25T17:45:00Z")).toBe("15m ago");
    vi.restoreAllMocks();
  });

  it("formats hours and minutes", () => {
    const now = new Date("2026-08-25T18:00:00Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);
    expect(formatAge("2026-08-25T16:55:00Z")).toBe("1h 5m ago");
    expect(formatAge("2026-08-25T15:00:00Z")).toBe("3h 0m ago");
    vi.restoreAllMocks();
  });

  it("handles time_tag without Z (assumes UTC)", () => {
    const now = new Date("2026-08-25T18:00:00Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);
    expect(formatAge("2026-08-25T17:45:00")).toBe("15m ago");
    vi.restoreAllMocks();
  });

  it("returns 'just now' for future timestamps (clock skew)", () => {
    const now = new Date("2026-08-25T18:00:00Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);
    expect(formatAge("2026-08-25T18:05:00Z")).toBe("just now");
    vi.restoreAllMocks();
  });
});
