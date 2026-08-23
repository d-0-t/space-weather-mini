import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("shows the issued timestamp and a manual refresh control", async () => {
    renderPage();
    expect(await screen.findByText("2026 Aug 17 0058 UTC")).toBeInTheDocument();
    expect(screen.getByText("As of:")).toBeInTheDocument();

    const refresh = screen.getByRole("button", { name: /refresh/i });
    mockFetch.mockClear();
    await userEvent.click(refresh);
    expect(mockFetch).toHaveBeenCalled();
  });

  it("renders a chart with an accessible label alongside the table", async () => {
    renderPage();
    await screen.findByRole("table");
    expect(screen.getByRole("img", { name: /radio flux and a index trend/i })).toBeInTheDocument();
  });

  it("shows an error state with retry when the fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));
    renderPage();
    expect(await screen.findByText(/couldn't load the 27-day outlook/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("retries the fetch when the user clicks Try again", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));
    renderPage();
    const retry = await screen.findByRole("button", { name: /try again/i });
    mockFetch.mockClear();
    await userEvent.click(retry);
    expect(mockFetch).toHaveBeenCalled();
  });

  it("keeps the last data visible and shows an inline notice when a refresh fails", async () => {
    renderPage();
    await screen.findByRole("table");
    mockFetch.mockRejectedValue(new Error("network down"));
    await userEvent.click(screen.getByRole("button", { name: /refresh/i }));
    expect(await screen.findByText(/couldn't refresh the 27-day outlook/i)).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});