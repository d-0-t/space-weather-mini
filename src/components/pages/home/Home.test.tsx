import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  it("renders the Dashboard heading", () => {
    renderHome();
    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
  });

  it("toggles compact chart view from the Dashboard header", async () => {
    const user = userEvent.setup();
    const { container } = renderHome();
    const toggle = screen.getByRole("checkbox", { name: "Compact view" });
    const root = container.querySelector(".home")!;
    expect(root).not.toHaveClass("home--compact");

    await user.click(toggle);
    expect(toggle).toBeChecked();
    expect(root).toHaveClass("home--compact");

    await user.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(root).not.toHaveClass("home--compact");
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

  it("collapses and expands panels via the chevron toggle", async () => {
    const user = userEvent.setup();
    renderHome();
    await waitFor(() =>
      expect(
        screen.getByRole("img", { name: /Aurora Forecast.*North Pole/i }),
      ).toBeInTheDocument(),
    );
    const toggle = screen.getByRole("button", { name: /^Aurora Now$/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("img", { name: /Aurora Forecast.*North Pole/i }),
    ).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("img", { name: /Aurora Forecast.*North Pole/i }),
    ).toBeInTheDocument();
  });

  it("collapses a panel on Escape and keeps focus on the toggle", async () => {
    const user = userEvent.setup();
    renderHome();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /^Forecast$/i }),
      ).toBeInTheDocument(),
    );
    const toggle = screen.getByRole("button", { name: /^Forecast$/i });
    toggle.focus();
    await user.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });
});