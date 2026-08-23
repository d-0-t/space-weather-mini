import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../../../products/fixtures/daily-geomagnetic-indices.txt?raw";
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
});

const renderPage = () =>
  render(
    <QueryClientProvider client={queryClient()}>
      <DailyGeomagneticIndices />
    </QueryClientProvider>
  );

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

  it("shows the issued details (UTC, local, author) without a refresh control", async () => {
    renderPage();
    expect(await screen.findByText(/1830 UT 23 Aug 2026/)).toBeInTheDocument();
    expect(screen.getByText("Issued (UTC):")).toBeInTheDocument();
    expect(screen.getByText("Issued (local):")).toBeInTheDocument();
    expect(
      screen.getByText(/Prepared by the U\.S\. Dept\. of Commerce/)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
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

  it("shows a plain error message when the fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));
    renderPage();
    expect(
      await screen.findByText(/couldn't load the daily geomagnetic indices/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});