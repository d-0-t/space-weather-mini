import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { severityColor } from "../../../../../styles/severity";
import { MiniSparkline } from "./live-panels";

const pts = (values: (number | null)[]) =>
  values.map((value, x) => ({
    x,
    time: `${x}:00`,
    timeTag: `2026-08-26T0${x}:00:00`,
    value,
  }));

const strokesOf = (container: HTMLElement): string[] =>
  Array.from(container.querySelectorAll("path"))
    .map((p) => p.getAttribute("stroke"))
    .filter((s): s is string => s !== null);

/** All y-coordinates (SVG user space) of the paths stroked `color`. */
const yValuesOf = (container: HTMLElement, color: string): number[] =>
  Array.from(container.querySelectorAll("path"))
    .filter((p) => p.getAttribute("stroke") === color)
    .flatMap((p) => {
      const nums = (p.getAttribute("d") ?? "").match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
      return nums.filter((_, i) => i % 2 === 1).map(Number);
    });

beforeEach(() => {
  // jsdom has no layout: recharts measures the container as 0×0 and skips
  // rendering. Give it a fixed size so the SVG actually mounts.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 320,
    height: 140,
    top: 0,
    left: 0,
    right: 320,
    bottom: 140,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private cb: ResizeObserverCallback) {}
      observe(target: Element) {
        this.cb(
          [
            {
              target,
              contentRect: { width: 320, height: 140 },
            } as ResizeObserverEntry,
          ],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    },
  );
});

describe("MiniSparkline threshold coloring", () => {
  it("renders one stroke per severity band the data crosses", () => {
    const { container } = render(
      <MiniSparkline
        title="Speed"
        points={pts([100, 300, 500, 700, 900])}
        accent="greenyellow"
        ariaLabel="test speed chart"
        unit="km/s"
        colorBy={(v) => severityColor("speed", v)}
      />,
    );
    const strokes = strokesOf(container);
    expect(strokes).toContain("#9aa0a6"); // gray < 200
    expect(strokes).toContain("#4ade80"); // green 200–400
    expect(strokes).toContain("#facc15"); // yellow 400–600
    expect(strokes).toContain("#f44336"); // red 600–800
    expect(strokes).toContain("#ff00ea"); // magenta 800+
  });

  it("renders a single accent line when no colorBy is set", () => {
    const { container } = render(
      <MiniSparkline
        title="Speed"
        points={pts([100, 200, 300])}
        accent="greenyellow"
        ariaLabel="test speed chart"
        unit="km/s"
      />,
    );
    const strokes = strokesOf(container);
    expect(strokes).toContain("greenyellow");
    expect(strokes.some((s) => s.startsWith("#"))).toBe(false);
  });

  it("colors a mirrored second series by its raw value, not its plot value", () => {
    const { container } = render(
      <MiniSparkline
        title="Hemispheric power"
        points={pts([15, 15, 35, 40])}
        accent="plum"
        ariaLabel="hemi test chart"
        unit="GW"
        colorBy={(v) => severityColor("hemi", v)}
        primaryName="North hemispheric power"
        second={{
          points: pts([15, 35, 40, 40]),
          accent: "cyan",
          name: "South hemispheric power",
          invert: true,
          colorBy: (v) => severityColor("hemi", v),
        }}
      />,
    );
    // The south run above 30 renders red segments (mirrored, negative y).
    const redYs = yValuesOf(container, "#f44336");
    expect(redYs.length).toBeGreaterThan(0);
    // The yellow south line must NOT reach the deepest red point (it would
    // if its segment lines plotted the whole series instead of its run).
    const deepest = Math.min(...redYs);
    expect(yValuesOf(container, "#facc15")).not.toContain(deepest);
  });
});