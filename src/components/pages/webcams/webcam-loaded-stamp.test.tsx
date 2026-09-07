// The Loaded stamp renders in the device time zone in Local mode, so the
// suite pins one (Sweden, UTC+2) to keep every expectation deterministic.
process.env.TZ = "Europe/Stockholm";

import { render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import WebcamImageCard from "./WebcamImageCard";
import WebcamLiveCard from "./WebcamLiveCard";
import { DisplayTimezoneProvider } from "../../DisplayTimezone/DisplayTimezoneContext";
import { DISPLAY_TIMEZONE_STORAGE_KEY } from "../../../products/display-timezone";
import type { WebcamImageEntry, WebcamLiveEntry } from "../../../data/webcams";

const imageEntry: WebcamImageEntry = {
  type: "image",
  id: "aurora-ridge",
  name: "Aurora Ridge",
  region: "North America",
  country: "Canada",
  latitude: 56.4,
  longitude: -94.71,
  operator: "Aurora Ridge Observatory",
  panoramic: false,
  imageUrl: "https://cdn.example.org/aurora-ridge.jpg",
  cadenceMinutes: 2,
  refreshable: true,
  license: null,
  note: null,
  alt: "Aurora Ridge, Canada – current sky view",
  siteUrl: "https://example.org/aurora-ridge",
};

const liveEntry: WebcamLiveEntry = {
  type: "live",
  id: "poker-flat-live",
  name: "Poker Flat Live",
  region: "North America",
  country: "Alaska, US",
  latitude: 65.1,
  operator: "Geophysical Institute",
  imageUrl: "https://cdn.example.org/poker-placeholder.jpg",
  sseUrl: "https://allsky.example.org/src/checkLive.php?cam=poker-flat",
  frameBaseUrl: "https://allsky.example.org/",
  license: "Public monitor",
  note: null,
  alt: "Poker Flat Live, Alaska – current sky view",
  siteUrl: "https://example.org/poker-flat",
};

const baseProps = {
  autoRefresh: false,
  tabVisible: true,
  canHide: true,
  onHide: () => {},
  pinMode: false,
  pinned: false,
  pinDisabled: false,
  onTogglePin: () => {},
};

const renderImageCard = (refreshNonce = 0) =>
  render(
    <DisplayTimezoneProvider>
      <WebcamImageCard
        {...baseProps}
        card={imageEntry}
        refreshNonce={refreshNonce}
      />
    </DisplayTimezoneProvider>,
  );

const renderLiveCard = () =>
  render(
    <DisplayTimezoneProvider>
      <WebcamLiveCard {...baseProps} entry={liveEntry} />
    </DisplayTimezoneProvider>,
  );

describe("Webcam Loaded stamp (ticket 02)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ["Date"] } as unknown as Parameters<
      typeof vi.useFakeTimers
    >[0]);
    vi.setSystemTime(new Date("2026-09-01T12:34:56Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const seedUtc = (): void => {
    localStorage.setItem(
      DISPLAY_TIMEZONE_STORAGE_KEY,
      JSON.stringify({ timezone: "utc", v: 1 }),
    );
  };

  it("stamps the image card with the device clock in Local mode – the default", () => {
    // 12:34:56 UTC is 14:34 in Sweden (UTC+2)
    renderImageCard();
    expect(
      screen.getByText("Loaded 14:34. Refreshes every 2 min."),
    ).toBeInTheDocument();
  });

  it("stamps the image card in UTC when the Display timezone is UTC", () => {
    seedUtc();
    renderImageCard();
    expect(
      screen.getByText("Loaded 12:34. Refreshes every 2 min."),
    ).toBeInTheDocument();
  });

  it("stamps the live card with the placeholder line in UTC when the Display timezone is UTC", () => {
    seedUtc();
    renderLiveCard();
    expect(
      screen.getByText("Loaded 12:34. Placeholder frame."),
    ).toBeInTheDocument();
  });

  it("restamps on reload at the display timezone's clock", () => {
    seedUtc();
    const { rerender } = renderImageCard(0);
    expect(screen.getByText(/^Loaded 12:34/)).toBeInTheDocument();
    // Two minutes later the page-level Refresh bumps the nonce
    act(() => {
      vi.advanceTimersByTime(2 * 60_000);
    });
    rerender(
      <DisplayTimezoneProvider>
        <WebcamImageCard
          {...baseProps}
          card={imageEntry}
          refreshNonce={1}
        />
      </DisplayTimezoneProvider>,
    );
    expect(
      screen.getByText("Loaded 12:36. Refreshes every 2 min."),
    ).toBeInTheDocument();
  });
});
