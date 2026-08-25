import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import threeDayFixture from "../../products/fixtures/3-day-forecast.txt?raw";
import Home from "./Home";

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

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

const renderHome = () =>
  render(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("Home", () => {
  it("renders the Home heading and introduction", () => {
    renderHome();
    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
    expect(screen.getByText(/Welcome to the mini space weather forecast page/)).toBeInTheDocument();
  });

  it("shows a placeholder link to the typed geophysical alert page instead of the legacy embed", async () => {
    renderHome();
    expect(screen.getByRole("heading", { level: 2, name: "Geophysical Alert" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Geophysical Alert page/ })).toHaveAttribute(
      "href",
      "/forecasts/geoalert",
    );
    // No legacy h2 from the old GeoAlert embed
    expect(screen.queryByText(/Geophysical Observations and Predictions/)).not.toBeInTheDocument();
  });

  it("renders the aurora forecast images", () => {
    renderHome();
    expect(screen.getByAltText(/Aurora Forecast.*North Pole/i)).toBeInTheDocument();
    expect(screen.getByAltText(/Aurora Forecast.*South Pole/i)).toBeInTheDocument();
  });
});
