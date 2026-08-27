import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import threeDayFixture from "../../../../../products/fixtures/3-day-forecast.txt?raw";
import kpObservedFixture from "../../../../../products/fixtures/noaa-planetary-k-index.json?raw";
import kpForecastFixture from "../../../../../products/fixtures/noaa-planetary-k-index-forecast.json?raw";
import Forecast from "./Forecast";

const queryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockFetch = vi.fn();

beforeEach(() => {
  // Fix today to Aug26 2026 (Wednesday) UTC so table is deterministic: Aug26,27,28
  vi.useFakeTimers({ toFake: ["Date"] } as unknown as Parameters<typeof vi.useFakeTimers>[0]);
  vi.setSystemTime(new Date("2026-08-26T12:00:00Z"));
  mockFetch.mockReset();
  mockFetch.mockImplementation((url: string) => {
    const u = typeof url === "string" ? url : "";
    if (u.includes("noaa-planetary-k-index-forecast.json")) return Promise.resolve({ ok: true, text: async () => kpForecastFixture });
    if (u.includes("noaa-planetary-k-index.json")) return Promise.resolve({ ok: true, text: async () => kpObservedFixture });
    if (u.includes("3-day-forecast.txt")) return Promise.resolve({ ok: true, text: async () => threeDayFixture });
    return Promise.resolve({ ok: true, text: async () => "" });
  });
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.useRealTimers();
});

const renderForecast = () =>
  render(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter>
        <Forecast />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("Forecast", () => {
  it("renders heading Forecast with the merged Kp chart and min/max table", async () => {
    renderForecast();
    await waitFor(() => expect(screen.getByRole("heading", { name: /^Forecast$/i })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("table", { name: /Kp-index forecast/i })).toBeInTheDocument());
    expect(document.querySelector(".forecast__chart")).toBeInTheDocument();
    expect(screen.getByText(/Full 3-day forecast/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Daily observations/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Kp/).length).toBeGreaterThan(0);
  });

  it("renders from planetary JSON even when the 3-day text product fails", async () => {
    mockFetch.mockImplementation((url: string) => {
      const u = typeof url === "string" ? url : "";
      if (u.includes("3-day-forecast.txt")) {
        return Promise.resolve({
          ok: false,
          status: 500,
          text: async () => "",
        } as Response);
      }
      if (u.includes("noaa-planetary-k-index-forecast.json"))
        return Promise.resolve({ ok: true, text: async () => kpForecastFixture });
      if (u.includes("noaa-planetary-k-index.json"))
        return Promise.resolve({ ok: true, text: async () => kpObservedFixture });
      return Promise.resolve({ ok: true, text: async () => "" });
    });
    renderForecast();
    await waitFor(() => expect(screen.getByRole("table", { name: /Kp-index forecast/i })).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: /^Forecast$/i })).toBeInTheDocument();
  });

  it("formats day labels with weekday and DD/MM on two lines from planetary JSON", async () => {
    renderForecast();
    await waitFor(() => expect(screen.getByRole("table", { name: /Kp-index forecast/i })).toBeInTheDocument());
    // Mini table now derived from noaa-planetary-k-index-forecast.json predicted (Aug26-28)
    // – contains Aug28 already, while 3-day-forecast.txt lags (Aug25-27)
    const rowHeaders = screen.getAllByRole("rowheader");
    expect(rowHeaders).toHaveLength(3);
    // Aug26 2026 is Wednesday, 27 Thursday, 28 Friday
    expect(rowHeaders[0].textContent).toMatch(/Wednesday/);
    expect(rowHeaders[0].textContent).toMatch(/26\/08/);
    expect(rowHeaders[0].innerHTML).toMatch(/<br/i);
    expect(rowHeaders[1].textContent).toMatch(/Thursday/);
    expect(rowHeaders[1].textContent).toMatch(/27\/08/);
    expect(rowHeaders[2].textContent).toMatch(/Friday/);
    expect(rowHeaders[2].textContent).toMatch(/28\/08/);
    // Ensure Aug28 from JSON is present and old 3-day text's Aug23 is not
    expect(screen.queryByText(/23\/08/)).not.toBeInTheDocument();
  });

  it("formats chart XAxis as 'Mon DD\\nHH:MM'", async () => {
    renderForecast();
    await waitFor(() => expect(document.querySelector(".forecast__chart")).toBeInTheDocument());
    const { formatChartLabel } = await import("../kp-panel/kp-panel");
    expect(formatChartLabel("2026-08-18T00:00:00")).toBe("Aug 18\n00:00");
    expect(formatChartLabel("2026-08-19T12:00:00")).toBe("Aug 19\n12:00");
  });

  it("renders the ENLIL video preview that opens a full-size modal", async () => {
    const user = userEvent.setup();
    renderForecast();
    await waitFor(() => expect(screen.getByRole("table", { name: /Kp-index forecast/i })).toBeInTheDocument());
    expect(
      screen.getByRole("heading", { name: /Predicted solar wind/i }),
    ).toBeInTheDocument();
    // One muted preview (tile) plus one controlled copy (modal)
    const videos = document.querySelectorAll("video");
    expect(videos.length).toBe(2);
    const [tile, modal] = Array.from(videos);
    expect(tile!.getAttribute("src")).toBe(
      "https://spaceweather.irf.se/data/swpc_enlil.mp4",
    );
    expect(tile!.hasAttribute("controls")).toBe(false);
    expect(modal!.getAttribute("src")).toBe(
      "https://spaceweather.irf.se/data/swpc_enlil.mp4",
    );
    expect(modal!.hasAttribute("controls")).toBe(true);
    // Clicking the preview opens the modal; Escape closes it
    const dialog = document.querySelector(
      "dialog.image-modal",
    ) as HTMLDialogElement;
    expect(dialog.open).toBe(false);
    await user.click(
      screen.getByRole("button", {
        name: /predicted solar wind video, full size/i,
      }),
    );
    expect(dialog.open).toBe(true);
    await user.keyboard("{Escape}");
    expect(dialog.open).toBe(false);
  });

  it("explains the video in a visible caption pointing to the forecast panels", async () => {
    renderForecast();
    await waitFor(() => expect(screen.getByRole("table", { name: /Kp-index forecast/i })).toBeInTheDocument());
    expect(
      screen.getByText(/Visualization of the predicted solar wind speed/i),
    ).toBeInTheDocument();
    const outlookLinks = screen.getAllByRole("link", {
      name: /27-day outlook/i,
    });
    expect(outlookLinks.length).toBeGreaterThan(0);
    expect(outlookLinks[0]!.getAttribute("href")).toBe("/forecasts/27days");
    const threeDayLinks = screen.getAllByRole("link", {
      name: /3-day forecast/i,
    });
    expect(threeDayLinks.length).toBeGreaterThan(0);
    expect(threeDayLinks[0]!.getAttribute("href")).toBe("/forecasts/3days");
  });

  it("closes the modal with the X button carrying a Close label", async () => {
    const user = userEvent.setup();
    renderForecast();
    await waitFor(() => expect(screen.getByRole("table", { name: /Kp-index forecast/i })).toBeInTheDocument());
    await user.click(
      screen.getByRole("button", {
        name: /predicted solar wind video, full size/i,
      }),
    );
    const close = screen.getByRole("button", { name: /^Close$/ });
    expect(close.querySelector("span[aria-hidden]")?.textContent).toBe("×");
    expect(close.querySelector(".sr-only")?.textContent).toBe("Close");
    expect(close.getAttribute("title")).toBe("Close");
    await user.click(close);
    const dialog = document.querySelector(
      "dialog.image-modal",
    ) as HTMLDialogElement;
    expect(dialog.open).toBe(false);
  });

  it("links the IRF source with the ENLIL forecast page", async () => {
    renderForecast();
    await waitFor(() => expect(screen.getByRole("table", { name: /Kp-index forecast/i })).toBeInTheDocument());
    const source = screen.getByRole("link", { name: /^IRF$/ });
    expect(source.getAttribute("href")).toBe(
      "https://spaceweather.irf.se/forecast/enlil/",
    );
    expect(source.getAttribute("target")).toBe("_blank");
  });

  it("attributes the Kp data to NOAA/SWPC", async () => {
    renderForecast();
    await waitFor(() => expect(screen.getByRole("table", { name: /Kp-index forecast/i })).toBeInTheDocument());
    const source = screen.getByRole("link", { name: /^NOAA\/SWPC$/ });
    expect(source.getAttribute("href")).toBe("https://www.swpc.noaa.gov/");
  });
});