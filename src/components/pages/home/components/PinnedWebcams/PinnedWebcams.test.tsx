import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PinnedWebcams from "./PinnedWebcams";
import {
  PINS_AUTO_REFRESH_STORAGE_KEY,
  PINNED_WEBCAMS_STORAGE_KEY,
} from "../../../../../data/webcam-storage";
import type { WebcamEntry } from "../../../../../data/webcams";

const fixtureEntries: WebcamEntry[] = [
  {
    type: "image",
    id: "aurora-ridge",
    name: "Aurora Ridge",
    region: "North America",
    country: "Canada",
    latitude: 56.4,
    operator: "Aurora Ridge Observatory",
    imageUrl: "https://cdn.example.org/aurora-ridge.jpg",
    cadenceMinutes: 2,
    refreshable: true,
    license: null,
    note: null,
    alt: "Aurora Ridge, Canada – current sky view",
    siteUrl: "https://example.org/aurora-ridge",
  },
  {
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
  },
  {
    type: "twitch",
    id: "night-sky-live",
    name: "Night Sky Live",
    region: "Nordic",
    operator: "Night Sky Live",
    twitchChannel: "nightskylive",
    siteUrl: "https://example.org/night-sky-live",
    note: null,
  },
];

const setPins = (...ids: string[]) => {
  localStorage.setItem(
    PINNED_WEBCAMS_STORAGE_KEY,
    JSON.stringify({ v: 1, pins: ids }),
  );
};

const cardImage = (alt: string): HTMLImageElement =>
  screen.getByRole("img", { name: alt }).closest("button")!.querySelector(
    ".pinned-webcam-card__img",
  ) as HTMLImageElement;

describe("Pinned Webcams panel", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders nothing while no pins are stored", () => {
    const { container } = render(<PinnedWebcams entries={fixtureEntries} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the pinned cam in a collapsible panel with flag, latitude, image and source", () => {
    setPins("aurora-ridge");
    render(<PinnedWebcams entries={fixtureEntries} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Pinned Webcams" }),
    ).toBeInTheDocument();
    const title = screen.getByRole("heading", {
      level: 3,
      name: /Aurora Ridge · 56\.4°N/,
    });
    expect(title.querySelector(".pinned-webcam-card__flag")).toHaveAttribute(
      "alt",
      "Canada",
    );
    const img = cardImage("Aurora Ridge, Canada – current sky view");
    expect(img).toHaveAttribute("src", "https://cdn.example.org/aurora-ridge.jpg");
    const source = screen.getByRole("link", {
      name: "Aurora Ridge Observatory",
    });
    expect(source).toHaveAttribute("href", "https://example.org/aurora-ridge");
    expect(source).toHaveAttribute("target", "_blank");
  });

  it("collapses and expands via the disclosure toggle", () => {
    setPins("aurora-ridge");
    render(<PinnedWebcams entries={fixtureEntries} />);
    const toggle = screen.getByRole("button", { name: "Pinned Webcams" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("heading", { level: 3, name: /Aurora Ridge/ }),
    ).toBeNull();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("heading", { level: 3, name: /Aurora Ridge/ }),
    ).toBeInTheDocument();
  });

  it("persists the opt-in auto-refresh consent and defaults it to off", () => {
    setPins("aurora-ridge");
    render(<PinnedWebcams entries={fixtureEntries} />);
    const checkbox = screen.getByRole("checkbox", { name: "Auto-refresh" });
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toHaveAttribute(
      "title",
      "Reloads each pinned image on its operator's cadence – uses data",
    );
    fireEvent.click(checkbox);
    expect(localStorage.getItem(PINS_AUTO_REFRESH_STORAGE_KEY)).toBe("true");
    expect(screen.getByRole("checkbox", { name: "Auto-refresh" })).toBeChecked();
  });

  it("reloads pinned image stills at their operator cadence while consent is on, and never without it", () => {
    vi.useFakeTimers();
    setPins("aurora-ridge");
    render(<PinnedWebcams entries={fixtureEntries} />);
    const img = () => cardImage("Aurora Ridge, Canada – current sky view");

    // Consent off – no reloads
    act(() => vi.advanceTimersByTime(20 * 60_000));
    expect(img().getAttribute("src")).toBe(
      "https://cdn.example.org/aurora-ridge.jpg",
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Auto-refresh" }));
    act(() => vi.advanceTimersByTime(119_999));
    expect(img().getAttribute("src")).toBe(
      "https://cdn.example.org/aurora-ridge.jpg",
    );
    act(() => vi.advanceTimersByTime(1)); // exactly the 2-minute cadence
    expect(img().getAttribute("src")).toMatch(/\?t=\d+$/);
  });

  it("keeps a pinned live cam on its still – no cadence, no SSE on the Dashboard", () => {
    setPins("poker-flat-live");
    render(<PinnedWebcams entries={fixtureEntries} />);
    const img = cardImage("Poker Flat Live, Alaska – current sky view");
    expect(img).toHaveAttribute(
      "src",
      "https://cdn.example.org/poker-placeholder.jpg",
    );
    expect(
      screen.getByRole("heading", { level: 3, name: /Poker Flat Live · 65\.1°N/ }),
    ).toBeInTheDocument();
  });

  it("renders a pinned Twitch stream as the never-autoplaying player", () => {
    setPins("night-sky-live");
    render(<PinnedWebcams entries={fixtureEntries} />);
    const iframe = screen.getByTitle("Night Sky Live – live on Twitch");
    expect(iframe.getAttribute("src")).toContain("channel=nightskylive");
    expect(iframe.getAttribute("src")).toContain("autoplay=false");
    expect(iframe.getAttribute("src")).toContain("muted=true");
    expect(iframe.getAttribute("src")).toContain("parent=localhost");
    expect(
      screen.getByRole("link", { name: "Night Sky Live" }),
    ).toHaveAttribute("href", "https://example.org/night-sky-live");
  });

  it("opens the pinned still full size in the modal", () => {
    setPins("aurora-ridge");
    render(<PinnedWebcams entries={fixtureEntries} />);
    fireEvent.click(
      screen.getByRole("button", { name: /aurora ridge, full size/i }),
    );
    const dialog = document.querySelector(
      "dialog.image-modal",
    ) as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector("img")).toHaveAttribute(
      "src",
      "https://cdn.example.org/aurora-ridge.jpg",
    );
  });

  it("skips stale pin ids that left the registry and hides itself when none resolve", () => {
    setPins("aurora-ridge", "gone-cam");
    const { container, rerender } = render(
      <PinnedWebcams entries={fixtureEntries} />,
    );
    expect(
      screen.getByRole("heading", { level: 3, name: /Aurora Ridge/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/gone-cam/)).toBeNull();
    setPins("gone-cam");
    rerender(<PinnedWebcams entries={fixtureEntries} />);
    expect(container.firstChild).toBeNull();
  });
});