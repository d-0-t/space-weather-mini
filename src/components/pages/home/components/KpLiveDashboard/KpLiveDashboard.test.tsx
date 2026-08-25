import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import kpObservedFixture from "../../../../../products/fixtures/noaa-planetary-k-index.json?raw";
import kpForecastFixture from "../../../../../products/fixtures/noaa-planetary-k-index-forecast.json?raw";
import KpLiveDashboard from "./KpLiveDashboard";

const queryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockImplementation((url: string) => {
    const u = typeof url === "string" ? url : "";
    if (u.includes("noaa-planetary-k-index-forecast.json")) return Promise.resolve({ ok: true, text: async () => kpForecastFixture });
    if (u.includes("noaa-planetary-k-index.json")) return Promise.resolve({ ok: true, text: async () => kpObservedFixture });
    return Promise.resolve({ ok: true, text: async () => "" });
  });
  vi.stubGlobal("fetch", mockFetch);
});

const renderDashboard = () =>
  render(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter>
        <KpLiveDashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("KpLiveDashboard", () => {
  it("renders Kp Live heading and charts", async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByRole("img", { name: /Kp index observed history/ })).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: /Kp Live/i })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /Kp observed history/i })).toBeInTheDocument();
  });
});
