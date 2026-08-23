import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import fixture27 from "../../products/fixtures/27-day-outlook.txt?raw";
import fixtureDaily from "../../products/fixtures/daily-geomagnetic-indices.txt?raw";
import fixture3Day from "../../products/fixtures/3-day-forecast.txt?raw";
import fixtureDiscussion from "../../products/fixtures/forecast-discussion.txt?raw";
import fixtureWeekly from "../../products/fixtures/weekly-report.txt?raw";
import fixtureAlert from "../../products/fixtures/geophysical-alert.txt?raw";

import TwentySevenDayOutlook from "../pages/forecasts/27-day-outlook";
import DailyGeomagneticIndices from "../pages/forecasts/daily-geomagnetic-indices";
import ThreeDayForecast from "../pages/forecasts/3-day-forecast";
import ForecastDiscussion from "../pages/forecasts/forecast-discussion";
import WeeklyReport from "../pages/forecasts/weekly-report";
import GeophysicalAlert from "../pages/forecasts/geophysical-alert";

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

const renderWithRouter = (ui: React.ReactNode) =>
  render(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );

describe("Product pages link to the explainers glossary", () => {
  it("27-day outlook links to radio flux, A index and Kp index explainers", async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => fixture27 });
    renderWithRouter(<TwentySevenDayOutlook />);
    expect(await screen.findByText(/27-Day Outlook/)).toBeInTheDocument();
    // At least one glossary term link per relevant concept
    expect(screen.getByRole("link", { name: /radio flux/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/explainers#radio-flux"),
    );
    expect(screen.getByRole("link", { name: /a index/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/explainers#a-index"),
    );
    expect(screen.getByRole("link", { name: /^kp index$/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/explainers#kp-index"),
    );
  });

  it("daily geomagnetic indices links to Kp index and A index explainers", async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => fixtureDaily });
    renderWithRouter(<DailyGeomagneticIndices />);
    expect(await screen.findByText(/Daily Geomagnetic Indices/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /kp index/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/explainers#kp-index"),
    );
    expect(screen.getByRole("link", { name: /a index/i })).toBeInTheDocument();
  });

  it("3-day forecast links to geomagnetic activity, solar radiation storm and radio blackout explainers", async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => fixture3Day });
    renderWithRouter(<ThreeDayForecast />);
    expect(await screen.findByText(/3-Day Forecast/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /geomagnetic activity/i }),
    ).toHaveAttribute("href", expect.stringContaining("/explainers#geomagnetic-activity"));
    expect(
      screen.getByRole("link", { name: /solar radiation storm/i }),
    ).toHaveAttribute("href", expect.stringContaining("/explainers#solar-radiation-storm"));
    expect(
      screen.getByRole("link", { name: /radio blackout/i }),
    ).toHaveAttribute("href", expect.stringContaining("/explainers#radio-blackout"));
  });

  it("forecast discussion links to geospace explainer", async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => fixtureDiscussion });
    renderWithRouter(<ForecastDiscussion />);
    expect(await screen.findByText(/Forecast Discussion/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /geospace/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/explainers#geospace"),
    );
  });

  it("weekly report links to its explainer", async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => fixtureWeekly });
    renderWithRouter(<WeeklyReport />);
    expect(await screen.findByText(/Weekly Report/)).toBeInTheDocument();
    // Weekly report page should link back to the weekly report definition
    const links = screen.getAllByRole("link");
    expect(links.some((l) => (l.getAttribute("href") ?? "").includes("/explainers"))).toBe(true);
  });

  it("geophysical alert links to its explainer", async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => fixtureAlert });
    renderWithRouter(<GeophysicalAlert />);
    expect(await screen.findByText(/Geophysical Observations and Predictions/)).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links.some((l) => (l.getAttribute("href") ?? "").includes("/explainers"))).toBe(true);
  });
});

describe("App navigation exposes the explainers entry", () => {
  it("navigation contains a link to /explainers", async () => {
    const { default: Nav } = await import("../navigation/Nav");
    render(
      <MemoryRouter>
        <Nav />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /explainers/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/explainers"),
    );
  });
});
