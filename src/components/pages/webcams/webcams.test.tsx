import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Webcams from "./webcams";
import { AUTO_REFRESH_STORAGE_KEY } from "../../../data/webcam-storage";
import type { WebcamEntry } from "../../../data/webcams";

const fixtureEntries: WebcamEntry[] = [
  {
    type: "image",
    id: "aurora-ridge",
    name: "Aurora Ridge",
    region: "Canada",
    country: "Canada",
    latitude: 56.4,
    operator: "Aurora Ridge Observatory",
    panoramic: true,
    imageUrl: "https://cdn.example.org/aurora-ridge.jpg",
    cadenceMinutes: 2,
    refreshable: true,
    license: null,
    note: "(seasonal)",
    alt: "Aurora Ridge, Canada – current sky view",
    siteUrl: "https://example.org/aurora-ridge",
  },
  {
    type: "image",
    id: "northern-lights",
    name: "Northern Lights",
    region: "Canada",
    country: "Canada",
    latitude: 51.1,
    operator: "North Pole Cam Co",
    imageUrl: "https://cdn.example.org/northern-lights.jpg",
    cadenceMinutes: 10,
    refreshable: true,
    license: "Free with credit",
    note: null,
    alt: "Northern Lights, Canada – current sky view",
    siteUrl: "https://example.org/northern-lights",
  },
  {
    type: "image",
    id: "still-sky",
    name: "Still Sky",
    region: "Canada",
    country: "Canada",
    latitude: 53.0,
    operator: "Static Cams Co",
    imageUrl: "https://cdn.example.org/still-sky.jpg",
    cadenceMinutes: 1,
    refreshable: false,
    license: "Free with credit",
    note: null,
    alt: "Still Sky, Canada – current sky view",
    siteUrl: "https://example.org/still-sky",
  },
  {
    type: "image",
    id: "north-star",
    name: "North Star",
    region: "Scandinavia",
    country: "Norway",
    latitude: 69.6,
    operator: "Test Observatory",
    imageUrl: "https://cdn.example.org/north-star.jpg",
    cadenceMinutes: 5,
    refreshable: true,
    license: "Free with credit – Test Observatory",
    note: null,
    alt: "North Star, Scandinavia – current sky view",
    siteUrl: "https://example.org/north-star",
  },
  {
    type: "twitch",
    id: "night-sky-live",
    name: "Night Sky Live",
    region: "Scandinavia",
    operator: "Night Sky Live",
    twitchChannel: "nightskylive",
    siteUrl: "https://example.org/night-sky-live",
    note: null,
  },
{
    type: "live",
    id: "poker-flat-live",
    name: "Poker Flat Live",
    region: "Alaska",
    country: "Alaska, US",
    latitude: 65.1,
    operator: "Geophysical Institute",
    imageUrl: "https://cdn.example.org/poker-placeholder.jpg",
    sseUrl: "https://allsky.example.org/src/checkLive.php?cam=poker-flat",
    frameBaseUrl: "https://allsky.example.org/",
    license: "Public monitor",
    note: "Night-only – placeholder frame in daylight",
    alt: "Poker Flat Live, Alaska – current sky view",
    siteUrl: "https://example.org/poker-flat",
  },
{
    type: "link",
    id: "midnight-glacier",
    name: "Midnight Glacier",
    region: "Iceland",
    operator: "Glacier TV",
    url: "https://glacier.example.com",
    kind: "youtube",
    note: null,
  },
  {
    type: "link",
    id: "tasman-still",
    name: "Tasman Still",
    region: "New Zealand",
    operator: "Tasman Cams",
    url: "https://tasman.example.com",
    kind: "http-only",
    note: "HTTP-only still – blocked by mixed content on HTTPS pages",
  },
  {
    type: "link",
    id: "alpine-peak",
    name: "Alpine Peak",
    region: "rest",
    operator: "Alpine Cams",
    url: "https://alpine.example.com",
    kind: "player",
    note: null,
  },
];

const renderPage = () => render(<Webcams entries={fixtureEntries} />);

const openFilter = () => {
  fireEvent.click(screen.getByRole("button", { name: /^Filter/ }));
  return document.querySelector(
    "dialog.webcams__filter-dialog",
  ) as HTMLDialogElement;
};

describe("Webcams page", () => {
  it("renders a single level-1 heading", () => {
    renderPage();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Webcams" }),
    ).toBeInTheDocument();
  });

  it("renders an image card with station and latitude in the title, a flagcdn flag carrying the country, freshness and source attribution", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
    const card = screen.getByText(/North Star · 69\.6°N/).closest("article")!;
    // The country is the flag image's alt/title, not visible text
    const flag = card.querySelector(".webcam-card__flag")!;
    expect(flag).toHaveAttribute("src", "https://flagcdn.com/16x12/no.png");
    expect(flag).toHaveAttribute(
      "srcset",
      "https://flagcdn.com/32x24/no.png 2x, https://flagcdn.com/48x36/no.png 3x",
    );
    expect(flag).toHaveAttribute("alt", "Norway");
    expect(flag).toHaveAttribute("title", "Norway");
    expect(flag).toHaveAttribute("width", "16");
    expect(flag).toHaveAttribute("height", "12");
    expect(
      within(card).getByText(/^Loaded \d{2}:\d{2} · operator refreshes every 5 min$/),
    ).toBeInTheDocument();
    // Attribution carries the operator as the source link; the licence line is gone
    const source = within(card).getByText(/^Source:/);
    expect(source).toHaveTextContent("Test Observatory");
    const sourceLink = within(source).getByRole("link", {
      name: "Test Observatory",
    });
    expect(sourceLink).toHaveAttribute("href", "https://example.org/north-star");
    expect(sourceLink).toHaveAttribute("target", "_blank");
    expect(sourceLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(card).queryByText(/licence/i)).not.toBeInTheDocument();
    expect(within(card).queryByRole("link", { name: /visit site/i })).toBeNull();
    expect(card.querySelector(".webcam-card__img")).toHaveAttribute(
      "src",
      "https://cdn.example.org/north-star.jpg",
    );
  });

  it("shows the seasonal note on a card and renders panoramic cards last as full-row banners", () => {
    renderPage();
    const card = screen
      .getByText(/Aurora Ridge · 56\.4°N/)
      .closest("article")!;
    expect(within(card).getByText("(seasonal)")).toBeInTheDocument();
    expect(card).toHaveClass("webcam-card--panoramic");
    expect(card.querySelector(".webcam-card__flag")).toHaveAttribute(
      "alt",
      "Canada",
    );
    // Within its region, the panoramic card comes after the regular ones
    const canadaSection = document
      .getElementById("webcams-region-Canada")!
      .closest("section")!;
    const cards = Array.from(canadaSection.querySelectorAll(".webcam-card"));
    const northern = cards.findIndex((c) =>
      c.textContent?.includes("Northern Lights"),
    );
    const pano = cards.findIndex((c) =>
      c.textContent?.includes("Aurora Ridge"),
    );
    expect(northern).toBeGreaterThanOrEqual(0);
    expect(pano).toBeGreaterThan(northern);
  });

  it("adds a Jump to top link to every section heading row", () => {
    renderPage();
    expect(document.getElementById("webcams")).not.toBeNull();
    const sections = document.querySelectorAll(
      ".webcams__region, .webcams__links",
    );
    expect(sections.length).toBeGreaterThan(0);
    for (const section of Array.from(sections)) {
      expect(section.querySelector("h2")).not.toBeNull();
      const top = within(section as HTMLElement).getByRole("link", {
        name: "Jump to top",
      });
      expect(top).toHaveAttribute("href", "#webcams");
    }
    // Image regions (2) + Live cam + Twitch stream + Webcam links
    expect(screen.getAllByRole("link", { name: "Jump to top" })).toHaveLength(5);
  });

  it("renders a Jump to row with a pill per section heading", () => {
    renderPage();
    const jumps = screen.getByRole("navigation", { name: /webcams sections/i });
    expect(within(jumps).getByText(/^Jump to:/)).toBeInTheDocument();
    for (const [label, id] of [
      ["Scandinavia", "webcams-region-Scandinavia"],
      ["Canada", "webcams-region-Canada"],
      ["Twitch stream", "webcams-twitch"],
      ["Webcam links", "webcams-links"],
    ]) {
      const pill = within(jumps).getByRole("link", { name: label });
      expect(pill).toHaveAttribute("href", `#${id}`);
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it("groups image cards by region in the fixed display order", () => {
    renderPage();
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    // Scandinavia (index 0) before Canada (index 2) in WEBCAM_REGION_ORDER
    expect(headings.indexOf("Scandinavia")).toBeLessThan(
      headings.indexOf("Canada"),
    );
  });

  it("groups link rows in the spec order: New Zealand, UK, Greenland, Russia, then the rest", () => {
    renderPage();
    const linksSection = document.querySelector(".webcams__links")!;
    const h3s = Array.from(linksSection.querySelectorAll("h3")).map(
      (h) => h.textContent,
    );
    // New Zealand is the first link region; the rest bucket comes after the named regions
    expect(h3s[0]).toBe("New Zealand");
    expect(h3s.indexOf("New Zealand")).toBeLessThan(h3s.indexOf("Iceland"));
    expect(h3s[h3s.length - 1]).toBe("Other regions");
  });

  it("renders the Twitch embed with a title, no autoplay, and a source attribution to the operator's site", () => {
    renderPage();
    const iframe = screen.getByTitle(/night sky live/i);
    expect(iframe).toHaveAttribute(
      "src",
      expect.stringContaining("channel=nightskylive"),
    );
    expect(iframe.getAttribute("src")).toContain("autoplay=false");
    expect(iframe.getAttribute("src")).toContain("muted=true");
    expect(iframe.getAttribute("src")).toContain("parent=localhost");
    // The card fits its content and carries the operator's site as Source
    const streamCard = document.querySelector(".webcam-card--stream")!;
    expect(
      within(streamCard as HTMLElement).getByText(/^Source:/),
    ).toHaveTextContent("Night Sky Live");
    const sourceLink = screen.getByRole("link", { name: "Night Sky Live" });
    expect(sourceLink).toHaveAttribute("href", "https://example.org/night-sky-live");
    expect(sourceLink).toHaveAttribute("target", "_blank");
    // No autoplay copy, no separate watch link
    expect(screen.queryByText(/nothing streams until you press play/i)).toBeNull();
    expect(
      screen.queryByRole("link", { name: /watch live on twitch/i }),
    ).toBeNull();
  });

  it("renders link rows after the image cards, with station, region, operator and kind note", () => {
    renderPage();
    const text = document.body.textContent ?? "";
    const firstLink = text.indexOf("Midnight Glacier");
    const lastCard = text.lastIndexOf("North Star · 69.6°N");
    const twitch = text.indexOf("Night Sky Live");
    expect(firstLink).toBeGreaterThan(lastCard);
    expect(firstLink).toBeGreaterThan(twitch);

    const row = screen
      .getByRole("link", { name: "Tasman Still" })
      .closest("li")!;
    expect(within(row).getByText(/New Zealand/)).toBeInTheDocument();
    expect(within(row).getByText(/Tasman Cams/)).toBeInTheDocument();
    expect(within(row).getByText("HTTP-only still")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tasman Still" })).toHaveAttribute(
      "target",
      "_blank",
    );
  });

  it("opens the full-size view on click and closes on the close button", () => {
    renderPage();
    const trigger = screen.getByRole("button", {
      name: /north star, full size/i,
    });
    fireEvent.click(trigger);
    const dialog = document.querySelector("dialog.image-modal") as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector("img")).toHaveAttribute(
      "src",
      "https://cdn.example.org/north-star.jpg",
    );
    fireEvent.click(dialog.querySelector(".image-modal__close")!);
    expect(dialog.open).toBe(false);
  });

  it("closes the full-size view on Escape", () => {
    renderPage();
    fireEvent.click(
      screen.getByRole("button", { name: /north star, full size/i }),
    );
    const dialog = document.querySelector("dialog.image-modal") as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(dialog.open).toBe(false);
  });

  it("names the coverage gaps and links the EarthCam world map", () => {
    renderPage();
    expect(screen.getByText(/looking for more\?/i)).toBeInTheDocument();
    expect(screen.getByText(/NZ\/Tasmania.*Siberia.*UK.*Iceland/i)).toBeInTheDocument();
    const earthcam = screen.getByRole("link", { name: /earthcam/i });
    expect(earthcam).toHaveAttribute("href", "https://www.earthcam.com/mapsearch/");
    expect(earthcam).toHaveAttribute("target", "_blank");
  });
});

describe("Webcams auto-refresh header (ticket 03)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps the Refresh, Filter and Hidden sources controls in the header row with the h1", () => {
    renderPage();
    const heading = screen.getByRole("heading", { level: 1, name: "Webcams" });
    const headerRow = heading.closest(
      ".webcams__header",
    ) as HTMLElement;
    expect(
      within(headerRow).getByRole("button", { name: "Refresh" }),
    ).toBeInTheDocument();
    expect(
      within(headerRow).getByRole("button", { name: /^Filter/ }),
    ).toBeInTheDocument();
    expect(
      within(headerRow).getByRole("button", { name: /Hidden sources/ }),
    ).toBeInTheDocument();
  });

  it("renders the auto-refresh setting as a native checkbox, unchecked by default, with honest copy", () => {
    renderPage();
    const checkbox = screen.getByRole("checkbox", {
      name: /auto-refresh images/i,
    });
    expect(checkbox.tagName).toBe("INPUT");
    expect(checkbox).not.toBeChecked();
    expect(
      screen.getByText("Auto-refresh images – uses data"),
    ).toBeInTheDocument();
  });

  it("persists the auto-refresh setting and restores it on a fresh mount", () => {
    const { unmount } = render(<Webcams entries={fixtureEntries} />);
    fireEvent.click(
      screen.getByRole("checkbox", { name: /auto-refresh images/i }),
    );
    expect(
      screen.getByRole("checkbox", { name: /auto-refresh images/i }),
    ).toBeChecked();
    expect(localStorage.getItem(AUTO_REFRESH_STORAGE_KEY)).toBe("true");
    unmount();
    render(<Webcams entries={fixtureEntries} />);
    expect(
      screen.getByRole("checkbox", { name: /auto-refresh images/i }),
    ).toBeChecked();
  });
});

describe("Webcams auto-refresh cadence (ticket 03)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

  const cardImage = (title: string): HTMLImageElement =>
    screen
      .getByText(new RegExp(title))
      .closest("article")!
      .querySelector(".webcam-card__img")!;

  it("busts every image card's still via the header Refresh button, updating its Loaded time, with auto-refresh off", () => {
    renderPage();
    const auroraImg = cardImage("Aurora Ridge · 56.4°N");
    const northernImg = cardImage("Northern Lights · 51.1°N");
    const stillImg = cardImage("Still Sky · 53.0°N");
    const auroraCard = auroraImg.closest("article")!;
    const freshnessBefore = within(auroraCard).getByText(/^Loaded /).textContent;
    advance(60_000);
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(auroraImg.getAttribute("src")).toMatch(
      /^https:\/\/cdn\.example\.org\/aurora-ridge\.jpg\?t=\d+$/,
    );
    expect(northernImg.getAttribute("src")).toMatch(
      /^https:\/\/cdn\.example\.org\/northern-lights\.jpg\?t=\d+$/,
    );
    expect(stillImg.getAttribute("src")).toMatch(
      /^https:\/\/cdn\.example\.org\/still-sky\.jpg\?t=\d+$/,
    );
    // The Loaded time updates to the refresh moment
    const freshnessAfter = within(auroraCard).getByText(/^Loaded /).textContent;
    expect(freshnessAfter).not.toBe(freshnessBefore);
    expect(freshnessAfter).toMatch(
      /^Loaded \d{2}:\d{2} · operator refreshes every 2 min$/,
    );
  });

  it("reloads refreshable cards at their own cadence and never faster, leaving non-refreshable cards untouched", () => {
    renderPage();
    fireEvent.click(
      screen.getByRole("checkbox", { name: /auto-refresh images/i }),
    );
    const auroraImg = cardImage("Aurora Ridge · 56.4°N");
    const northernImg = cardImage("Northern Lights · 51.1°N");
    const stillImg = cardImage("Still Sky · 53.0°N");
    const auroraBefore = auroraImg.getAttribute("src");
    const northernBefore = northernImg.getAttribute("src");
    const stillBefore = stillImg.getAttribute("src");

    advance(119_999); // 1:59.999 – just under the 2-minute cadence
    expect(auroraImg.getAttribute("src")).toBe(auroraBefore);
    advance(1); // exactly 2 minutes
    expect(auroraImg.getAttribute("src")).toMatch(/\?t=\d+$/);
    expect(northernImg.getAttribute("src")).toBe(northernBefore);
    expect(stillImg.getAttribute("src")).toBe(stillBefore);

    advance(10 * 60_000 - 120_001); // 7:59.999 more – just under the 10-minute cadence
    expect(northernImg.getAttribute("src")).toBe(northernBefore);
    advance(1); // exactly 10 minutes
    expect(northernImg.getAttribute("src")).toMatch(/\?t=\d+$/);
    // The non-refreshable card stays untouched through every tick
    expect(stillImg.getAttribute("src")).toBe(stillBefore);
  });

  it("never auto-refreshes the Twitch player or the link rows", () => {
    renderPage();
    fireEvent.click(
      screen.getByRole("checkbox", { name: /auto-refresh images/i }),
    );
    const twitchSrc = screen
      .getByTitle(/night sky live/i)
      .getAttribute("src");
    const linkHrefs = Array.from(
      document.querySelectorAll(".webcam-link-row a"),
    ).map((a) => a.getAttribute("href"));
    advance(20 * 60_000);
    expect(screen.getByTitle(/night sky live/i).getAttribute("src")).toBe(
      twitchSrc,
    );
    expect(
      Array.from(document.querySelectorAll(".webcam-link-row a")).map((a) =>
        a.getAttribute("href"),
      ),
    ).toEqual(linkHrefs);
  });
});

describe("Webcams auto-refresh visibility (ticket 03)", () => {
  const originalVisibility = document.visibilityState;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: originalVisibility,
    });
    vi.useRealTimers();
  });

  const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

  const setTabHidden = (hidden: boolean) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: hidden ? "hidden" : "visible",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
  };

  const cardImage = (title: string): HTMLImageElement =>
    screen
      .getByText(new RegExp(title))
      .closest("article")!
      .querySelector(".webcam-card__img")!;

  it("pauses cadence reloads while the tab is hidden and resumes when it becomes visible", () => {
    renderPage();
    fireEvent.click(
      screen.getByRole("checkbox", { name: /auto-refresh images/i }),
    );
    const auroraImg = cardImage("Aurora Ridge · 56.4°N");
    const before = auroraImg.getAttribute("src");

    setTabHidden(true);
    advance(20 * 60_000); // hidden – nothing reloads
    expect(auroraImg.getAttribute("src")).toBe(before);

    setTabHidden(false); // visible – the interval re-arms
    advance(2 * 60_000 - 1); // just under the cadence
    expect(auroraImg.getAttribute("src")).toBe(before);
    advance(1); // exactly one cadence after re-arming
    expect(auroraImg.getAttribute("src")).toMatch(/\?t=\d+$/);
  });

  it("keeps the manual Refresh button working while the tab is hidden", () => {
    renderPage();
    const auroraImg = cardImage("Aurora Ridge · 56.4°N");
    const before = auroraImg.getAttribute("src");
    setTabHidden(true);
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(auroraImg.getAttribute("src")).not.toBe(before);
    expect(auroraImg.getAttribute("src")).toMatch(/\?t=\d+$/);
  });
});

describe("Webcams hiding", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("hides an image card via its Hide button, stops rendering its image, and writes storage", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Hide North Star" }));
    expect(
      screen.queryByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeNull();
    expect(screen.queryByAltText("North Star, Scandinavia – current sky view")).toBeNull();
    expect(localStorage.getItem("sw:webcams:hidden:v1")).toBe(
      JSON.stringify(["north-star"]),
    );
    // Siblings stay
    expect(
      screen.getByRole("heading", { level: 3, name: /Northern Lights · 51\.1°N/ }),
    ).toBeInTheDocument();
  });

  it("hides the Twitch card", () => {
    renderPage();
    fireEvent.click(
      screen.getByRole("button", { name: "Hide Night Sky Live" }),
    );
    expect(screen.queryByTitle(/night sky live/i)).toBeNull();
    expect(localStorage.getItem("sw:webcams:hidden:v1")).toBe(
      JSON.stringify(["night-sky-live"]),
    );
  });

  it("hides a link row", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Hide Tasman Still" }));
    expect(screen.queryByRole("link", { name: "Tasman Still" })).toBeNull();
    expect(localStorage.getItem("sw:webcams:hidden:v1")).toBe(
      JSON.stringify(["tasman-still"]),
    );
  });

  it("keeps hidden items out of the gallery under every region filter", () => {
    renderPage();
    fireEvent.click(
      screen.getByRole("button", { name: "Hide Northern Lights" }),
    );
    const dialog = openFilter();
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: "Canada" }),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    // The visible Canadian card stays, the hidden one never returns
    expect(
      screen.getByRole("heading", { level: 3, name: /Aurora Ridge · 56\.4°N/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 3, name: /Northern Lights · 51\.1°N/ }),
    ).toBeNull();
  });
});

describe("Webcams hidden sources dialog", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const openHiddenDialog = () => {
    fireEvent.click(screen.getByRole("button", { name: /Hidden sources/ }));
    return document.querySelector(
      "dialog.webcams__hidden-dialog",
    ) as HTMLDialogElement;
  };

  it("shows a live count on the Hidden sources button and lists hidden entries in the dialog", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Hide North Star" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide Tasman Still" }));
    expect(
      screen.getByRole("button", { name: "Hidden sources (2)" }),
    ).toBeInTheDocument();
    const dialog = openHiddenDialog();
    expect(dialog.open).toBe(true);
    expect(within(dialog).getByText("North Star")).toBeInTheDocument();
    expect(within(dialog).getByText("Tasman Still")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Show North Star" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Show all" }),
    ).toBeInTheDocument();
  });

  it("restores a single hidden entry from the dialog and keeps the count live", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Hide North Star" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Hide Northern Lights" }),
    );
    const dialog = openHiddenDialog();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Show North Star" }),
    );
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hidden sources (1)" }),
    ).toBeInTheDocument();
    expect(localStorage.getItem("sw:webcams:hidden:v1")).toBe(
      JSON.stringify(["northern-lights"]),
    );
    expect(within(dialog).queryByText("North Star")).toBeNull();
  });

  it("restores every hidden entry via Show all", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Hide North Star" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide Tasman Still" }));
    const dialog = openHiddenDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Show all" }));
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tasman Still" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hidden sources (0)" }),
    ).toBeInTheDocument();
    expect(localStorage.getItem("sw:webcams:hidden:v1")).toBe("[]");
  });

  it("closes on Escape and returns focus to the Hidden sources button", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Hide North Star" }));
    const dialog = openHiddenDialog();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(dialog.open).toBe(false);
    expect(
      screen.getByRole("button", { name: "Hidden sources (1)" }),
    ).toHaveFocus();
  });

  it("shows an honest empty note when nothing is hidden", () => {
    renderPage();
    expect(
      screen.getByRole("button", { name: "Hidden sources (0)" }),
    ).toBeInTheDocument();
    const dialog = openHiddenDialog();
    expect(within(dialog).getByText(/no hidden sources/i)).toBeInTheDocument();
  });
});

describe("Webcams persistence and empty state", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps hidden sources hidden across a fresh mount", () => {
    const { unmount } = render(<Webcams entries={fixtureEntries} />);
    fireEvent.click(screen.getByRole("button", { name: "Hide North Star" }));
    unmount();
    render(<Webcams entries={fixtureEntries} />);
    expect(
      screen.queryByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Hidden sources (1)" }),
    ).toBeInTheDocument();
  });

  it("shows the honest empty state when the filter and hidden set leave nothing", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Hide North Star" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Hide Night Sky Live" }),
    );
    const dialog = openFilter();
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: "Scandinavia" }),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    // Scandinavia holds only the hidden card and the hidden Twitch card
    expect(
      screen.getByText("No webcams match your filters"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: /webcams sections/i }),
    ).toBeNull();
  });
});

describe("Webcams region filter", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("opens a checklist dialog from the Filter button with one native checkbox per present region in fixed order", () => {
    renderPage();
    const dialog = openFilter();
    expect(dialog.open).toBe(true);
    // Fixture regions: the named ones plus Alaska (live cam), Iceland and the "rest" bucket
    const checkboxes = within(dialog).getAllByRole("checkbox");
    expect(checkboxes.map((box) => box.getAttribute("name"))).toEqual([
      "Scandinavia",
      "Alaska",
      "Canada",
      "New Zealand",
      "Iceland",
      "rest",
    ]);
    expect(
      within(dialog).getByRole("checkbox", { name: "Other regions" }),
    ).toBeInTheDocument();
    for (const box of checkboxes) {
      expect(box).not.toBeChecked();
    }
  });

  it("keeps the gallery unchanged until Apply commits the checked regions", () => {
    renderPage();
    const dialog = openFilter();
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: "Scandinavia" }),
    );
    // Draft only – both regions still visible while the dialog is open
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: /Northern Lights · 51\.1°N/ }),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(dialog.open).toBe(false);
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 3, name: /Northern Lights · 51\.1°N/ }),
    ).toBeNull();
    // Link rows narrow too
    expect(screen.queryByRole("link", { name: "Tasman Still" })).toBeNull();
  });

  it("shows every webcam when no region is applied", () => {
    renderPage();
    const dialog = openFilter();
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: "Scandinavia" }),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    const dialog2 = openFilter();
    fireEvent.click(
      within(dialog2).getByRole("checkbox", { name: "Scandinavia" }),
    );
    fireEvent.click(within(dialog2).getByRole("button", { name: "Apply" }));
    expect(
      screen.getByRole("heading", { level: 3, name: /Northern Lights · 51\.1°N/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tasman Still" })).toBeInTheDocument();
  });

  it("Show all and Hide all toggle the draft checkboxes without touching the gallery or the hidden set until Apply", () => {
    renderPage();
    // A hidden source must survive both toggles untouched
    fireEvent.click(screen.getByRole("button", { name: "Hide Tasman Still" }));
    const dialog = openFilter();
    fireEvent.click(within(dialog).getByRole("button", { name: "Hide all" }));
    for (const box of within(dialog).getAllByRole("checkbox")) {
      expect(box).toBeChecked();
    }
    // Draft only – everything still visible while the dialog is open
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    // Checking every region keeps every region – the whole gallery stays,
    // including the Iceland and "rest" link rows
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: /Northern Lights · 51\.1°N/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Midnight Glacier" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alpine Peak" })).toBeInTheDocument();
    // The hidden source is untouched by either toggle
    expect(screen.queryByRole("link", { name: "Tasman Still" })).toBeNull();
    expect(localStorage.getItem("sw:webcams:hidden:v1")).toBe(
      JSON.stringify(["tasman-still"]),
    );

    const dialog2 = openFilter();
    fireEvent.click(within(dialog2).getByRole("button", { name: "Show all" }));
    for (const box of within(dialog2).getAllByRole("checkbox")) {
      expect(box).not.toBeChecked();
    }
    fireEvent.click(within(dialog2).getByRole("button", { name: "Apply" }));
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
    expect(localStorage.getItem("sw:webcams:hidden:v1")).toBe(
      JSON.stringify(["tasman-still"]),
    );
  });

  it("persists the applied filter and restores it on a fresh mount", () => {
    const { unmount } = render(<Webcams entries={fixtureEntries} />);
    const dialog = openFilter();
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: "Scandinavia" }),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(localStorage.getItem("sw:webcams:filters:v1")).toBe(
      JSON.stringify({ v: 1, regions: ["Scandinavia"] }),
    );
    // A fresh visit (new mount) still filters
    unmount();
    render(<Webcams entries={fixtureEntries} />);
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 3, name: /Northern Lights · 51\.1°N/ }),
    ).toBeNull();
  });

  it("labels the Filter button with the applied region count and returns focus to it on close", () => {
    renderPage();
    const dialog = openFilter();
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: "Scandinavia" }),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(
      screen.getByRole("button", { name: "Filter (1)" }),
    ).toBeInTheDocument();
    const dialog2 = openFilter();
    fireEvent.keyDown(dialog2, { key: "Escape" });
    expect(dialog2.open).toBe(false);
    expect(
      screen.getByRole("button", { name: "Filter (1)" }),
    ).toHaveFocus();
  });
});

class MockEventSource {
  static instances: MockEventSource[] = [];

  listeners: Record<string, Array<(event: { data?: string }) => void>> = {};
  closed = false;

  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }

  addEventListener(
    type: string,
    cb: (event: { data?: string }) => void,
  ): void {
    (this.listeners[type] ??= []).push(cb);
  }

  dispatch(type: string, event: { data?: string } = {}): void {
    for (const cb of this.listeners[type] ?? []) cb(event);
  }

  close(): void {
    this.closed = true;
  }
}

describe("Webcams live cam (ticket 03)", () => {
  const originalVisibility = document.visibilityState;

  beforeEach(() => {
    localStorage.clear();
    MockEventSource.instances = [];
  });

  afterEach(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: originalVisibility,
    });
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const liveSection = (): HTMLElement | null =>
    document.querySelector("section[aria-labelledby='webcams-live']");

  const setTabHidden = (hidden: boolean) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: hidden ? "hidden" : "visible",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
  };

  it("renders the live cam as its own section with station, latitude, placeholder, note, attribution, a Live updates toggle and a Hide control", () => {
    renderPage();
    const section = liveSection()!;
    expect(section).not.toBeNull();
    expect(
      within(section).getByRole("heading", { level: 2, name: "Live cam" }),
    ).toBeInTheDocument();
    expect(
      within(section).getByRole("heading", {
        level: 3,
        name: /Poker Flat Live · 65\.1°N/,
      }),
    ).toBeInTheDocument();
    const flag = section.querySelector(".webcam-card__flag")!;
    expect(flag).toHaveAttribute("alt", "Alaska, US");
    expect(section.querySelector(".webcam-card__img")).toHaveAttribute(
      "src",
      "https://cdn.example.org/poker-placeholder.jpg",
    );
    expect(section.querySelector(".webcam-card__img")).toHaveAttribute(
      "alt",
      "Poker Flat Live, Alaska – current sky view",
    );
    expect(within(section).getByText(/night-only/i)).toBeInTheDocument();
    expect(within(section).getByText(/^Source:/)).toHaveTextContent(
      "Geophysical Institute",
    );
    const toggle = within(section).getByRole("checkbox", {
      name: "Live updates",
    });
    expect(toggle).toBeChecked();
    expect(toggle).toBeDisabled(); // no feed without the global consent
    expect(
      within(section).getByRole("button", { name: "Hide Poker Flat Live" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Live cam" })).toHaveAttribute(
      "href",
      "#webcams-live",
    );
  });

  it("follows the operator's SSE feed while auto-refresh is on and the tab is visible", () => {
    vi.stubGlobal("EventSource", MockEventSource);
    renderPage();
    const consent = screen.getByRole("checkbox", {
      name: /auto-refresh images/i,
    });
    expect(MockEventSource.instances).toHaveLength(0); // no feed without consent
    fireEvent.click(consent);
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe(
      "https://allsky.example.org/src/checkLive.php?cam=poker-flat",
    );
    const img = liveSection()!.querySelector(".webcam-card__img")!;
    act(() => {
      MockEventSource.instances[0].dispatch("message", {
        data: '{"0": "PKR/tagged_cam/PKR_260829140029.jpg"}',
      });
    });
    expect(img).toHaveAttribute(
      "src",
      "https://allsky.example.org/PKR/tagged_cam/PKR_260829140029.jpg",
    );
    expect(liveSection()!.querySelector(".webcam-card__freshness")).toHaveTextContent(
      /^Loaded \d{2}:\d{2} · live feed updates every ~5–15 s$/,
    );
  });

  it("shows an honest live-feed-unavailable fallback with the operator link on feed failure, and recovers on the next frame", () => {
    vi.stubGlobal("EventSource", MockEventSource);
    renderPage();
    fireEvent.click(
      screen.getByRole("checkbox", { name: /auto-refresh images/i }),
    );
    act(() => {
      MockEventSource.instances[0].dispatch("error");
    });
    const section = liveSection()!;
    expect(section.querySelector(".webcam-card__img")).toBeNull();
    const fallback = within(section).getByText(/live feed unavailable/i);
    expect(
      within(fallback).getByRole("link", { name: /operator's site/i }),
    ).toHaveAttribute("href", "https://example.org/poker-flat");
    // No freshness claim while the feed is down
    expect(
      within(section).queryByText(/live feed updates every/i),
    ).toBeNull();
    // The next frame restores the image
    act(() => {
      MockEventSource.instances[0].dispatch("message", {
        data: '{"0": "images/poker-notdark.jpg"}',
      });
    });
    expect(section.querySelector(".webcam-card__img")).toHaveAttribute(
      "src",
      "https://allsky.example.org/images/poker-notdark.jpg",
    );
  });

  it("lets the user disable live updates on the card, closing the feed and showing the placeholder", () => {
    vi.stubGlobal("EventSource", MockEventSource);
    renderPage();
    fireEvent.click(
      screen.getByRole("checkbox", { name: /auto-refresh images/i }),
    );
    // A real frame arrives first…
    act(() => {
      MockEventSource.instances[0].dispatch("message", {
        data: '{"0": "PKR/tagged_cam/PKR_260829140029.jpg"}',
      });
    });
    const toggle = screen.getByRole("checkbox", { name: "Live updates" });
    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(MockEventSource.instances[0].closed).toBe(true);
    // …and the card falls back to the honest placeholder, never the stale frame
    expect(
      liveSection()!.querySelector(".webcam-card__img"),
    ).toHaveAttribute("src", "https://cdn.example.org/poker-placeholder.jpg");
    expect(
      within(liveSection()!).getByText(
        /^Loaded \d{2}:\d{2} · placeholder frame$/,
      ),
    ).toBeInTheDocument();
    // Re-enabling opens a fresh feed
    fireEvent.click(toggle);
    expect(MockEventSource.instances).toHaveLength(2);
    expect(MockEventSource.instances[1].closed).toBe(false);
  });

  it("closes the feed when auto-refresh turns off or the tab hides, reopening when they return", () => {
    vi.stubGlobal("EventSource", MockEventSource);
    renderPage();
    const consent = screen.getByRole("checkbox", {
      name: /auto-refresh images/i,
    });
    fireEvent.click(consent);
    expect(MockEventSource.instances).toHaveLength(1);

    fireEvent.click(consent); // global off
    expect(MockEventSource.instances[0].closed).toBe(true);
    fireEvent.click(consent); // global back on
    expect(MockEventSource.instances).toHaveLength(2);

    setTabHidden(true); // tab hidden
    expect(MockEventSource.instances[1].closed).toBe(true);
    setTabHidden(false); // tab visible again
    expect(MockEventSource.instances).toHaveLength(3);
    expect(MockEventSource.instances[2].closed).toBe(false);
  });

  it("reverts to the placeholder frame whenever the feed stops, even after live frames", () => {
    vi.stubGlobal("EventSource", MockEventSource);
    renderPage();
    const consent = screen.getByRole("checkbox", {
      name: /auto-refresh images/i,
    });
    fireEvent.click(consent);
    act(() => {
      MockEventSource.instances[0].dispatch("message", {
        data: '{"0": "PKR/tagged_cam/PKR_260829140029.jpg"}',
      });
    });
    expect(liveSection()!.querySelector(".webcam-card__img")).toHaveAttribute(
      "src",
      "https://allsky.example.org/PKR/tagged_cam/PKR_260829140029.jpg",
    );
    // Global consent off – the last real frame must not linger under a
    // "placeholder frame" label
    fireEvent.click(consent);
    expect(liveSection()!.querySelector(".webcam-card__img")).toHaveAttribute(
      "src",
      "https://cdn.example.org/poker-placeholder.jpg",
    );
    expect(
      within(liveSection()!).getByText(
        /^Loaded \d{2}:\d{2} · placeholder frame$/,
      ),
    ).toBeInTheDocument();
    expect(
      within(liveSection()!).queryByText(/live feed updates every/i),
    ).toBeNull();
  });

  it("never reloads the live card on cadence intervals – only the SSE feed moves it", () => {
    vi.useFakeTimers();
    vi.stubGlobal("EventSource", MockEventSource);
    renderPage();
    fireEvent.click(
      screen.getByRole("checkbox", { name: /auto-refresh images/i }),
    );
    const liveImg = liveSection()!.querySelector(".webcam-card__img")!;
    act(() => vi.advanceTimersByTime(30 * 60_000));
    expect(liveImg).toHaveAttribute(
      "src",
      "https://cdn.example.org/poker-placeholder.jpg",
    );
  });

  it("hides the live cam from the gallery and restores it from the Hidden sources dialog", () => {
    renderPage();
    fireEvent.click(
      screen.getByRole("button", { name: "Hide Poker Flat Live" }),
    );
    expect(liveSection()).toBeNull();
    expect(
      screen.getByRole("button", { name: "Hidden sources (1)" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Hidden sources/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Show Poker Flat Live" }),
    );
    expect(liveSection()).not.toBeNull();
  });
});