import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import threeDayFixture from "../../../products/fixtures/3-day-forecast.txt?raw";
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
  it("renders the Home heading", () => {
    renderHome();
    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
  });

  it("renders the aurora forecast images", () => {
    renderHome();
    expect(screen.getByAltText(/Aurora Forecast.*North Pole/i)).toBeInTheDocument();
    expect(screen.getByAltText(/Aurora Forecast.*South Pole/i)).toBeInTheDocument();
  });

  it("renders the Live panel", async () => {
    renderHome();
    expect(screen.getByRole("heading", { name: /^Live$/i })).toBeInTheDocument();
  });
});
