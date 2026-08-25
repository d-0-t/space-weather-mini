import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import threeDayFixture from "../../../../../products/fixtures/3-day-forecast.txt?raw";
import Live from "./Live";

const queryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockImplementation((url: string) => {
    if (typeof url === "string" && url.includes("3-day-forecast.txt")) {
      return Promise.resolve({ ok: true, text: async () => threeDayFixture });
    }
    return Promise.resolve({ ok: true, text: async () => "" });
  });
  vi.stubGlobal("fetch", mockFetch);
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
    await waitFor(() => expect(screen.getByText(/Current:/)).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: /^Live$/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /on scale 0 to 9/ })).toBeInTheDocument();
  });

  it("renders min/max table with weekday labels and Kp- values", async () => {
    renderLive();
    await waitFor(() => expect(screen.getByRole("table", { name: /Kp-index forecast \| Min \| Max/i })).toBeInTheDocument());
    expect(screen.getByText(/Full 3-day forecast/)).toBeInTheDocument();
    // Check dash formatting
    expect(screen.getAllByText(/Kp-/).length).toBeGreaterThan(0);
  });

  it("formats day labels as weekday - DD/MM", async () => {
    renderLive();
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    // For fixture Aug 23 2026 is Sunday
    expect(screen.getByText(/Sunday - 23\/08/)).toBeInTheDocument();
  });
});
