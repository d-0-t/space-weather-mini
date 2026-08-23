import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../../../products/fixtures/27-day-outlook.txt?raw";
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
});

const renderPage = () =>
  render(
    <QueryClientProvider client={queryClient()}>
      <TwentySevenDayOutlook />
    </QueryClientProvider>
  );

describe("TwentySevenDayOutlook page", () => {
  it("fetches the product and renders the semantic table with all 27 rows", async () => {
    renderPage();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("27-day-outlook.txt"));

    const table = await screen.findByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(28);
    expect(within(table).getByRole("columnheader", { name: /Radio Flux/ })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: /Largest Kp Index/ })).toBeInTheDocument();
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

  it("renders a chart with an accessible label above the table", async () => {
    renderPage();
    const table = await screen.findByRole("table");
    const chart = screen.getByRole("img", { name: /radio flux, a index and kp index trend/i });
    expect(chart).toBeInTheDocument();
    expect(chart.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
        <TwentySevenDayOutlook />
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