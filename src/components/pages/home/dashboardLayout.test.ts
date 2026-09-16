// TDD RED for ticket 04: Wide Dashboard buckets with xl breakpoint.
// Seams (from spec Testing Decisions): Dashboard composition defaults,
// corrupt-storage fallback, unknown-id append, empty-column collapse,
// resize switching. External behavior only, via storage + bucket pure logic.
import { describe, expect, it, beforeEach } from "vitest";

import {
  DASHBOARD_LAYOUT_STORAGE_KEY,
  DEFAULT_DASHBOARD_LAYOUT,
  getLayoutBucket,
  loadDashboardLayout,
  saveDashboardLayout,
  type DashboardLayout,
  type DashboardPanelId,
} from "./dashboardLayout";

const KNOWN_IDS: DashboardPanelId[] = [
  "aurora-now",
  "pinned-webcams",
  "summary",
  "oval-glow",
  "possible-locations",
  "solar-wind",
  "magnetosphere",
  "forecast",
];

beforeEach(() => {
  localStorage.clear();
});

describe("Dashboard layout buckets (ticket 04)", () => {
  it("stores the agreed default membership per Layout bucket", () => {
    expect(DEFAULT_DASHBOARD_LAYOUT.single).toEqual(KNOWN_IDS);
    expect(DEFAULT_DASHBOARD_LAYOUT.double).toEqual([
      ["aurora-now", "summary", "oval-glow", "forecast"],
      ["pinned-webcams", "possible-locations", "solar-wind", "magnetosphere"],
    ]);
    expect(DEFAULT_DASHBOARD_LAYOUT.triple).toEqual([
      ["aurora-now", "summary", "oval-glow"],
      ["solar-wind", "magnetosphere"],
      ["pinned-webcams", "possible-locations", "forecast"],
    ]);
  });

  it("loads defaults when storage is empty", () => {
    expect(loadDashboardLayout(localStorage)).toEqual(DEFAULT_DASHBOARD_LAYOUT);
  });

  it("falls back to defaults on corrupt storage", () => {
    localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, "not-json{{{");
    expect(loadDashboardLayout(localStorage)).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    localStorage.setItem(
      DASHBOARD_LAYOUT_STORAGE_KEY,
      JSON.stringify({ v: 999, single: [], double: [[], []], triple: [[], [], []] }),
    );
    expect(loadDashboardLayout(localStorage)).toEqual(DEFAULT_DASHBOARD_LAYOUT);
  });

  it("appends missing known panels rather than dropping them", () => {
    const partial: DashboardLayout = {
      v: 1,
      single: ["aurora-now"],
      double: [["aurora-now"], []],
      triple: [["aurora-now"], [], []],
    };
    localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(partial));
    const loaded = loadDashboardLayout(localStorage);
    for (const id of KNOWN_IDS) {
      expect(loaded.single).toContain(id);
    }
    const doubleAll = [...loaded.double[0], ...loaded.double[1]];
    for (const id of KNOWN_IDS) {
      expect(doubleAll).toContain(id);
    }
    const tripleAll = [...loaded.triple[0], ...loaded.triple[1], ...loaded.triple[2]];
    for (const id of KNOWN_IDS) {
      expect(tripleAll).toContain(id);
    }
  });

  it("preserves unknown future panel ids instead of vanishing them", () => {
    const withUnknown = {
      v: 1,
      single: [...KNOWN_IDS, "future-panel"],
      double: [
        ["aurora-now", "summary", "oval-glow", "forecast"],
        ["pinned-webcams", "possible-locations", "solar-wind", "magnetosphere", "future-panel"],
      ],
      triple: [
        ["aurora-now", "summary", "oval-glow"],
        ["solar-wind", "magnetosphere"],
        ["pinned-webcams", "possible-locations", "forecast", "future-panel"],
      ],
    };
    localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(withUnknown));
    const loaded = loadDashboardLayout(localStorage);
    expect(loaded.single).toContain("future-panel" as DashboardPanelId);
    expect(loaded.double[1]).toContain("future-panel" as DashboardPanelId);
    expect(loaded.triple[2]).toContain("future-panel" as DashboardPanelId);
  });

  it("round-trips a saved layout", () => {
    saveDashboardLayout(localStorage, DEFAULT_DASHBOARD_LAYOUT);
    expect(loadDashboardLayout(localStorage)).toEqual(DEFAULT_DASHBOARD_LAYOUT);
  });

  it("resolves the Layout bucket from width queries plus the landscape-phone exception", () => {
    // 1-column below md.
    expect(getLayoutBucket({ md: false, xl: false, landscape: false })).toBe("1-column");
    // 2-column from md to below xl.
    expect(getLayoutBucket({ md: true, xl: false, landscape: false })).toBe("2-column");
    // 3-column at xl and above.
    expect(getLayoutBucket({ md: true, xl: true, landscape: false })).toBe("3-column");
    // Landscape phones get the normal 2-column reflow even below md.
    expect(getLayoutBucket({ md: false, xl: false, landscape: true })).toBe("2-column");
    // Portrait phones stay single column.
    expect(getLayoutBucket({ md: false, xl: false, landscape: false })).toBe("1-column");
  });

  it("falls back to defaults on foreign shapes: missing keys and wrong column counts", () => {
    localStorage.setItem(
      DASHBOARD_LAYOUT_STORAGE_KEY,
      JSON.stringify({ v: 1, single: ["aurora-now"] }),
    );
    expect(loadDashboardLayout(localStorage)).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    localStorage.setItem(
      DASHBOARD_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        single: ["aurora-now"],
        double: [["aurora-now"]],
        triple: [["aurora-now"], [], []],
      }),
    );
    expect(loadDashboardLayout(localStorage)).toEqual(DEFAULT_DASHBOARD_LAYOUT);
  });

  it("drops non-string ids while appending the missing known panels", () => {
    localStorage.setItem(
      DASHBOARD_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        single: ["aurora-now", 42, null],
        double: [["aurora-now", false], ["summary"]],
        triple: [["aurora-now"], ["solar-wind"], ["forecast"]],
      }),
    );
    const loaded = loadDashboardLayout(localStorage);
    expect(loaded.single).not.toContain(42 as unknown as DashboardPanelId);
    for (const id of KNOWN_IDS) {
      expect(loaded.single).toContain(id);
    }
  });

  it("keeps stored unknown ids through a save and load round trip", () => {
    const withUnknown = {
      v: 1,
      single: [...KNOWN_IDS, "future-panel"],
      double: [
        ["aurora-now", "summary", "oval-glow", "forecast"],
        ["pinned-webcams", "possible-locations", "solar-wind", "magnetosphere", "future-panel"],
      ],
      triple: [
        ["aurora-now", "summary", "oval-glow"],
        ["solar-wind", "magnetosphere"],
        ["pinned-webcams", "possible-locations", "forecast", "future-panel"],
      ],
    };
    localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(withUnknown));
    const loaded = loadDashboardLayout(localStorage);
    saveDashboardLayout(localStorage, loaded);
    const again = loadDashboardLayout(localStorage);
    expect(again.single).toContain("future-panel" as DashboardPanelId);
    expect(again.double[1]).toContain("future-panel" as DashboardPanelId);
    expect(again.triple[2]).toContain("future-panel" as DashboardPanelId);
  });
});
