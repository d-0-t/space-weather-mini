import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import kpObservedFixture from "../../../../../products/fixtures/noaa-planetary-k-index.json?raw";
import AuroraNow from "./AuroraNow";

const queryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockFetch = vi.fn();

beforeEach(() => {
  // Fix today to Aug26 2026 (Wednesday) UTC so moon phase is deterministic
  vi.useFakeTimers({ toFake: ["Date"] } as unknown as Parameters<typeof vi.useFakeTimers>[0]);
  vi.setSystemTime(new Date("2026-08-26T12:00:00Z"));
  mockFetch.mockReset();
  mockFetch.mockImplementation((url: string) => {
    const u = typeof url === "string" ? url : "";
    if (u.includes("noaa-planetary-k-index.json")) return Promise.resolve({ ok: true, text: async () => kpObservedFixture });
    return Promise.resolve({ ok: true, text: async () => "" });
  });
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.useRealTimers();
});

const renderAuroraNow = () =>
  render(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter>
        <AuroraNow />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("AuroraNow", () => {
  it("renders heading Aurora Now, current Kp with bar and the oval forecast images", async () => {
    renderAuroraNow();
    await waitFor(() => expect(screen.getByRole("heading", { name: /^Aurora Now$/i })).toBeInTheDocument());
    await waitFor(() => expect(document.querySelector(".kp-bar")).toBeInTheDocument());
    expect(document.querySelector(".aurora-now__current")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^Aurora Oval Forecast$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByAltText(/Aurora Forecast.*North Pole/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByAltText(/Aurora Forecast.*South Pole/i).length,
    ).toBeGreaterThan(0);
  });

  it("derives the current 3h slot label from the observed time_tag", async () => {
    renderAuroraNow();
    await waitFor(() => expect(document.querySelector(".kp-bar")).toBeInTheDocument());
    // Fixture's latest observed reading is at 12:00 UTC → the 12-15 UT slot
    expect(screen.getByText("12:00 - 15:00 UTC")).toBeInTheDocument();
  });

  it("opens the aurora images full size in a modal and closes on Escape", async () => {
    renderAuroraNow();
    await waitFor(() => expect(document.querySelector(".kp-bar")).toBeInTheDocument());
    const dialogs = document.querySelectorAll("dialog.image-modal");
    expect(dialogs.length).toBe(2); // aurora north + aurora south
    expect((dialogs[0] as HTMLDialogElement).open).toBe(false);
  });

  it("computes moon phase for known dates", async () => {
    const { getMoonPhase } = await import("./AuroraNow");
    const ref = Date.UTC(2000, 0, 6, 18, 14); // known new moon
    expect(getMoonPhase(new Date(ref)).name).toBe("New moon");
    expect(getMoonPhase(new Date(ref + 7 * 86_400_000)).name).toBe(
      "Waxing crescent",
    );
    expect(getMoonPhase(new Date(ref + 15 * 86_400_000)).name).toBe("Full moon");
    expect(getMoonPhase(new Date(ref + 21 * 86_400_000)).name).toBe(
      "Waning gibbous",
    );
    expect(getMoonPhase(new Date(ref + 26 * 86_400_000)).name).toBe(
      "Waning crescent",
    );
  });

  it("shows the current moon phase emoji in the header with title and sr-only label", async () => {
    renderAuroraNow();
    await waitFor(() =>
      expect(document.querySelector(".kp-bar")).toBeInTheDocument(),
    );
    const moon = document.querySelector(".aurora-now__moon");
    expect(moon).not.toBeNull();
    // Fake system time is 2026-08-26T12:00Z → Waxing gibbous
    expect(moon!.getAttribute("title")).toBe(
      "Current Moon phase: Waxing gibbous",
    );
    expect(screen.getByText("Current Moon phase: Waxing gibbous")).toBeInTheDocument();
    expect(moon!.querySelector("[aria-hidden='true']")!.textContent).toBe("🌔");
  });

  it("attributes the oval forecast images to the NOAA aurora product page", async () => {
    renderAuroraNow();
    await waitFor(() => expect(document.querySelector(".kp-bar")).toBeInTheDocument());
    const source = screen.getByRole("link", { name: /^NOAA\/SWPC$/ });
    expect(source.getAttribute("href")).toBe(
      "https://www.swpc.noaa.gov/products/aurora-30-minute-forecast",
    );
  });
});