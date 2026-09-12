// The summary renders As-of lines through the display-time module; the
// suite pins the documented zone (Sweden, UTC+2) like the AuroraNow suite
// and covers both Display timezone modes.
process.env.TZ = "Europe/Stockholm";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DisplayTimezoneProvider } from "../../../../DisplayTimezone/DisplayTimezoneContext";
import { saveDisplayTimezone } from "../../../../../products/display-timezone";
import AuroraSummary from "./AuroraSummary";

import { COULDNT_LOAD_COPY, STALE_DATA_NOTICE } from "../offline/offline";

const SUMMARY_KEY = "sw:aurora-now:summary:v1";

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockFetch = vi.fn();

// Deterministic feeds. Speed 280.85 km/s → L1→Earth transit ≈ 89 min, so
// "Arriving now" reads the measurement taken ~89 min before the freshest
// one. Mag rows put an ACTIVE gate (−2 nT) at the arriving-now instant and
// a STORM-range gate (−15 nT) 30 min later, so the time-ahead selector
// visibly changes the gate sentence.
const SPEED = 280.85;
const TRANSIT = Math.round(1_500_000 / SPEED / 60); // 89
const OBSERVED_TIME = "2026-08-25T12:00:00";
const observedFixture = JSON.stringify([
  { time_tag: "2026-08-25T06:00:00", Kp: 1.33, a_running: 5, station_count: 8 },
  { time_tag: OBSERVED_TIME, Kp: 1, a_running: 4, station_count: 8 },
]);
const WIND_LATEST = Date.parse("2026-08-26T23:26:07Z");
const windRows = Array.from({ length: 121 }, (_, i) => ({
  time_tag: new Date(WIND_LATEST - (120 - i) * 60_000)
    .toISOString()
    .slice(0, 19),
  proton_speed: SPEED,
  proton_density: 8.3,
  source: "IMAP",
}));
const windFixture = JSON.stringify(windRows);
const magRows = Array.from({ length: 121 }, (_, i) => {
  const ms = WIND_LATEST - (120 - i) * 60_000;
  // The gate: −2 nT (active) through the arriving-now instant, then
  // −15 nT (storm range) for the readings arriving later – the step sits
  // 28 min past arriving-now so the ±2.5 min windows around "now" and
  // "in ~30 min" each land fully inside one band.
  const arrivingNowMs = WIND_LATEST - TRANSIT * 60_000;
  return {
    time_tag: new Date(ms).toISOString().slice(0, 19),
    bt: 3,
    bz_gsm: ms < arrivingNowMs + 28 * 60_000 ? -2 : -15,
  };
});
const magFixture = JSON.stringify(magRows);

beforeEach(() => {
  localStorage.clear();
  mockFetch.mockReset();
  mockFetch.mockImplementation((url: string) => {
    const u = typeof url === "string" ? url : "";
    if (u.includes("noaa-planetary-k-index.json"))
      return Promise.resolve({ ok: true, text: async () => observedFixture });
    if (u.includes("rtsw_wind_1m.json"))
      return Promise.resolve({ ok: true, text: async () => windFixture });
    if (u.includes("rtsw_mag_1m.json"))
      return Promise.resolve({ ok: true, text: async () => magFixture });
    return Promise.resolve({ ok: true, text: async () => "" });
  });
  vi.stubGlobal("fetch", mockFetch);
});

const renderSummary = () =>
  render(
    <QueryClientProvider client={queryClient()}>
      <DisplayTimezoneProvider>
        <AuroraSummary />
      </DisplayTimezoneProvider>
    </QueryClientProvider>,
  );

describe("Aurora Now plain-language summary (human decision 2026-09-12)", () => {
  it("renders one concise paragraph summing up Kp, stream and gate – no hemispheric power", async () => {
    renderSummary();
    await waitFor(() =>
      expect(screen.getByText(/Aurora intensity is currently low/i)).toBeInTheDocument(),
    );
    const paragraph = () =>
      screen.getByText(/Aurora intensity is currently low/i).closest("p")!;
    await waitFor(() =>
      expect(paragraph().textContent).toMatch(/running slow and calm/),
    );
    await waitFor(() =>
      expect(paragraph().textContent).toMatch(/cracked open/),
    );
    // HP was dropped from the interpreter (human decision: OVATION's
    // synthesis of the same inputs, expert card only).
    expect(paragraph().textContent).not.toMatch(/Energy is/i);
  });

  it("carries no caveat line and no sources line", async () => {
    renderSummary();
    await waitFor(() =>
      expect(screen.getByText(/Aurora intensity is currently low/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText(/approximate averages/i)).toBeNull();
    expect(screen.queryByText(/Sources:/i)).toBeNull();
  });

  it("always renders the full paragraph open, with no Read more button or clamp", async () => {
    renderSummary();
    await waitFor(() =>
      expect(screen.getByText(/Aurora intensity is currently low/i)).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: "Read more" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Read less" })).toBeNull();
    expect(
      document.querySelector(".aurora-now__summary__text--clamped"),
    ).toBeNull();
    expect(
      document.querySelector(".aurora-now__summary__text"),
    ).not.toBeNull();
    // The summary preference storage is gone with the toggle.
    expect(localStorage.getItem(SUMMARY_KEY)).toBeNull();
  });

  it("defaults the stream reading to arriving now and offers offsets up to the transit horizon", async () => {
    renderSummary();
    await waitFor(() =>
      expect(screen.getByText(/Aurora intensity is currently low/i)).toBeInTheDocument(),
    );
    // Default "Arriving now": the gate at the arriving-now instant is −2 →
    // active level, not the storm-range value measured later upstream.
    expect(screen.getByText(/cracked open/i).textContent).not.toMatch(/open wide/);
    const select = screen.getByRole("combobox", {
      name: "Summary",
    }) as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options[0]).toBe("0");
    expect(options).toContain("15");
    expect(options).toContain("30");
    expect(options).toContain(String(TRANSIT));
    expect(options[options.length - 1]).toBe(String(TRANSIT));
  });

  it("switches the stream and gate sentences to the reading arriving at the chosen offset", async () => {
    const user = userEvent.setup();
    renderSummary();
    await waitFor(() =>
      expect(screen.getByText(/Aurora intensity is currently low/i)).toBeInTheDocument(),
    );
    const select = screen.getByRole("combobox", {
      name: "Summary",
    });
    await user.selectOptions(select, "30");
    // +30 min ahead: the −15 nT reading is the one arriving → storm range.
    await waitFor(() =>
      expect(screen.getByText(/open wide/i).textContent).toMatch(/drive a storm/),
    );
  });

  it("hides the selector when no stream reading can anchor an offset", async () => {
    mockFetch.mockImplementation((url: string) => {
      const u = typeof url === "string" ? url : "";
      if (u.includes("noaa-planetary-k-index.json"))
        return Promise.resolve({ ok: true, text: async () => observedFixture });
      if (u.includes("rtsw_wind_1m.json"))
        return Promise.resolve({
          ok: true,
          text: async () => JSON.stringify([{ time_tag: "2026-08-26T23:26:07" }]),
        });
      if (u.includes("rtsw_mag_1m.json"))
        return Promise.resolve({ ok: true, text: async () => magFixture });
      return Promise.resolve({ ok: true, text: async () => "" });
    });
    renderSummary();
    await waitFor(() =>
      expect(screen.getByText(/Aurora intensity is currently low/i)).toBeInTheDocument(),
    );
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getAllByText(/No data right now\./i).length).toBeGreaterThan(0);
  });

  it("marks the summary as showing saved data when the browser is offline", async () => {
    renderSummary();
    await waitFor(() =>
      expect(screen.getByText(/Aurora intensity is currently low/i)).toBeInTheDocument(),
    );
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getAllByText(STALE_DATA_NOTICE).length).toBeGreaterThanOrEqual(1);
  });

  it("never shows the couldn't-load copy mid-paragraph: a pending feed's sentence is omitted", async () => {
    // At first paint every feed is pending: the paragraph must not read
    // "Couldn't load – connect to refresh" between its sentences.
    renderSummary();
    expect(screen.queryByText(COULDNT_LOAD_COPY)).toBeNull();
    await waitFor(() =>
      expect(screen.getByText(/Aurora intensity is currently low/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText(COULDNT_LOAD_COPY)).toBeNull();
  });

  it("reads no data for a feed that failed for good, never the loading copy", async () => {
    mockFetch.mockImplementation((url: string) => {
      const u = typeof url === "string" ? url : "";
      if (u.includes("rtsw_mag_1m.json"))
        return Promise.resolve({
          ok: false,
          status: 500,
          text: async () => "",
        } as Response);
      if (u.includes("noaa-planetary-k-index.json"))
        return Promise.resolve({ ok: true, text: async () => observedFixture });
      if (u.includes("rtsw_wind_1m.json"))
        return Promise.resolve({ ok: true, text: async () => windFixture });
      return Promise.resolve({ ok: true, text: async () => "" });
    });
    renderSummary();
    await waitFor(() =>
      expect(screen.getByText(/running slow and calm/i)).toBeInTheDocument(),
    );
    // The failed gate feed reads the honest missing-data sentence.
    expect(screen.getByText(/No data right now\./i)).toBeInTheDocument();
    expect(screen.queryByText(COULDNT_LOAD_COPY)).toBeNull();
  });

  it("keeps one real update timestamp across every selector interval", async () => {
    const user = userEvent.setup();
    renderSummary();
    await waitFor(() =>
      expect(screen.getByText(/Aurora intensity is currently low/i)).toBeInTheDocument(),
    );
    // The As-of is the feed's freshest reading (oldest of the two L1
    // feeds' freshest: mag at 23:26:01Z), never the selected offset's
    // anchor instant – it must not move when the selector moves.
    const asOfText = () => screen.getByText(/^As of /).textContent;
    const before = asOfText()!;
    expect(before).toMatch(/Aug 27 01:26/); // 23:26:01Z in the pinned zone
    const select = screen.getByRole("combobox", { name: "Summary" });
    await user.selectOptions(select, "30");
    await waitFor(() =>
      expect(screen.getByText(/open wide/i).textContent).toMatch(/drive a storm/),
    );
    expect(asOfText()).toBe(before);
    await user.selectOptions(select, String(TRANSIT));
    await waitFor(() =>
      expect(asOfText()).toBe(before),
    );
  });

  it("carries one As-of freshness line for the summary", async () => {
    renderSummary();
    await waitFor(() =>
      expect(screen.getAllByText(/^As of /)).toHaveLength(1),
    );
    // UTC mode keeps the suffix; the same reading, one clock per fact.
    saveDisplayTimezone(localStorage, "utc");
    cleanup();
    renderSummary();
    await waitFor(() =>
      expect(screen.getByText(/As of .* UTC\. Updated/)).toBeInTheDocument(),
    );
  });
});
