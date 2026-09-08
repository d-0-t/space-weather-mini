// The Issued line renders in the device time zone in Local mode, so the
// suite pins one (Sweden, UTC+2) to keep every expectation deterministic.
process.env.TZ = "Europe/Stockholm";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import fixture from "../../../products/fixtures/27-day-outlook.txt?raw";
import { saveDisplayTimezone } from "../../../products/display-timezone";
import { DisplayTimezoneProvider } from "../../DisplayTimezone/DisplayTimezoneContext";
import TwentySevenDayOutlook from "./27-day-outlook";

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
          <TwentySevenDayOutlook />
        </DisplayTimezoneProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

const seedUtc = () => saveDisplayTimezone(localStorage, "utc");

describe("TwentySevenDayOutlook page", () => {
  it("fetches the product and renders the semantic table with all 27 rows", async () => {
    renderPage();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("27-day-outlook.txt"));

    const table = await screen.findByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(28);
    expect(within(table).getByRole("columnheader", { name: /Radio Flux/ })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: /Largest Kp Index/ })).toBeInTheDocument();
  });

  it("shows one Issued line in Local mode – the device clock, plain label, author – without a refresh control", async () => {
    renderPage();
    expect(await screen.findByText(/Aug 17 02:58/)).toBeInTheDocument();
    expect(screen.getByText("Issued:")).toBeInTheDocument();
    expect(screen.queryByText("Issued (UTC):")).toBeNull();
    expect(screen.queryByText("Issued (local):")).toBeNull();
    expect(
      screen.getByText(/Prepared by the US Dept\. of Commerce/)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows one Issued line in UTC mode – the NOAA clock with suffix and the (UTC) label", async () => {
    seedUtc();
    renderPage();
    expect(await screen.findByText(/Aug 17 00:58 UTC/)).toBeInTheDocument();
    expect(screen.getByText("Issued (UTC):")).toBeInTheDocument();
    expect(screen.queryByText("Issued (local):")).toBeNull();
  });

  it("renders a chart with an accessible label above the table", async () => {
    renderPage();
    const table = await screen.findByRole("table");
    const chart = screen.getByRole("img", {
      name: /kp index trend.*moon illumination/i,
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
      "2026 Aug 17",
    );
  });

  it("keeps the UTC date cells and shows no note in UTC mode", async () => {
    seedUtc();
    renderPage();
    const table = await screen.findByRole("table");
    expect(screen.queryByText(/UTC days/)).toBeNull();
    // Date cells stay the NOAA UTC days in UTC mode too
    expect(within(table).getAllByRole("cell").at(0)).toHaveTextContent(
      "2026 Aug 17",
    );
  });

  it("shows a plain error message when the fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));
    renderPage();
    expect(await screen.findByText(/couldn't load the 27-day outlook/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("keeps the last data visible when a background refetch fails", async () => {
    const client = queryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <DisplayTimezoneProvider>
            <TwentySevenDayOutlook />
          </DisplayTimezoneProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
    await screen.findByRole("table");
    mockFetch.mockRejectedValue(new Error("network down"));
    await act(async () => {
      await client.refetchQueries({ queryKey: ["27-day-outlook"] });
    });
    expect(await screen.findByText(/couldn't refresh the 27-day outlook/i)).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});