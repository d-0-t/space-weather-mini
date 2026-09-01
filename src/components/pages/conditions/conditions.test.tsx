// The page formats times in the device time zone, so the suite pins one
// (Sweden, UTC+2) to keep every asserted band and time deterministic.
process.env.TZ = "Europe/Stockholm";

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LocalConditions from "./conditions";
import { PLACE_STORAGE_KEY } from "../../../data/place-storage";

const atNoon = (iso: string): void => {
  vi.useFakeTimers({ toFake: ["Date"] } as unknown as Parameters<
    typeof vi.useFakeTimers
  >[0]);
  vi.setSystemTime(new Date(iso));
};

const seedOslo = (): void => {
  localStorage.setItem(
    PLACE_STORAGE_KEY,
    JSON.stringify({
      v: 1,
      place: {
        displayName: "Oslo, Norway",
        latitude: 59.91,
        longitude: 10.75,
        fetchedAt: "2026-09-15T10:00:00.000Z",
      },
    }),
  );
};

const seedKiruna = (): void => {
  localStorage.setItem(
    PLACE_STORAGE_KEY,
    JSON.stringify({
      v: 1,
      place: {
        displayName: "Kiruna, Norrbotten County, Sweden",
        latitude: 67.8558,
        longitude: 20.2253,
        fetchedAt: "2026-06-01T10:00:00.000Z",
      },
    }),
  );
};

/** The day-section names of the luminosity timeline, in order. */
const bandNames = (): string[] =>
  screen
    .getAllByRole("listitem")
    .map((li) => li.querySelector(".conditions__band-name")?.textContent ?? "")
    .filter(Boolean);

/** The flex-grow ratio (duration in minutes) of the named band. */
const bandGrow = (name: string): number => {
  const li = screen
    .getAllByRole("listitem")
    .find(
      (item) =>
        item.querySelector(".conditions__band-name")?.textContent === name,
    )!;
  return Number(li.style.flexGrow);
};

const bandTime = (name: string): string | null =>
  screen
    .getAllByRole("listitem")
    .find(
      (item) =>
        item.querySelector(".conditions__band-name")?.textContent === name,
    )
    ?.querySelector(".conditions__band-time")?.textContent ?? null;

describe("Local conditions page (ticket 01)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the page heading and the default Östersund place chip", () => {
    atNoon("2026-09-01T12:00:00Z");
    render(<LocalConditions />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Local conditions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Östersund, Jämtland County, Sweden"),
    ).toBeInTheDocument();
  });

  it("persists the Östersund default as the geocoded place on first open", () => {
    atNoon("2026-09-01T12:00:00Z");
    render(<LocalConditions />);
    const stored = JSON.parse(localStorage.getItem(PLACE_STORAGE_KEY)!);
    expect(stored.v).toBe(1);
    expect(stored.place.displayName).toBe("Östersund, Jämtland County, Sweden");
    expect(stored.place.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("renders the luminosity timeline as the full 24 h day split into day sections", () => {
    atNoon("2026-09-15T12:00:00Z");
    seedOslo();
    render(<LocalConditions />);
    // Band widths are duration ratios: they sum to one full day (1440 min)
    // and the Day band at Oslo in mid-September runs about 12 h 54 m.
    const total = screen
      .getAllByRole("listitem")
      .reduce((sum, li) => sum + Number(li.style.flexGrow), 0);
    expect(total).toBeCloseTo(1440, 6);
    expect(bandGrow("Day")).toBeGreaterThan(760);
    expect(bandGrow("Day")).toBeLessThan(790);
  });

  it("labels each band with its start time and the last one with 24:00", () => {
    atNoon("2026-09-15T12:00:00Z");
    seedOslo();
    render(<LocalConditions />);
    expect(bandTime("Night")).toMatch(/^\d{2}:\d{2}$/);
    expect(bandTime("Day")).toMatch(/^\d{2}:\d{2}$/);
    const last = screen.getAllByRole("listitem").at(-1)!;
    expect(last.querySelector(".conditions__band-time--end")?.textContent).toBe(
      "24:00",
    );
    expect(last.textContent).toContain("to 24:00");
  });

  it("renders one bright Day band at Kiruna in June (midnight sun)", () => {
    atNoon("2026-06-21T12:00:00Z");
    seedKiruna();
    render(<LocalConditions />);
    expect(
      screen.getAllByText("Sun does not set today").length,
    ).toBeGreaterThan(0);
    expect(bandNames()).toEqual(["Day"]);
    expect(bandGrow("Day")).toBe(1440);
  });

  it("renders the twilight chain without a Day band at Kiruna in December (polar night)", () => {
    atNoon("2026-12-21T12:00:00Z");
    seedKiruna();
    render(<LocalConditions />);
    expect(
      screen.getAllByText("Sun does not rise today").length,
    ).toBeGreaterThan(0);
    expect(bandNames()).toEqual([
      "Night",
      "Astronomical twilight",
      "Nautical twilight",
      "Civil twilight",
      "Nautical twilight",
      "Astronomical twilight",
      "Night",
    ]);
  });

  it("shows a stored place instead of the default", () => {
    atNoon("2026-09-01T12:00:00Z");
    seedOslo();
    render(<LocalConditions />);
    expect(screen.getByText("Oslo, Norway")).toBeInTheDocument();
    expect(
      screen.queryByText("Östersund, Jämtland County, Sweden"),
    ).not.toBeInTheDocument();
  });

  it("opens with the Night band at 00:00 and never wraps it past midnight at Östersund in early September", () => {
    // The sun dips below −18° only between 00:05 and 01:44 local: the Night
    // band belongs at the start of the day, and the day ends in
    // astronomical twilight – a past-midnight Night band would be a bug.
    atNoon("2026-09-01T20:00:00Z");
    render(<LocalConditions />);
    expect(bandNames()).toEqual([
      "Night",
      "Astronomical twilight",
      "Nautical twilight",
      "Civil twilight",
      "Day",
      "Civil twilight",
      "Nautical twilight",
      "Astronomical twilight",
    ]);
    expect(bandNames().filter((name) => name === "Night")).toHaveLength(1);
    expect(bandTime("Night")).toBe("00:00");
    const last = screen.getAllByRole("listitem").at(-1)!;
    expect(last.querySelector(".conditions__band-name")?.textContent).toBe(
      "Astronomical twilight",
    );
    expect(last.textContent).toContain("to 24:00");
    expect(last.querySelector(".conditions__band-time--end")?.textContent).toBe(
      "24:00",
    );
  });
});
