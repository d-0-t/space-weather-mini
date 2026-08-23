import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import fixture from "../../../products/fixtures/weekly-report.txt?raw";
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
});

const renderPage = () =>
  render(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter>
        <WeeklyReport />
      </MemoryRouter>
    </QueryClientProvider>
  );

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

  it("shows the issued details (UTC, local, author) without a refresh control", async () => {
    renderPage();
    expect(await screen.findByText(/2026 Aug 17 0058 UTC/)).toBeInTheDocument();
    expect(screen.getByText("Issued (UTC):")).toBeInTheDocument();
    expect(screen.getByText("Issued (local):")).toBeInTheDocument();
    expect(
      screen.getByText(/Prepared by the US Dept\. of Commerce/)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
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
