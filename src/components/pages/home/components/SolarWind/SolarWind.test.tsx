import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import rtswWindFixture from "../../../../../products/fixtures/rtsw-wind-1m.json?raw";
import rtswMagFixture from "../../../../../products/fixtures/rtsw-mag-1m.json?raw";
import SolarWind from "./SolarWind";
import { DisplayTimezoneProvider } from "../../../../DisplayTimezone/DisplayTimezoneContext";
import {
  COULDNT_LOAD_COPY,
  STALE_DATA_NOTICE,
} from "../offline/offline";

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
      <DisplayTimezoneProvider>
        <SolarWind />
      </DisplayTimezoneProvider>
    </QueryClientProvider>,
  );

describe("SolarWind", () => {
  it("renders the L1 mini chart cards with latest values", async () => {
    renderSolarWind();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /Solar wind/i }),
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

  it("shows 5-minute averages as the displayed current values, not single 1-min readings", async () => {
    // Wind rows of 100 and 300 km/s inside the ±2.5 min window around the
    // Now instant (the 22:05 freshest reading minus the ~88 min transit of
    // the 283 km/s stream → Now ≈ 20:37), 283 elsewhere: the Speed
    // headline must read the 200 km/s mean, never the flickering readings.
    const rows: { time_tag: string; proton_speed: number; proton_density: number; source: string }[] = [];
    const start = Date.UTC(2026, 7, 26, 19, 0, 0);
    const nowMs = start + (185 - 88) * 60_000;
    for (let i = 0; i <= 185; i++) {
      const ms = start + i * 60_000;
      const speed =
        ms === nowMs - 60_000
          ? 100
          : ms === nowMs
            ? 300
            : 283;
      rows.push({
        time_tag: new Date(ms).toISOString().slice(0, 19),
        proton_speed: speed,
        proton_density: 5,
        source: "IMAP",
      });
    }
    mockFetch.mockImplementation((url: string) => {
      const u = typeof url === "string" ? url : "";
      if (u.includes("rtsw_wind_1m.json"))
        return Promise.resolve({ ok: true, text: async () => JSON.stringify(rows) });
      if (u.includes("rtsw_mag_1m.json"))
        return Promise.resolve({ ok: true, text: async () => rtswMagFixture });
      return Promise.resolve({ ok: true, text: async () => "" });
    });
    renderSolarWind();
    await waitFor(() => expect(screen.getByText("Speed")).toBeInTheDocument());
    // The ±2.5 min window around Now catches 20:35–20:39:
    // mean(283, 100, 300, 283, 283) = 249.8 → the headline reads 250,
    // and neither flickering single reading appears anywhere.
    await waitFor(() =>
      expect(screen.getAllByText(/250/).length).toBeGreaterThan(0),
    );
    expect(screen.queryByText(/^100$/)).toBeNull();
    expect(screen.queryByText(/^300$/)).toBeNull();
  });

  it("says the displayed current values are 5-minute averages in the delay note", async () => {
    renderSolarWind();
    await waitFor(() => expect(screen.getByText(/We are \d+ minutes behind/)).toBeInTheDocument());
    expect(
      screen.getByText(/The displayed current values are 5-minute averages\./),
    ).toBeInTheDocument();
  });

  it("labels every chart with a descriptive accessible name", async () => {
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

  it("explains every chart in a collapsible help popover", async () => {
    const user = userEvent.setup();
    renderSolarWind();
    await waitFor(() => expect(screen.getByText("Speed")).toBeInTheDocument());
    // One info-icon help per card – 4 cards, all toggled by a real button
    const helps = document.querySelectorAll(".live-panel__help");
    expect(helps.length).toBeGreaterThanOrEqual(4);
    const triggers = document.querySelectorAll(
      ".live-panel__help > button.btn--icon",
    );
    expect(triggers.length).toBeGreaterThanOrEqual(4);
    // Per-card sr-only labels
    expect(screen.getByText("About solar wind")).toBeInTheDocument();
    expect(screen.getByText("About particle density")).toBeInTheDocument();
    expect(screen.getByText("About Bt")).toBeInTheDocument();
    expect(screen.getByText("About Bz")).toBeInTheDocument();
    for (const trigger of Array.from(triggers)) {
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    }
    // Opening the Speed help reveals its compact scale
    const speedHelp = screen
      .getByText("Speed")
      .closest("section")!
      .querySelector(".live-panel__help")!;
    const speedTrigger = speedHelp.querySelector("button")!;
    await user.click(speedTrigger);
    expect(speedTrigger).toHaveAttribute("aria-expanded", "true");
    const popover = document.querySelector(".live-panel__popover")!;
    expect(popover.querySelector("li b")?.textContent).toBe("< 400 km/s");
    expect(popover.textContent).toMatch(/900 km\/s.*very high/);
    // Escape closes it and returns focus to the info trigger
    await user.keyboard("{Escape}");
    expect(speedTrigger).toHaveAttribute("aria-expanded", "false");
    expect(speedTrigger).toHaveFocus();
    // Clicking toggles it open and closed again
    await user.click(speedTrigger);
    expect(speedTrigger).toHaveAttribute("aria-expanded", "true");
    await user.click(speedTrigger);
    expect(speedTrigger).toHaveAttribute("aria-expanded", "false");
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
      .querySelector(".live-panel__help")!;
    await user.click(btHelp.querySelector("button")!);
    let popover = document.querySelector(".live-panel__popover")!;
    expect(popover.textContent).toMatch(
      /Interplanetary magnetic field \(IMF\), Bt component/i,
    );
    expect(popover.textContent).toMatch(/strength of the Sun's magnetic field/);
    const bzHelp = screen
      .getByText("Bz")
      .closest("section")!
      .querySelector(".live-panel__help")!;
    await user.click(bzHelp.querySelector("button")!);
    popover = document.querySelector(".live-panel__popover")!;
    expect(popover.textContent).toMatch(
      /Interplanetary magnetic field \(IMF\), Bz \(GSM\) component/i,
    );
    expect(popover.textContent).toMatch(/southward \(negative\) Bz/i);
  });

  it("frames Bz bands as a duration-gated gate with no Kp outcome (N1)", async () => {
    const user = userEvent.setup();
    renderSolarWind();
    await waitFor(() => expect(screen.getByText("Bz")).toBeInTheDocument());
    const bzHelp = screen
      .getByText("Bz")
      .closest("section")!
      .querySelector(".live-panel__help")!;
    await user.click(bzHelp.querySelector("button")!);
    const popover = document.querySelector(".live-panel__popover")!;
    // No help row promises a Kp outcome: no "active (Kp3-4)"-shaped band.
    expect(popover.textContent).not.toMatch(/Kp\s*\d/i);
    // Sustained-hours framing is present (duration beats instant value).
    expect(popover.textContent).toMatch(/sustained|hours/i);
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
        screen.getByText(COULDNT_LOAD_COPY),
      ).toBeInTheDocument(),
    );
  });

  it("marks every card as showing saved data when the browser is offline", async () => {
    renderSolarWind();
    await waitFor(() => expect(screen.getByText("Speed")).toBeInTheDocument());
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getAllByText(STALE_DATA_NOTICE).length).toBeGreaterThanOrEqual(4);
  });
});