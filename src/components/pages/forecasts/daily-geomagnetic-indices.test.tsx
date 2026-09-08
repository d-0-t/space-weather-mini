// The Issued line renders in the device time zone in Local mode, so the
// suite pins one (Sweden, UTC+2) to keep every expectation deterministic.
process.env.TZ = "Europe/Stockholm";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import fixture from "../../../products/fixtures/daily-geomagnetic-indices.txt?raw";
import { saveDisplayTimezone } from "../../../products/display-timezone";
import { DisplayTimezoneProvider } from "../../DisplayTimezone/DisplayTimezoneContext";
import DailyGeomagneticIndices from "./daily-geomagnetic-indices";

const queryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true, text: async () => fixture });
  vi.stubGlobal("fetch", mockFetch);
  localStorage.clear();
});

const renderPage = () =>
  render(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter>
        <DisplayTimezoneProvider>
          <DailyGeomagneticIndices />
        </DisplayTimezoneProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

const seedUtc = () => saveDisplayTimezone(localStorage, "utc");

describe("DailyGeomagneticIndices page", () => {
  it("fetches the product and renders the semantic table with all 30 days", async () => {
    renderPage();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("daily-geomagnetic-indices.txt")
    );

    const table = await screen.findByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(32); // 2 header rows + 30
    expect(
      within(table).getByRole("columnheader", { name: /Fredericksburg/ })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: /planetary/i })
    ).toBeInTheDocument();
  });

  it("shows one Issued line in Local mode – the device clock, plain label, author – without a refresh control", async () => {
    renderPage();
    expect(await screen.findByText(/Aug 23 20:30/)).toBeInTheDocument();
    expect(screen.getByText("Issued:")).toBeInTheDocument();
    expect(screen.queryByText("Issued (UTC):")).toBeNull();
    expect(screen.queryByText("Issued (local):")).toBeNull();
    expect(
      screen.getByText(/Prepared by the U\.S\. Dept\. of Commerce/)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows one Issued line in UTC mode – the NOAA clock with suffix and the (UTC) label", async () => {
    seedUtc();
    renderPage();
    expect(await screen.findByText(/Aug 23 18:30 UTC/)).toBeInTheDocument();
    expect(screen.getByText("Issued (UTC):")).toBeInTheDocument();
    expect(screen.queryByText("Issued (local):")).toBeNull();
  });

  it("renders a chart with an accessible label above the table", async () => {
    renderPage();
    const table = await screen.findByRole("table");
    const chart = screen.getByRole("img", {
      name: /largest daily kp index per station/i,
    });
    expect(chart).toBeInTheDocument();
    expect(chart.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps the UTC date cells and shows the muted UTC-days note above the table in Local mode", async () => {
    renderPage();
    const note = await screen.findByText(
      "Dates are NOAA's UTC days. They may not match your device's dates.",
    );
    const table = await screen.findByRole("table");
    // The note sits directly above the table it qualifies
    expect(
      note.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // Date cells stay the NOAA UTC days in Local mode
    expect(within(table).getAllByRole("cell").at(0)).toHaveTextContent(
      "2026 07 25",
    );
  });

  it("keeps the UTC date cells and shows no note in UTC mode", async () => {
    seedUtc();
    renderPage();
    const table = await screen.findByRole("table");
    expect(screen.queryByText(/UTC days/)).toBeNull();
    // Date cells stay the NOAA UTC days in UTC mode too
    expect(within(table).getAllByRole("cell").at(0)).toHaveTextContent(
      "2026 07 25",
    );
  });

  it("shows a plain error message when the fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));
    renderPage();
    expect(
      await screen.findByText(/couldn't load the daily geomagnetic indices/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});