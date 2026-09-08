// The freshness line renders in the device time zone in Local mode, so the
// suite pins one (Sweden, UTC+2) to keep every expectation deterministic.
process.env.TZ = "Europe/Stockholm";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import magFixture from "../../../../../products/fixtures/solar-wind-mag-field.json?raw";
import speedFixture from "../../../../../products/fixtures/solar-wind-speed.json?raw";
import hemiFixture from "../../../../../products/fixtures/hemi-power.txt?raw";
import dstFixture from "../../../../../products/fixtures/kyoto-dst.json?raw";
import LiveBanner from "./LiveBanner";
import { DisplayTimezoneProvider } from "../../../../DisplayTimezone/DisplayTimezoneContext";
import { saveDisplayTimezone } from "../../../../../products/display-timezone";
import {
  COULDNT_LOAD_COPY,
  STALE_DATA_NOTICE,
} from "../offline/offline";

const queryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockImplementation((url: string) => {
    const u = typeof url === "string" ? url : "";
    if (u.includes("solar-wind-mag-field.json")) return Promise.resolve({ ok: true, text: async () => magFixture });
    if (u.includes("solar-wind-speed.json")) return Promise.resolve({ ok: true, text: async () => speedFixture });
    if (u.includes("aurora-nowcast-hemi-power.txt")) return Promise.resolve({ ok: true, text: async () => hemiFixture });
    if (u.includes("kyoto-dst.json")) return Promise.resolve({ ok: true, text: async () => dstFixture });
    return Promise.resolve({ ok: true, text: async () => "" });
  });
  vi.stubGlobal("fetch", mockFetch);
});

const renderBanner = () =>
  render(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter>
        <DisplayTimezoneProvider>
          <LiveBanner />
        </DisplayTimezoneProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("LiveBanner", () => {
  it("renders Live Solar Wind heading and pills", async () => {
    renderBanner();
    await waitFor(() => expect(screen.getAllByText(/Bz/).length).toBeGreaterThan(0));
    expect(screen.getByRole("heading", { name: /Live Solar Wind/i })).toBeInTheDocument();
    expect(screen.getByText(/Hemispheric power/)).toBeInTheDocument();
  });

  it("formats the freshness line in the device zone with no raw time tags (Local mode)", async () => {
    renderBanner();
    await waitFor(() => expect(screen.getAllByText(/Bz/).length).toBeGreaterThan(0));
    // 17:47 UTC is 19:47 in Sweden, same day; hemi's 17:50 is 19:50
    expect(screen.getByText(/Bz As of 19:47. Updated/)).toBeInTheDocument();
    expect(screen.getByText(/Speed As of 19:47\./)).toBeInTheDocument();
    expect(screen.getByText(/Hemi As of 19:50\./)).toBeInTheDocument();
    expect(screen.getByText(/Dst As of 19:00\./)).toBeInTheDocument();
    // No raw time tag surfaces anywhere on the banner
    expect(document.body.textContent).not.toMatch(/2026-08-25[ _T]\d/);
  });

  it("formats the freshness line with ' UTC' suffixes in UTC mode", async () => {
    saveDisplayTimezone(localStorage, "utc");
    renderBanner();
    await waitFor(() => expect(screen.getAllByText(/Bz/).length).toBeGreaterThan(0));
    expect(
      screen.getByText(/Bz As of Aug 25 17:47 UTC. Updated/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Speed As of Aug 25 17:47 UTC\./)).toBeInTheDocument();
    expect(screen.getByText(/Hemi As of Aug 25 17:50 UTC\./)).toBeInTheDocument();
    expect(screen.getByText(/Dst As of Aug 25 17:00 UTC\./)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/2026-08-25[ _T]\d/);
  });

  it("shows the stale notice with saved data when offline", async () => {
    renderBanner();
    await waitFor(() => expect(screen.getAllByText(/Bz/).length).toBeGreaterThan(0));
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByText(STALE_DATA_NOTICE)).toBeInTheDocument();
  });

  it("shows the plain never-cached error when the feeds never loaded", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({ ok: false, status: 500, text: async () => "" }),
    );
    renderBanner();
    await waitFor(() =>
      expect(screen.getByText(COULDNT_LOAD_COPY)).toBeInTheDocument(),
    );
  });
});
