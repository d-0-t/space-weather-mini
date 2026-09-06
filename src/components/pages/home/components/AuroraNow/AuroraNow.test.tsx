import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import kpObservedFixture from "../../../../../products/fixtures/noaa-planetary-k-index.json?raw";
import kirunaFixture from "../../../../../data/fixtures/nominatim-kiruna.json";
import AuroraNow from "./AuroraNow";
import { AlertsProvider } from "../Alerts/AlertsContext";
import {
  COULDNT_LOAD_COPY,
  STALE_DATA_NOTICE,
} from "../offline/offline";
import { PLACE_STORAGE_KEY } from "../../../../../data/place-storage";
import { saveViewDistanceThreshold } from "../../../../../products/view-distance";
import {
  jsonResponse,
} from "../../../../../test/nominatim-test-utils";
import { ovationJson } from "../../../../../test/ovation-test-utils";

const queryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockFetch = vi.fn();

/** The synthetic Oval grid the OVATION fetch mock serves; tests override it. */
let ovationGrid: Array<[number, number, number]> = [
  [0, 70, 3],
  [10, 65, 8],
];

/** Seeds the stored geocoded place (the one shared key, versioned). */
const seedPlace = (place: Record<string, unknown>): void => {
  localStorage.setItem(
    PLACE_STORAGE_KEY,
    JSON.stringify({ v: 1, place }),
  );
};

/** Oslo – far enough from the default grid for a clean Not-in-range. */
const OSLO_PLACE = {
  displayName: "Oslo, Norway",
  shortName: "Oslo",
  latitude: 59.9139,
  longitude: 10.7522,
  fetchedAt: "2026-09-04T12:00:00Z",
};

beforeEach(() => {
  // Fix today to Aug26 2026 (Wednesday) UTC so moon phase is deterministic
  vi.useFakeTimers({ toFake: ["Date"] } as unknown as Parameters<typeof vi.useFakeTimers>[0]);
  vi.setSystemTime(new Date("2026-08-26T12:00:00Z"));
  localStorage.clear();
  ovationGrid = [
    [0, 70, 3],
    [10, 65, 8],
  ];
  mockFetch.mockReset();
  mockFetch.mockImplementation((url: string) => {
    const u = typeof url === "string" ? url : "";
    if (u.includes("noaa-planetary-k-index.json")) return Promise.resolve({ ok: true, text: async () => kpObservedFixture });
    if (u.includes("ovation_aurora_latest.json"))
      return Promise.resolve({ ok: true, text: async () => ovationJson(ovationGrid) });
    return Promise.resolve({ ok: true, text: async () => "" });
  });
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.useRealTimers();
});

const renderAuroraNow = () =>
  render(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter>
        <AlertsProvider>
          <AuroraNow />
        </AlertsProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("AuroraNow", () => {
  it("renders heading Aurora Now, current Kp with bar and the oval glow", async () => {
    renderAuroraNow();
    await waitFor(() => expect(screen.getByRole("heading", { name: /^Aurora Now$/i })).toBeInTheDocument());
    await waitFor(() => expect(document.querySelector(".kp-bar")).toBeInTheDocument());
    expect(document.querySelector(".aurora-now__current")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getAllByRole("img", { name: /oval glow/i }),
      ).toHaveLength(1),
    );
  });

  it("derives the current 3h slot label from the observed time_tag", async () => {
    renderAuroraNow();
    await waitFor(() => expect(document.querySelector(".kp-bar")).toBeInTheDocument());
    // Fixture's latest observed reading is at 12:00 UTC → the 12-15 UT slot
    expect(screen.getByText("12:00 - 15:00 UTC")).toBeInTheDocument();
  });

  it("shows the current moon phase emoji in a help popover with sr-only label", async () => {
    const user = userEvent.setup();
    renderAuroraNow();
    await waitFor(() =>
      expect(document.querySelector(".kp-bar")).toBeInTheDocument(),
    );
    const moon = document.querySelector(
      ".live-panel__help--moon",
    ) as HTMLDetailsElement;
    expect(moon).not.toBeNull();
    // Fake system time is 2026-08-26T12:00Z → Waxing gibbous
    expect(
      screen.getByText("Current Moon phase: Waxing gibbous"),
    ).toBeInTheDocument();
    expect(moon.querySelector("[aria-hidden='true']")!.textContent).toBe("🌔");
    // The popover explains the phase and why it matters for aurora
    await user.click(moon.querySelector("summary")!);
    expect(moon.open).toBe(true);
    expect(moon.querySelector(".live-panel__popover")?.textContent).toMatch(
      /Waxing gibbous/,
    );
    expect(moon.querySelector(".live-panel__popover")?.textContent).toMatch(
      /darkest skies around the new moon/,
    );
  });

  it("attributes the oval forecast images to the NOAA aurora product page", async () => {
    renderAuroraNow();
    await waitFor(() => expect(document.querySelector(".kp-bar")).toBeInTheDocument());
    const source = screen.getByRole("link", { name: /^NOAA\/SWPC$/ });
    expect(source.getAttribute("href")).toBe(
      "https://www.swpc.noaa.gov/products/aurora-30-minute-forecast",
    );
  });

  it("shows the freshness line as 'As of {time}. Updated {age}.', no bullet", async () => {
    renderAuroraNow();
    await waitFor(() => expect(document.querySelector(".kp-bar")).toBeInTheDocument());
    // Fixture's latest observed reading is at 2026-08-25T12:00:00
    expect(
      screen.getByText(/As of Aug 25 12:00 UTC\. Updated/),
    ).toBeInTheDocument();
  });

  it("shows the stale notice with saved data when the browser goes offline", async () => {
    renderAuroraNow();
    await waitFor(() => expect(document.querySelector(".kp-bar")).toBeInTheDocument());
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getAllByText(STALE_DATA_NOTICE).length).toBeGreaterThanOrEqual(1);
  });

  it("shows the plain never-cached error when the Kp feed never loaded", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({ ok: false, status: 500, text: async () => "" }),
    );
    renderAuroraNow();
    await waitFor(() =>
      expect(screen.getByText(COULDNT_LOAD_COPY)).toBeInTheDocument(),
    );
  });

  it("embeds the Oval glow with Forecast Time", async () => {
    renderAuroraNow();
    await waitFor(() => expect(document.querySelector(".kp-bar")).toBeInTheDocument());
    await waitFor(() =>
      expect(
        screen.getAllByRole("img", { name: /oval glow/i }),
      ).toHaveLength(1),
    );
    expect(
      screen.getByText(/Forecast Time Sep 4 14:33 UTC/i),
    ).toBeInTheDocument();
  });

  it("renders the band line: info, place in text and one Change location button", async () => {
    // Oslo with a qualifying cell half a degree north (~56 km) => likely.
    seedPlace(OSLO_PLACE);
    ovationGrid = [[10.7522, 60.4139, 12]];
    renderAuroraNow();
    await waitFor(() => expect(document.querySelector(".kp-bar")).toBeInTheDocument());
    await screen.findByText(/Aurora likely/);
    // The probability card: info and place as text, the shared modal behind
    // one Change location button.
    const text = document.querySelector(
      ".view-distance__probability__location__text",
    );
    expect(text?.textContent).toContain("Aurora likely");
    expect(text?.textContent).toContain("Oslo");
    const change = screen.getByRole("button", { name: "Change location" });
    expect(change).toHaveClass("btn--secondary");
    expect(screen.queryByRole("button", { name: /Oslo/ })).toBeNull();
  });

  it("reads not in range without a preposition and in lowercase", async () => {
    // Oslo is ~1180 km from the only grid cell: out of range.
    seedPlace(OSLO_PLACE);
    ovationGrid = [[20.2253, 68.3558, 12]];
    renderAuroraNow();
    await waitFor(() => expect(document.querySelector(".kp-bar")).toBeInTheDocument());
    await screen.findByText(/Aurora not in range/);
    // The card's own text never uses a preposition - `from`/`at` do not
    // work for every band; the place reads below the band, lowercase.
    const text = document.querySelector(
      ".view-distance__probability__location__text",
    );
    expect(text?.textContent).toMatch(/Aurora not in range/);
    expect(text?.textContent).not.toMatch(/from|at /);
    expect(text?.textContent).toContain("Oslo");
  });

  it("opens the shared Change location modal from the Change location button", async () => {
    const user = userEvent.setup();
    seedPlace(OSLO_PLACE);
    renderAuroraNow();
    await waitFor(() => expect(document.querySelector(".kp-bar")).toBeInTheDocument());
    const change = await screen.findByRole("button", { name: "Change location" });
    await user.click(change);
    const dialog = document.querySelector(
      "dialog.place-finder__modal",
    ) as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(
      screen.getByRole("heading", { name: "Change location" }),
    ).toBeInTheDocument();
  });

  it("explains the band behind the (i) popover with the band table", async () => {
    const user = userEvent.setup();
    seedPlace(OSLO_PLACE);
    renderAuroraNow();
    await waitFor(() => expect(document.querySelector(".kp-bar")).toBeInTheDocument());
    const info = await screen.findByTitle("About view distance");
    await user.click(info);
    const popover = document.querySelector(
      ".view-distance__popover",
    ) as HTMLElement;
    expect(popover).not.toBeNull();
    // The full band table with confidence per band.
    expect(popover.textContent).toContain("Overhead / Nearby ~0-100 km – Likely");
    expect(popover.textContent).toContain("Distant ~100-300 km – Possible");
    expect(popover.textContent).toContain("Far ~300-600 km – Unlikely");
    expect(popover.textContent).toContain("Over 600 km – Not in range");
  });

  it("recomputes the band when a place picked in the modal is applied", async () => {
    const user = userEvent.setup();
    // Oslo is ~1180 km from the only grid cell, which sits ~56 km from
    // Kiruna: the line must flip from not in range to likely after the pick.
    seedPlace(OSLO_PLACE);
    ovationGrid = [[20.2253, 68.3558, 12]];
    mockFetch.mockImplementation((input: unknown) => {
      const url = new URL(String(input));
      if (url.host === "nominatim.openstreetmap.org")
        return Promise.resolve(jsonResponse(kirunaFixture));
      return Promise.resolve({
        ok: true,
        text: async () =>
          url.href.includes("noaa-planetary-k-index.json")
            ? kpObservedFixture
            : ovationJson(ovationGrid),
      });
    });
    renderAuroraNow();
    await waitFor(() => expect(document.querySelector(".kp-bar")).toBeInTheDocument());
    expect(
      await screen.findByText(/Aurora not in range/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Change location" }));
    await user.type(
      screen.getByRole("searchbox", { name: "Search for a place" }),
      "Kiruna",
    );
    await user.click(screen.getByRole("button", { name: "Search" }));
    await user.click(screen.getAllByRole("radio")[0]);
    await user.click(screen.getByRole("button", { name: "Apply and close" }));
    expect(await screen.findByText(/Aurora likely/)).toBeInTheDocument();
    expect(
      document.querySelector(
        ".view-distance__probability__location__text",
      )?.textContent,
    ).toContain("Kiruna");
  });

  it("keeps the freshness once - the oval line above, no second As of below", async () => {
    // The user removed the duplicated As-of line: the oval's
    // `Forecast Time ... lead.` is the one freshness surface.
    seedPlace(OSLO_PLACE);
    ovationGrid = [[10.7522, 60.4139, 12]];
    renderAuroraNow();
    await waitFor(() => expect(document.querySelector(".kp-bar")).toBeInTheDocument());
    await screen.findByText(/Aurora likely/);
    expect(await screen.findByText(/Forecast Time Sep 4 14:33 UTC/)).toBeInTheDocument();
    expect(screen.queryByText(/As of Sep 4 14:33 UTC/)).toBeNull();
  });

  it("honors the stored view distance threshold", async () => {
    // Aurora 5 is below the default threshold 6 (not in range); once the
    // versioned stored threshold is 5, the next mount reads likely.
    seedPlace(OSLO_PLACE);
    ovationGrid = [[10.7522, 60.4139, 5]];
    renderAuroraNow();
    await waitFor(() => expect(document.querySelector(".kp-bar")).toBeInTheDocument());
    expect(
      await screen.findByText(/Aurora not in range/),
    ).toBeInTheDocument();
    cleanup();
    saveViewDistanceThreshold(localStorage, 5);
    renderAuroraNow();
    expect(
      await screen.findByText(/Aurora likely/),
    ).toBeInTheDocument();
  });
});
