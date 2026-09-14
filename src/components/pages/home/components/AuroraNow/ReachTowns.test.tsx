// The solar gate is absolute-instant math, but the suite pins the device
// zone like every time-sensitive file so its instants stay deterministic.
process.env.TZ = "Europe/Stockholm";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ReachTowns from "./ReachTowns";

/**
 * The component reads the wall clock through suncalc, so the fake Date
 * pins the instants; full fake timers let the 60 s tick be advanced.
 */
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ReachTowns", () => {
  it("renders nothing when no town is both in reach and dark", () => {
    // Midsummer, Kp 0 (edge 66°): every high-MLAT town is in daylight,
    // midnight sun or bright twilight – nothing qualifies.
    vi.setSystemTime(new Date("2026-06-21T12:00:00Z"));
    const { container } = render(<ReachTowns kp={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the towns in reach for the current Kp with flag, city and probability", () => {
    // 2026-12-21T12:00Z, Kp 1 (edge 64°): Yellowknife (MLAT 68.52 →
    // Likely) sits at 04:22 local and Fairbanks (MLAT 65.67 → Possible)
    // at 02:10 local – both deep night.
    vi.setSystemTime(new Date("2026-12-21T12:00:00Z"));
    render(<ReachTowns kp={1} />);

    const rows = Array.from(document.querySelectorAll(".reach-towns__town"));
    expect(
      rows.map((row) => row.querySelector(".reach-towns__city")?.textContent),
    ).toEqual(["Yellowknife", "Fairbanks"]);

    const fairbanks = screen.getByText("Fairbanks").closest("li")!;
    const flag = within(fairbanks).getByRole("img", { name: "United States" });
    expect(flag).toHaveAttribute("src", "https://flagcdn.com/16x12/us.png");
    expect(flag).toHaveAttribute("width", "16");
    expect(flag).toHaveAttribute("height", "12");
    expect(flag).toHaveAttribute("loading", "lazy");
    expect(flag).toHaveAttribute("title", "United States");

    // The probability icon is ranked (bars), wrapped in the band class,
    // titled with the band explanation and named for screen readers.
    const probability = fairbanks.querySelector(".reach-towns__probability")!;
    expect(probability).toHaveClass("reach-towns__probability--possible");
    const icon = probability.querySelector(".reach-towns__probability-icon")!;
    expect(icon.getAttribute("title")).toMatch(
      /Possible .* May be seen, not promised\./,
    );
    expect(within(fairbanks).getByText("Possible")).toHaveClass("sr-only");
    expect(icon.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("recomputes the list as time passes on its 60 s tick", () => {
    // 2026-12-21T12:00Z: Oslo (MLAT 59.67, in reach at Kp 5) is in its
    // 13:00 daylight; twelve hours later it is 01:00 and deep night.
    vi.setSystemTime(new Date("2026-12-21T12:00:00Z"));
    render(<ReachTowns kp={5} />);
    expect(screen.queryByText("Oslo")).toBeNull();
    act(() => vi.advanceTimersByTime(12 * 60 * 60_000));
    expect(screen.getByText("Oslo")).toBeInTheDocument();
  });
});
