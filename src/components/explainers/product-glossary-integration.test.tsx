import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
import { DisplayTimezoneProvider } from "../DisplayTimezone/DisplayTimezoneContext";
import { getGlossaryEntry } from "./glossary";

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
      <MemoryRouter>
        <DisplayTimezoneProvider>{ui}</DisplayTimezoneProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

/** A term is a popup control now, never a link that navigates away. */
const expectGlossaryTerm = (name: RegExp): void => {
  expect(screen.getByRole("button", { name })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name })).toBeNull();
};

describe("Product pages offer inline glossary popups", () => {
  it("27-day outlook explains radio flux, A index and Kp index", async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => fixture27 });
    renderWithRouter(<TwentySevenDayOutlook />);
    expect(await screen.findByText(/27-Day Outlook/)).toBeInTheDocument();
    expectGlossaryTerm(/radio flux/i);
    expectGlossaryTerm(/a index/i);
    expectGlossaryTerm(/^kp index$/i);
  });

  it("opens the shared entry verbatim and links to the full glossary", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({ ok: true, text: async () => fixture27 });
    renderWithRouter(<TwentySevenDayOutlook />);
    expect(await screen.findByText(/27-Day Outlook/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /radio flux/i }));
    expect(screen.getByText(getGlossaryEntry("radio-flux")!.body)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /read the full glossary/i }),
    ).toHaveAttribute("href", "/explainers#radio-flux");
  });

  it("daily geomagnetic indices explains Kp index and A index", async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => fixtureDaily });
    renderWithRouter(<DailyGeomagneticIndices />);
    expect(await screen.findByText(/Daily Geomagnetic Indices/)).toBeInTheDocument();
    expectGlossaryTerm(/kp index/i);
    expectGlossaryTerm(/a index/i);
  });

  it("3-day forecast explains geomagnetic activity, solar radiation storm and radio blackout", async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => fixture3Day });
    renderWithRouter(<ThreeDayForecast />);
    expect(await screen.findByText(/3-Day Forecast/)).toBeInTheDocument();
    expectGlossaryTerm(/geomagnetic activity/i);
    expectGlossaryTerm(/solar radiation storm/i);
    expectGlossaryTerm(/radio blackout/i);
  });

  it("forecast discussion explains geospace", async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => fixtureDiscussion });
    renderWithRouter(<ForecastDiscussion />);
    expect(await screen.findByText(/Forecast Discussion/)).toBeInTheDocument();
    expectGlossaryTerm(/geospace/i);
  });

  it("weekly report explains its own product", async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => fixtureWeekly });
    renderWithRouter(<WeeklyReport />);
    expect(await screen.findByText(/Weekly Report/)).toBeInTheDocument();
    expectGlossaryTerm(/weekly report/i);
  });

  it("geophysical alert explains its own product without linking away", async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => fixtureAlert });
    renderWithRouter(<GeophysicalAlert />);
    expect(
      await screen.findByText(/Geophysical Observations and Predictions/),
    ).toBeInTheDocument();
    expectGlossaryTerm(/geophysical alert/i);
  });
});

describe("App navigation exposes the explainers entry", () => {
  it("navigation contains a link to /explainers", async () => {
    const { default: Nav } = await import("../navigation/Nav");
    const { DisplayTimezoneProvider } = await import(
      "../DisplayTimezone/DisplayTimezoneContext"
    );
    render(
      <MemoryRouter>
        <DisplayTimezoneProvider>
          <Nav />
        </DisplayTimezoneProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /explainers/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/explainers"),
    );
  });
});
