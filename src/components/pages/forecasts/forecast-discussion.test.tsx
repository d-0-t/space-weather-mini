import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import fixture from "../../../products/fixtures/forecast-discussion.txt?raw";
import ForecastDiscussion from "./forecast-discussion";

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
        <ForecastDiscussion />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe("ForecastDiscussion page", () => {
  it("fetches the product and renders the four section headings", async () => {
    renderPage();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("discussion.txt"));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Forecast Discussion" })
    ).toBeInTheDocument();
    for (const title of [
      "Solar Activity",
      "Energetic Particle",
      "Solar Wind",
      "Geospace",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name: title })).toBeInTheDocument();
    }
  });

  it("renders the summary and forecast prose for each section", async () => {
    renderPage();
    expect(
      await screen.findByText(/Region 4513 \(N04E32/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/M-flares \(R1-R2\/Minor-Moderate\)/)
    ).toBeInTheDocument();
    expect(screen.getByText(/2 MeV electron flux reached high levels/)).toBeInTheDocument();
    expect(screen.getByText(/quiet levels under an ambient solar wind/)).toBeInTheDocument();
    const summaryHeadings = screen.getAllByRole("heading", { level: 3, name: "Day Summary" });
    expect(summaryHeadings).toHaveLength(4);
  });

  it("shows the issued details (UTC, local, author) without a refresh control", async () => {
    renderPage();
    expect(await screen.findByText(/2026 Aug 23 1230 UTC/)).toBeInTheDocument();
    expect(screen.getByText("Issued (UTC):")).toBeInTheDocument();
    expect(screen.getByText("Issued (local):")).toBeInTheDocument();
    expect(
      screen.getByText(/Prepared by the U\.S\. Dept\. of Commerce/)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a plain error message when the fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));
    renderPage();
    expect(
      await screen.findByText(/couldn't load the forecast discussion/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});