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
import { ovationJson } from "../../../../../test/ovation-test-utils";
import AuroraSummary from "./AuroraSummary";

import { COULDNT_LOAD_COPY, STALE_DATA_NOTICE } from "../offline/offline";

// The Moon gate is driven deterministically (its own suites pin the ephemeris);
// by default the Moon is down so the extra caveat sentence stays out.
let mockMoonUp = false;
let mockIllumination = 0;
vi.mock("../../../../../data/moon", () => ({
  isMoonAboveHorizon: () => mockMoonUp,
}));
vi.mock("../../../../moon/moon", () => ({
  moonIllumination: () => mockIllumination,
}));

const SUMMARY_KEY = "sw:aurora-now:summary:v1";

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockFetch = vi.fn();

// Deterministic feeds. Speed 280.85 km/s → L1→Earth transit ≈ 89 min, so
// "Arriving now" reads the measurement taken ~89 min before the freshest
// one. Mag rows put an ACTIVE field (−2 nT) at the arriving-now instant
// and a STORM-range field (−15 nT) 30 min later, so the time-ahead
// selector visibly changes the merged L1 sentence.
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
  // The field: −2 nT (weakly right) through the arriving-now instant,
  // then −15 nT (strongly right) for the readings arriving later – the
  // step sits 28 min past arriving-now so the ±2.5 min windows around
  // "now" and "in ~30 min" each land fully inside one band.
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
  mockMoonUp = false;
  mockIllumination = 0;
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

/** The summary paragraph – the mark spans split the text, so match a
 * function instead of a text node. */
const paragraph = () =>
  screen
    .getAllByText(
      (_, node) =>
        node instanceof Element &&
        node.classList.contains("aurora-now__summary__text"),
    )
    .at(-1)!
    .closest("p")!;

const waitForParagraph = async () =>
  waitFor(() =>
    expect(paragraph().textContent).toMatch(/Aurora intensity is currently/),
  );

describe("Aurora Now plain-language summary (human decisions 2026-09-12/13)", () => {
  it("renders one concise paragraph summing up Kp plus the merged stream-and-field sentence – no hemispheric power", async () => {
    renderSummary();
    await waitForParagraph();
    await waitFor(() =>
      expect(paragraph().textContent).toMatch(/running slow/),
    );
    await waitFor(() =>
      expect(paragraph().textContent).toMatch(/weakly toward aurora/),
    );
    // Two sentences total: Kp + the merged L1 sentence.
    expect(paragraph().textContent).toMatch(/magnetic field/);
    // HP was dropped from the interpreter (human decision: OVATION's
    // synthesis of the same inputs, expert card only).
    expect(paragraph().textContent).not.toMatch(/Energy is/i);
  });

  it("carries no caveat line and no sources line", async () => {
    renderSummary();
    await waitForParagraph();
    expect(screen.queryByText(/approximate averages/i)).toBeNull();
    expect(screen.queryByText(/Sources:/i)).toBeNull();
  });

  it("always renders the full paragraph open, with no Read more button or clamp", async () => {
    renderSummary();
    await waitForParagraph();
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

  it("defaults the L1 reading to now and offers offsets up to the transit horizon, each with its verdict word", async () => {
    renderSummary();
    await waitForParagraph();
    // Default "Now": the field at the arriving-now instant is
    // −2 → weakly right, not the storm-range value measured later upstream.
    expect(paragraph().textContent).toMatch(/weakly toward aurora/);
    const select = screen.getByRole("combobox", {
      name: "Summary",
    }) as HTMLSelectElement;
    const labels = Array.from(select.options).map((o) => o.textContent ?? "");
    // "Arriving now" is plain "Now", and every option carries its
    // strongest-driver verdict word. The fixture's now-reading (280 km/s
    // slow, thin, −2 nT weakly-right, Kp 1) grades faint, not moderate.
    expect(labels[0]).toBe("Now – faint");
    expect(labels).toContain("In 15 min – faint");
    expect(labels).toContain("In 30 min – moderate");
    expect(labels[labels.length - 1]).toBe(
      `In ${TRANSIT} min (latest) – moderate`,
    );
    const options = Array.from(select.options).map((o) => o.value);
    expect(options[0]).toBe("0");
    expect(options).toContain("15");
    expect(options).toContain("30");
    expect(options).toContain(String(TRANSIT));
    expect(options[options.length - 1]).toBe(String(TRANSIT));
  });

  it("switches the merged L1 sentence to the reading arriving at the chosen offset", async () => {
    const user = userEvent.setup();
    renderSummary();
    await waitForParagraph();
    const select = screen.getByRole("combobox", {
      name: "Summary",
    });
    await user.selectOptions(select, "30");
    // +30 min ahead: the −15 nT reading is the one arriving → storm range.
    await waitFor(() =>
      expect(paragraph().textContent).toMatch(/pushing hard/),
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
    await waitForParagraph();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getAllByText(/No data right now\./i).length).toBeGreaterThan(0);
  });

  it("marks the summary as showing saved data when the browser is offline", async () => {
    renderSummary();
    await waitForParagraph();
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
    await waitForParagraph();
    expect(screen.queryByText(COULDNT_LOAD_COPY)).toBeNull();
  });

  it("reads no data when either L1 feed failed for good, never the loading copy", async () => {
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
    // The failed mag feed pulls the whole merged sentence to the honest
    // missing-data row – never a half sentence – so only the Kp line and
    // the missing-data copy render.
    await waitFor(() =>
      expect(screen.getByText(/No data right now\./i)).toBeInTheDocument(),
    );
    expect(paragraph().textContent).toMatch(/Aurora intensity is currently/);
    expect(paragraph().textContent).not.toMatch(/running slow/);
    expect(screen.queryByText(COULDNT_LOAD_COPY)).toBeNull();
  });

  it("keeps one real update timestamp across every selector interval", async () => {
    const user = userEvent.setup();
    renderSummary();
    await waitForParagraph();
    // The As-of is the feed's freshest reading (oldest of the two L1
    // feeds' freshest: mag at 23:26:01Z), never the selected offset's
    // anchor instant – it must not move when the selector moves.
    const asOfText = () => screen.getByText(/^As of /).textContent;
    const before = asOfText()!;
    expect(before).toMatch(/Aug 27 01:26/); // 23:26:01Z in the pinned zone
    const select = screen.getByRole("combobox", { name: "Summary" });
    await user.selectOptions(select, "30");
    await waitFor(() =>
      expect(paragraph().textContent).toMatch(/pushing hard/),
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

  it("appends the view-distance reach as the summary's last sentence", async () => {
    // The default place is Luleå; a qualifying cell on it reads Nearby.
    mockFetch.mockImplementation((url: string) => {
      const u = typeof url === "string" ? url : "";
      if (u.includes("noaa-planetary-k-index.json"))
        return Promise.resolve({ ok: true, text: async () => observedFixture });
      if (u.includes("rtsw_wind_1m.json"))
        return Promise.resolve({ ok: true, text: async () => windFixture });
      if (u.includes("rtsw_mag_1m.json"))
        return Promise.resolve({ ok: true, text: async () => magFixture });
      if (u.includes("ovation_aurora_latest.json"))
        return Promise.resolve({
          ok: true,
          text: async () => ovationJson([[22.1546, 65.5848, 12]]),
        });
      return Promise.resolve({ ok: true, text: async () => "" });
    });
    renderSummary();
    await waitForParagraph();
    await waitFor(() =>
      expect(paragraph().textContent).toMatch(
        /Nearest glow 0-100 km away \(Likely\)\.$/,
      ),
    );
  });

  it("warns about the Moon only while it is up and lit enough", async () => {
    mockMoonUp = true;
    mockIllumination = 0.1;
    renderSummary();
    await waitForParagraph();
    expect(paragraph().textContent).not.toMatch(/Moon is up/);
    cleanup();
    mockMoonUp = true;
    mockIllumination = 1;
    renderSummary();
    await waitFor(() =>
      expect(paragraph().textContent).toMatch(
        /The Moon is up and can wash out faint aurora\./,
      ),
    );
  });
});
