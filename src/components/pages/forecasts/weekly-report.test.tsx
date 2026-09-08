// The Issued line renders in the device time zone in Local mode, so the
// suite pins one (Sweden, UTC+2) to keep every expectation deterministic.
process.env.TZ = "Europe/Stockholm";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import fixture from "../../../products/fixtures/weekly-report.txt?raw";
import { saveDisplayTimezone } from "../../../products/display-timezone";
import { DisplayTimezoneProvider } from "../../DisplayTimezone/DisplayTimezoneContext";
import WeeklyReport from "./weekly-report";

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
          <WeeklyReport />
        </DisplayTimezoneProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

const seedUtc = () => saveDisplayTimezone(localStorage, "utc");

describe("WeeklyReport page", () => {
  it("fetches the product and renders the weekly report heading and section headings", async () => {
    renderPage();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("weekly.txt"));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Weekly Report" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Highlights of Solar and Geomagnetic Activity",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Forecast of Solar and Geomagnetic Activity",
      })
    ).toBeInTheDocument();
  });

  it("renders the Highlights date range and prose for each section", async () => {
    renderPage();
    expect(await screen.findByText("10 - 16 August 2026")).toBeInTheDocument();
    expect(
      screen.getByText("17 August - 12 September 2026")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Solar activity ranged from very low to low levels/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No proton events were observed at geosynchronous orbit/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Geomagnetic field activity is expected to reach active levels on/
      )
    ).toBeInTheDocument();
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

  it("shows a plain error message when the fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));
    renderPage();
    expect(
      await screen.findByText(/couldn't load the weekly report/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
