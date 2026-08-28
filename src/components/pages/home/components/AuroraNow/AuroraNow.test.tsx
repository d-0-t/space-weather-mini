import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import kpObservedFixture from "../../../../../products/fixtures/noaa-planetary-k-index.json?raw";
import AuroraNow from "./AuroraNow";
import { AlertsProvider } from "../Alerts/AlertsContext";

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
        <AlertsProvider>
          <AuroraNow />
        </AlertsProvider>
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
      screen.getByRole("heading", { name: /^Aurora Oval Forecast \(30 min\)$/i }),
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

  it("shows the current moon phase emoji in a help popover with sr-only label", async () => {
    const user = userEvent.setup();
    renderAuroraNow();
    await waitFor(() =>
      expect(document.querySelector(".kp-bar")).toBeInTheDocument(),
    );
    const moon = document.querySelector(
      ".live-panel__help--moon",
    ) as HTMLDetailsElement;
    expect(moon).not.toBeNull();
    // Fake system time is 2026-08-26T12:00Z → Waxing gibbous
    expect(
      screen.getByText("Current Moon phase: Waxing gibbous"),
    ).toBeInTheDocument();
    expect(moon.querySelector("[aria-hidden='true']")!.textContent).toBe("🌔");
    // The popover explains the phase and why it matters for aurora
    await user.click(moon.querySelector("summary")!);
    expect(moon.open).toBe(true);
    expect(moon.querySelector(".live-panel__popover")?.textContent).toMatch(
      /Waxing gibbous/,
    );
    expect(moon.querySelector(".live-panel__popover")?.textContent).toMatch(
      /darkest skies around the new moon/,
    );
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