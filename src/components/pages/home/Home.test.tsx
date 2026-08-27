import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import threeDayFixture from "../../../products/fixtures/3-day-forecast.txt?raw";
import kpObservedFixture from "../../../products/fixtures/noaa-planetary-k-index.json?raw";
import kpForecastFixture from "../../../products/fixtures/noaa-planetary-k-index-forecast.json?raw";
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
    if (
      typeof url === "string" &&
      url.includes("noaa-planetary-k-index-forecast.json")
    ) {
      return Promise.resolve({ ok: true, text: async () => kpForecastFixture });
    }
    if (typeof url === "string" && url.includes("noaa-planetary-k-index.json")) {
      return Promise.resolve({ ok: true, text: async () => kpObservedFixture });
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
  it("renders the Home heading", () => {
    renderHome();
    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
  });

  it("renders the aurora forecast images", async () => {
    renderHome();
    await waitFor(() =>
      expect(
        screen.getAllByAltText(/Aurora Forecast.*North Pole/i).length,
      ).toBeGreaterThan(0),
    );
    expect(
      screen.getAllByAltText(/Aurora Forecast.*South Pole/i).length,
    ).toBeGreaterThan(0);
  });

  it("renders the Aurora Now and Forecast panels", async () => {
    renderHome();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /^Aurora Now$/i }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("heading", { name: /^Forecast$/i }),
    ).toBeInTheDocument();
  });
});