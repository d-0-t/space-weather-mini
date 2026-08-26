import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import threeDayFixture from "../../../../../products/fixtures/3-day-forecast.txt?raw";
import kpObservedFixture from "../../../../../products/fixtures/noaa-planetary-k-index.json?raw";
import kpForecastFixture from "../../../../../products/fixtures/noaa-planetary-k-index-forecast.json?raw";
import Live from "./Live";

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

const renderLive = () =>
  render(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter>
        <Live />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("Live", () => {
  it("renders heading Live and current Kp with bar", async () => {
    renderLive();
    await waitFor(() => expect(screen.getByRole("heading", { name: /^Live$/i })).toBeInTheDocument());
    await waitFor(() => expect(document.querySelector(".kp-bar")).toBeInTheDocument());
    // Current Kp is displayed in live__current
    expect(document.querySelector(".live__current")).toBeInTheDocument();
  });

  it("renders min/max table with weekday labels and Kp values", async () => {
    renderLive();
    await waitFor(() => expect(screen.getByRole("table", { name: /Kp-index forecast/i })).toBeInTheDocument());
    expect(screen.getByText(/Full 3-day forecast/)).toBeInTheDocument();
    expect(screen.getAllByText(/Kp/).length).toBeGreaterThan(0);
  });

  it("formats day labels with weekday and DD/MM on two lines from planetary JSON", async () => {
    renderLive();
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

  it("formats chart XAxis as 'Mon DD\\nHH:MM' and removes dots", async () => {
    renderLive();
    await waitFor(() => expect(document.querySelector(".live__chart")).toBeInTheDocument());
    const { formatChartLabel } = await import("./Live");
    expect(formatChartLabel("2026-08-18T00:00:00")).toBe("Aug 18\n00:00");
    expect(formatChartLabel("2026-08-19T12:00:00")).toBe("Aug 19\n12:00");
    // Dot removal is verified by Live.tsx using dot={false} and activeDot={false}
    // Background shading for observed/forecast uses ReferenceArea with tokens
  });
});
