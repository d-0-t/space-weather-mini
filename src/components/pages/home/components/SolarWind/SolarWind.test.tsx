import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import rtswWindFixture from "../../../../../products/fixtures/rtsw-wind-1m.json?raw";
import rtswMagFixture from "../../../../../products/fixtures/rtsw-mag-1m.json?raw";
import SolarWind from "./SolarWind";

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockImplementation((url: string) => {
    const u = typeof url === "string" ? url : "";
    if (u.includes("rtsw_wind_1m.json"))
      return Promise.resolve({ ok: true, text: async () => rtswWindFixture });
    if (u.includes("rtsw_mag_1m.json"))
      return Promise.resolve({ ok: true, text: async () => rtswMagFixture });
    return Promise.resolve({ ok: true, text: async () => "" });
  });
  vi.stubGlobal("fetch", mockFetch);
});

const renderSolarWind = () =>
  render(
    <QueryClientProvider client={queryClient()}>
      <SolarWind />
    </QueryClientProvider>,
  );

describe("SolarWind", () => {
  it("renders the L1 mini chart cards with latest values", async () => {
    renderSolarWind();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /Solar Wind/ }),
      ).toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getByText("Speed")).toBeInTheDocument());
    for (const title of ["Speed", "Particle density", "Bt", "Bz"]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getAllByText(/km\/s/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/p\/cm³/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/nT/).length).toBeGreaterThan(0);
  });

  it("labels Bz as South for the reading closest to Now and North for positive", async () => {
    // Mag rows spanning well before the Now reading (transit ≈ 88 min), all
    // southward, so the headline shows the value arriving at Earth now.
    const rows: { time_tag: string; bt: number; bz_gsm: number }[] = [];
    const start = Date.UTC(2026, 7, 26, 19, 0, 0);
    for (let i = 0; i <= 185; i++) {
      rows.push({
        time_tag: new Date(start + i * 60_000).toISOString().slice(0, 19),
        bt: 3.1,
        bz_gsm: -2.3,
      });
    }
    const south = JSON.stringify(rows);
    mockFetch.mockImplementation((url: string) => {
      const u = typeof url === "string" ? url : "";
      if (u.includes("rtsw_mag_1m.json"))
        return Promise.resolve({ ok: true, text: async () => south });
      if (u.includes("rtsw_wind_1m.json"))
        return Promise.resolve({ ok: true, text: async () => rtswWindFixture });
      return Promise.resolve({ ok: true, text: async () => "" });
    });
    renderSolarWind();
    await waitFor(() => expect(screen.getByText("Speed")).toBeInTheDocument());
    expect(screen.getAllByText(/-2\.3/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/South/).length).toBeGreaterThan(0);
  });

  it("labels every chart with a descriptive aria-label", async () => {
    renderSolarWind();
    await waitFor(() =>
      expect(
        screen.getByRole("img", { name: /solar wind speed.*2 hours before now/i }),
      ).toBeInTheDocument(),
    );
    for (const label of [
      /solar wind speed.*2 hours before now/i,
      /proton density.*2 hours before now/i,
      /total magnetic field strength bt.*2 hours before now/i,
      /bz gsm magnetic field.*2 hours before now/i,
    ]) {
      expect(screen.getByRole("img", { name: label })).toBeInTheDocument();
    }
  });

  it("explains every chart in a native collapsible help toggle", async () => {
    const user = userEvent.setup();
    renderSolarWind();
    await waitFor(() => expect(screen.getByText("Speed")).toBeInTheDocument());
    // One "?" help per card – 4 cards, all collapsible via native <details>
    const helps = document.querySelectorAll(".live-panel__help");
    expect(helps.length).toBeGreaterThanOrEqual(4);
    expect(screen.getAllByText("?").length).toBeGreaterThanOrEqual(4);
    // Per-card sr-only labels
    expect(screen.getByText("About solar wind")).toBeInTheDocument();
    expect(screen.getByText("About particle density")).toBeInTheDocument();
    expect(screen.getByText("About Bt")).toBeInTheDocument();
    expect(screen.getByText("About Bz")).toBeInTheDocument();
    for (const details of Array.from(helps)) {
      expect(details).toHaveProperty("open", false);
    }
    // Opening the Speed help reveals its compact scale
    const speedHelp = screen
      .getByText("Speed")
      .closest("section")!
      .querySelector(".live-panel__help")! as HTMLDetailsElement;
    await user.click(speedHelp.querySelector("summary")!);
    expect(speedHelp.open).toBe(true);
    expect(speedHelp.querySelector("li b")?.textContent).toBe("< 400 km/s");
    expect(speedHelp.textContent).toMatch(/900 km\/s.*very high/);
    // Escape closes it and returns focus to the "?" trigger
    await user.keyboard("{Escape}");
    expect(speedHelp.open).toBe(false);
    expect(speedHelp.querySelector("summary")).toHaveFocus();
    // Clicking toggles it open and closed again
    await user.click(speedHelp.querySelector("summary")!);
    expect(speedHelp.open).toBe(true);
    await user.click(speedHelp.querySelector("summary")!);
    expect(speedHelp.open).toBe(false);
  });

  it("explains the propagation delay behind the Now line", async () => {
    renderSolarWind();
    await waitFor(() => expect(screen.getByText("Speed")).toBeInTheDocument());
    // Fixture speed ~280 km/s → transit ≈ 89 minutes, source IMAP
    expect(screen.getByText(/We are \d+ minutes behind/)).toBeInTheDocument();
    expect(
      screen.getByText(/IMAP's data, based on solar wind speed/),
    ).toBeInTheDocument();
  });

  it("explains Bt and Bz as the interplanetary magnetic field components", async () => {
    const user = userEvent.setup();
    renderSolarWind();
    await waitFor(() => expect(screen.getByText("Bt")).toBeInTheDocument());
    const btHelp = screen
      .getByText("Bt")
      .closest("section")!
      .querySelector(".live-panel__help")! as HTMLDetailsElement;
    await user.click(btHelp.querySelector("summary")!);
    expect(btHelp.textContent).toMatch(
      /Interplanetary magnetic field \(IMF\), Bt component/i,
    );
    expect(btHelp.textContent).toMatch(/strength of the Sun's magnetic field/);
    const bzHelp = screen
      .getByText("Bz")
      .closest("section")!
      .querySelector(".live-panel__help")! as HTMLDetailsElement;
    await user.click(bzHelp.querySelector("summary")!);
    expect(bzHelp.textContent).toMatch(
      /Interplanetary magnetic field \(IMF\), Bz \(GSM\) component/i,
    );
    expect(bzHelp.textContent).toMatch(/southward \(negative\) Bz/i);
  });

  it("attributes the panel to NOAA/SWPC in its footer", async () => {
    renderSolarWind();
    await waitFor(() => expect(screen.getByText("Speed")).toBeInTheDocument());
    const link = screen.getByRole("link", { name: "NOAA/SWPC" });
    expect(link).toHaveAttribute("href", "https://www.swpc.noaa.gov/");
  });

  it("shows the error branch when the core solar wind feeds fail", async () => {
    mockFetch.mockImplementation((url: string) => {
      const u = typeof url === "string" ? url : "";
      if (u.includes("rtsw")) {
        return Promise.resolve({
          ok: false,
          status: 500,
          text: async () => "",
        } as Response);
      }
      return Promise.resolve({ ok: true, text: async () => "" });
    });
    renderSolarWind();
    await waitFor(() =>
      expect(
        screen.getByText(/Couldn't load space weather/i),
      ).toBeInTheDocument(),
    );
  });
});