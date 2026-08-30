import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Webcams from "./webcams";
import {
  AUTO_REFRESH_STORAGE_KEY,
  WEBCAM_PANELS_STORAGE_KEY,
} from "../../../data/webcam-storage";
import type { WebcamEntry } from "../../../data/webcams";

const fixtureEntries: WebcamEntry[] = [
  {
    type: "image",
    id: "aurora-ridge",
    name: "Aurora Ridge",
    region: "North America",
    country: "Canada",
    latitude: 56.4,
    longitude: -94.71,
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
    region: "North America",
    country: "Canada",
    latitude: 51.1,
    longitude: -95.88,
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
    region: "North America",
    country: "Canada",
    latitude: 53.0,
    longitude: -94.71,
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
    region: "Nordic",
    country: "Norway",
    latitude: 69.6,
    longitude: 18.96,
    operator: "Test Observatory",
    imageUrl: "https://cdn.example.org/north-star.jpg",
    cadenceMinutes: 5,
    refreshable: true,
    license: "Free with credit – Test Observatory",
    note: null,
    alt: "North Star, Nordic – current sky view",
    siteUrl: "https://example.org/north-star",
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
    type: "link",
    id: "midnight-glacier",
    name: "Midnight Glacier",
    region: "Nordic",
    country: "Iceland",
    operator: "Glacier TV",
    url: "https://glacier.example.com",
    kind: "youtube",
  },
  {
    type: "link",
    id: "tasman-still",
    name: "Tasman Still",
    region: "rest",
    country: "New Zealand",
    operator: "Tasman Cams",
    url: "https://tasman.example.com",
    kind: "http-only",
  },
  {
    type: "link",
    id: "alpine-peak",
    name: "Alpine Peak",
    region: "rest",
    country: "Switzerland",
    operator: "Alpine Cams",
    url: "https://alpine.example.com",
    kind: "player",
  },
];

// The fixture's curated subset mirrors the registry contract: image cards
// with longitude, plus the Twitch stream, in the fixed display order.
const fixtureCuratedIds = [
  "aurora-ridge",
  "northern-lights",
  "still-sky",
  "north-star",
];

// A January night – the sun is below the horizon at every fixture station,
// so the curated list shows its full set. The darkness gate is exercised with
// dedicated `now` values instead.
const winterNight = new Date("2026-01-15T03:00:00Z");

const pageProps = {
  entries: fixtureEntries,
  curatedIds: fixtureCuratedIds,
  now: winterNight,
};

const renderPage = () => render(<Webcams {...pageProps} />);

/** The full-gallery view: everything the page can show, filter and hidden settings active. */
const renderSelectionPage = () => {
  const view = renderPage();
  fireEvent.click(screen.getByRole("tab", { name: "My selection" }));
  return view;
};

const openFilter = () => {
  fireEvent.click(screen.getByRole("button", { name: /^Filter/ }));
  return document.querySelector(
    "dialog.webcams__filter-dialog",
  ) as HTMLDialogElement;
};

describe("Webcams page", () => {
  beforeEach(() => {
    localStorage.clear();
  });

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
      within(card).getByText(/^Loaded \d{2}:\d{2} · Refreshes every 5 min$/),
    ).toBeInTheDocument();
    // Attribution carries the operator as the source link; the licence line is gone
    const source = within(card).getByText(/^Source:/);
    expect(source).toHaveTextContent("Test Observatory");
    const sourceLink = within(source).getByRole("link", {
      name: "Test Observatory",
    });
    expect(sourceLink).toHaveAttribute(
      "href",
      "https://example.org/north-star",
    );
    expect(sourceLink).toHaveAttribute("target", "_blank");
    expect(sourceLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(card).queryByText(/licence/i)).not.toBeInTheDocument();
    expect(
      within(card).queryByRole("link", { name: /visit site/i }),
    ).toBeNull();
    expect(card.querySelector(".webcam-card__img")).toHaveAttribute(
      "src",
      "https://cdn.example.org/north-star.jpg",
    );
  });

  it("shows the seasonal note on a card appended to the freshness line and renders panoramic cards last as full-row banners", () => {
    renderSelectionPage();
    const card = screen.getByText(/Aurora Ridge · 56\.4°N/).closest("article")!;
    expect(
      within(card).getByText(
        /^Loaded \d{2}:\d{2} · Refreshes every 2 min · \(seasonal\)$/,
      ),
    ).toBeInTheDocument();
    expect(card).toHaveClass("webcam-card--panoramic");
    expect(card.querySelector(".webcam-card__flag")).toHaveAttribute(
      "alt",
      "Canada",
    );
    // Within its region, the panoramic card comes after the regular ones
    const northAmericaSection = document
      .getElementById("webcams-region-North America")!
      .closest("section")!;
    const cards = Array.from(
      northAmericaSection.querySelectorAll(".webcam-card"),
    );
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
    renderSelectionPage();
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
      // Jump to top reuses the jump-pill style (ticket 05)
      expect(top).toHaveClass("webcams__jump");
    }
    // Image regions (2) + Webcam links
    expect(screen.getAllByRole("link", { name: "Jump to top" })).toHaveLength(
      3,
    );
  });

  it("renders a Jump to row with a pill per section heading", () => {
    renderSelectionPage();
    const jumps = screen.getByRole("navigation", { name: /webcams sections/i });
    expect(within(jumps).getByText(/^Jump to:/)).toBeInTheDocument();
    for (const [label, id] of [
      ["Nordic", "webcams-region-Nordic"],
      ["North America", "webcams-region-North America"],
      ["Webcam links", "webcams-links"],
    ]) {
      const pill = within(jumps).getByRole("link", { name: label });
      expect(pill).toHaveAttribute("href", `#${id}`);
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it("groups image cards by region in the fixed display order", () => {
    renderSelectionPage();
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    // Nordic (index 0) before North America (index 1) in WEBCAM_REGION_ORDER
    expect(headings.indexOf("Nordic")).toBeLessThan(
      headings.indexOf("North America"),
    );
  });

  it("collapses a region via its disclosure toggle and restores it", () => {
    renderSelectionPage();
    const toggle = screen.getByRole("button", { name: "Nordic" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeNull();
    // The Twitch stream card in the Nordic region hides with it
    expect(screen.queryByTitle("Night Sky Live – live on Twitch")).toBeNull();
    // Sibling regions stay open
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: /Northern Lights · 51\.1°N/,
      }),
    ).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
  });

  it("collapses the Webcam links section via its disclosure toggle", () => {
    renderSelectionPage();
    const toggle = screen.getByRole("button", { name: "Webcam links" });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Midnight Glacier" })).toBeNull();
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
  });

  it("groups link rows by region with the UK first and Other regions last", () => {
    renderSelectionPage();
    const linksSection = document.querySelector(".webcams__links")!;
    const h3s = Array.from(linksSection.querySelectorAll("h3")).map((h) =>
      h.textContent?.trim(),
    );
    // Fixture link regions: Nordic (one Iceland row) then Other regions
    expect(h3s[0]).toBe("Nordic");
    expect(h3s[h3s.length - 1]).toBe("Other regions");
  });

  it("shows a group flag on uniform-country link sections and a flag per row in mixed sections", () => {
    renderSelectionPage();
    // The fixture Nordic section holds one Iceland row → the group heading
    // carries the Iceland flag instead of the row
    const nordicTitle = document.querySelector(
      ".webcams__links-region .webcams__links-region-title",
    )!;
    expect(nordicTitle.querySelector("img")).toHaveAttribute("alt", "Iceland");
    // The Other regions section mixes New Zealand and Switzerland → per-row flags
    const restRows = Array.from(document.querySelectorAll(".webcam-link-row"));
    const alts = restRows
      .map((row) =>
        row.querySelector(".webcam-link-row__flag")?.getAttribute("alt"),
      )
      .filter((alt): alt is string => alt !== undefined);
    expect(alts).toContain("New Zealand");
    expect(alts).toContain("Switzerland");
  });

  it("renders the Twitch embed with a title, no autoplay, and a source attribution to the operator's site", () => {
    renderPage();
    const iframe = screen.getByTitle("Night Sky Live – live on Twitch");
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
    expect(sourceLink).toHaveAttribute(
      "href",
      "https://example.org/night-sky-live",
    );
    expect(sourceLink).toHaveAttribute("target", "_blank");
    // No autoplay copy, no separate watch link
    expect(
      screen.queryByText(/nothing streams until you press play/i),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: /watch live on twitch/i }),
    ).toBeNull();
  });

  it("renders link rows after the image cards, with station, flag and kind note", () => {
    renderSelectionPage();
    const text = document.body.textContent ?? "";
    const firstLink = text.indexOf("Midnight Glacier");
    const lastCard = text.lastIndexOf("North Star · 69.6°N");
    const twitch = text.indexOf("Night Sky Live");
    expect(firstLink).toBeGreaterThan(lastCard);
    expect(firstLink).toBeGreaterThan(twitch);

    const row = screen
      .getByRole("link", { name: "Tasman Still" })
      .closest("li")!;
    // The country lives in the row flag and the operator is not repeated –
    // the meta line ("New Zealand · Tasman Cams") is gone
    expect(within(row).queryByText(/New Zealand/)).toBeNull();
    expect(within(row).queryByText(/Tasman Cams/)).toBeNull();
    expect(within(row).getByText("Webcam")).toBeInTheDocument();
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
    const dialog = trigger
      .closest("article")!
      .querySelector("dialog.image-modal") as HTMLDialogElement;
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
    const trigger = screen.getByRole("button", {
      name: /north star, full size/i,
    });
    fireEvent.click(trigger);
    const dialog = trigger
      .closest("article")!
      .querySelector("dialog.image-modal") as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(dialog.open).toBe(false);
  });

  it("names the coverage gaps and links the EarthCam world map for self-service", () => {
    renderSelectionPage();
    const linksSection = document.querySelector(".webcams__links")!;
    expect(
      within(linksSection as HTMLElement).getByText(/looking for more\?/i),
    ).toBeInTheDocument();
    expect(
      within(linksSection as HTMLElement).getByText(/from around the world/i),
    ).toBeInTheDocument();
    const earthcam = screen.getByRole("link", { name: /earthcam/i });
    expect(earthcam).toHaveAttribute(
      "href",
      "https://www.earthcam.com/mapsearch/",
    );
    expect(earthcam).toHaveAttribute("target", "_blank");
  });
});

describe("Webcams viewing modes", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders three tabs under the heading with Relevant now selected by default and its description in the panel", () => {
    renderPage();
    const tablist = screen.getByRole("tablist", { name: "Webcam views" });
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Relevant now",
      "My selection",
      "All cameras",
    ]);
    const relevant = within(tablist).getByRole("tab", { name: "Relevant now" });
    expect(relevant).toHaveAttribute("aria-selected", "true");
    expect(relevant).toHaveAttribute("tabindex", "0");
    expect(
      within(tablist).getByRole("tab", { name: "My selection" }),
    ).toHaveAttribute("tabindex", "-1");
    // The panel is labelled by the active tab and carries its description
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute(
      "aria-labelledby",
      "webcams-view-tab-curated",
    );
    expect(
      within(panel).getByText(/handpicked for reliability/i),
    ).toBeInTheDocument();
  });

  it("switches the view and its description on tab click", () => {
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "All cameras" }));
    expect(screen.getByRole("tab", { name: "All cameras" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Relevant now" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute("aria-labelledby", "webcams-view-tab-all");
    expect(within(panel).getByText(/complete gallery/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "My selection" }));
    expect(
      within(screen.getByRole("tabpanel")).getByText(/your personal gallery/i),
    ).toBeInTheDocument();
  });

  it("supports automatic-activation arrow keys and Home/End", () => {
    renderPage();
    screen.getByRole("tab", { name: "Relevant now" }).focus();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Relevant now" }), {
      key: "ArrowRight",
    });
    expect(screen.getByRole("tab", { name: "My selection" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "My selection" })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("tab", { name: "My selection" }), {
      key: "End",
    });
    expect(screen.getByRole("tab", { name: "All cameras" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.keyDown(screen.getByRole("tab", { name: "All cameras" }), {
      key: "Home",
    });
    expect(screen.getByRole("tab", { name: "Relevant now" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.keyDown(screen.getByRole("tab", { name: "Relevant now" }), {
      key: "ArrowLeft",
    });
    expect(screen.getByRole("tab", { name: "All cameras" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("persists the selected tab across a fresh mount", () => {
    const { unmount } = renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "All cameras" }));
    expect(localStorage.getItem("sw:webcams:view:v1")).toBe(
      JSON.stringify("all"),
    );
    unmount();
    render(<Webcams {...pageProps} />);
    expect(screen.getByRole("tab", { name: "All cameras" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("switching tabs never touches the persisted filter and hidden settings", () => {
    renderSelectionPage();
    fireEvent.click(screen.getByRole("button", { name: "Hide North Star" }));
    const dialog = openFilter();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Nordic" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));

    // The curated view ignores both settings – every curated cam is back
    fireEvent.click(screen.getByRole("tab", { name: "Relevant now" }));
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: /Aurora Ridge · 56\.4°N/ }),
    ).toBeInTheDocument();

    // Back in My selection the settings still hold, untouched by the hopping
    fireEvent.click(screen.getByRole("tab", { name: "My selection" }));
    expect(
      screen.queryByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { level: 3, name: /Aurora Ridge · 56\.4°N/ }),
    ).toBeNull();
    expect(localStorage.getItem("sw:webcams:hidden:v1")).toBe(
      JSON.stringify(["north-star"]),
    );
    expect(localStorage.getItem("sw:webcams:filters:v1")).toBe(
      JSON.stringify({ v: 1, regions: ["Nordic"] }),
    );
  });
});

describe("Webcams toolbar per view", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows Refresh, Pin and auto-refresh in every view; Filter and Hidden sources only in My selection", () => {
    renderPage(); // Relevant now
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pin webcam to dashboard" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /auto-refresh/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Filter/ })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Hidden sources/ }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "All cameras" }));
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Filter/ })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Hidden sources/ }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "My selection" }));
    expect(screen.getByRole("button", { name: /^Filter/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Hidden sources/ }),
    ).toBeInTheDocument();
  });

  it("hides the per-card Hide buttons outside My selection", () => {
    renderPage();
    expect(screen.queryByRole("button", { name: "Hide North Star" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "All cameras" }));
    expect(screen.queryByRole("button", { name: "Hide North Star" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "My selection" }));
    expect(
      screen.getByRole("button", { name: "Hide North Star" }),
    ).toBeInTheDocument();
  });
});

describe("Relevant now – curated list and local darkness", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows every curated cam while all stations are dark (winter night)", () => {
    renderPage();
    for (const name of [
      "Aurora Ridge",
      "Northern Lights",
      "Still Sky",
      "North Star",
    ]) {
      expect(
        screen.getByRole("heading", { level: 3, name: new RegExp(`${name} ·`) }),
      ).toBeInTheDocument();
    }
    // The Twitch stream joins the curated gallery
    expect(screen.getByTitle("Night Sky Live – live on Twitch")).toBeInTheDocument();
  });

  it("hides a station while the sun is up there – mid-summer morning in Tromsø", () => {
    render(
      <Webcams
        {...pageProps}
        now={new Date("2026-07-15T03:00:00Z")}
      />,
    );
    // 69.6°N, 05:00 CEST in July – the sun is well up → the Nordic cam steps aside
    expect(
      screen.queryByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeNull();
    // The North American stations sit in their summer night (22:00 CDT) → still dark
    expect(
      screen.getByRole("heading", { level: 3, name: /Aurora Ridge · 56\.4°N/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: /Northern Lights · 51\.1°N/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: /Still Sky · 53\.0°N/ }),
    ).toBeInTheDocument();
    // The Twitch stream is not sun-gated
    expect(screen.getByTitle("Night Sky Live – live on Twitch")).toBeInTheDocument();
  });

  it("keeps only the Twitch stream when every station is in daylight", () => {
    render(
      <Webcams
        {...pageProps}
        now={new Date("2026-07-15T10:30:00Z")}
      />,
    );
    expect(
      screen.queryByRole("heading", { level: 3, name: /Aurora Ridge/ }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { level: 3, name: /North Star/ }),
    ).toBeNull();
    expect(screen.getByTitle("Night Sky Live – live on Twitch")).toBeInTheDocument();
  });

  it("ignores the user's filter and hidden settings in the curated view", () => {
    renderSelectionPage();
    fireEvent.click(screen.getByRole("button", { name: "Hide North Star" }));
    const dialog = openFilter();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Nordic" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(
      screen.queryByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Relevant now" }));
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: /Aurora Ridge · 56\.4°N/ }),
    ).toBeInTheDocument();
  });

  it("renders the curated gallery as one flat card grid with no region groupings or sections", () => {
    renderPage();
    // Every curated cam sits in a single grid – no collapsible regions
    expect(document.querySelector(".webcams__region")).toBeNull();
    expect(document.querySelector(".collapsible-panel")).toBeNull();
    expect(screen.queryByRole("button", { name: "Nordic" })).toBeNull();
    expect(screen.queryByRole("button", { name: "North America" })).toBeNull();
    // The cards and the Twitch stream all render in the same grid
    const cards = document.querySelectorAll(".webcams__cards .webcam-card");
    expect(cards.length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: /Aurora Ridge · 56\.4°N/ }),
    ).toBeInTheDocument();
    expect(screen.getByTitle("Night Sky Live – live on Twitch")).toBeInTheDocument();
  });

  it("excludes the live cam, link rows, the Jump to row and the Webcam links section from the curated view", () => {
    renderPage();
    expect(document.querySelector(".webcam-card--live")).toBeNull();
    expect(document.querySelector(".webcams__links")).toBeNull();
    expect(screen.queryByRole("link", { name: "Midnight Glacier" })).toBeNull();
    // Nothing to jump to – the section navigation is gone too
    expect(
      screen.queryByRole("navigation", { name: /webcams sections/i }),
    ).toBeNull();
  });
});

describe("All cameras view", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows every entry – hidden sources and the region filter do not apply", () => {
    renderSelectionPage();
    fireEvent.click(screen.getByRole("button", { name: "Hide North Star" }));
    const dialog = openFilter();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Nordic" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(
      screen.queryByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "All cameras" }));
    // Hidden and filtered entries are all back – cards, live cam and links
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: /Aurora Ridge · 56\.4°N/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: /Poker Flat Live · 65\.1°N/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Midnight Glacier" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tasman Still" })).toBeInTheDocument();
    expect(screen.getByTitle("Night Sky Live – live on Twitch")).toBeInTheDocument();
  });
});

describe("Webcams panel persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists a collapsed region section and restores it on a fresh mount", () => {
    const { unmount } = renderSelectionPage();
    fireEvent.click(screen.getByRole("button", { name: "Nordic" }));
    expect(localStorage.getItem(WEBCAM_PANELS_STORAGE_KEY)).toBe(
      JSON.stringify({ v: 1, closed: ["webcams-region-Nordic"] }),
    );
    unmount();
    render(<Webcams {...pageProps} />);
    const toggle = screen.getByRole("button", { name: "Nordic" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeNull();
  });

  it("persists the Webcam links section collapse across a fresh mount", () => {
    const { unmount } = renderSelectionPage();
    fireEvent.click(screen.getByRole("button", { name: "Webcam links" }));
    expect(localStorage.getItem(WEBCAM_PANELS_STORAGE_KEY)).toBe(
      JSON.stringify({ v: 1, closed: ["webcams-links"] }),
    );
    unmount();
    render(<Webcams {...pageProps} />);
    expect(
      screen.getByRole("button", { name: "Webcam links" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Midnight Glacier" })).toBeNull();
  });

  it("reopens a persisted collapsed section and clears it from storage", () => {
    localStorage.setItem(
      WEBCAM_PANELS_STORAGE_KEY,
      JSON.stringify({ v: 1, closed: ["webcams-region-Nordic"] }),
    );
    renderSelectionPage();
    const toggle = screen.getByRole("button", { name: "Nordic" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(localStorage.getItem(WEBCAM_PANELS_STORAGE_KEY)).toBe(
      JSON.stringify({ v: 1, closed: [] }),
    );
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
  });
});

describe("Webcams auto-refresh header (ticket 03)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps the heading and the view tabs in the header row, with the toolbar below them and above Jump to", () => {
    renderSelectionPage();
    const heading = screen.getByRole("heading", { level: 1, name: "Webcams" });
    const headerRow = heading.closest(".webcams__header") as HTMLElement;
    // The header row carries the heading and the tabs (as a tablist) – no
    // toolbar controls
    const tablist = within(headerRow).getByRole("tablist", {
      name: "Webcam views",
    });
    expect(within(tablist).getAllByRole("tab")).toHaveLength(3);
    expect(within(headerRow).queryByRole("button", { name: "Refresh" })).toBeNull();

    // Document order: header (heading + tabs) → toolbar → Jump to
    const toolbar = document.querySelector(".webcams__toolbar")!;
    const jumps = document.querySelector(".webcams__jumps")!;
    const order = (a: Element, b: Element) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(order(headerRow, toolbar)).toBeTruthy();
    expect(order(toolbar, jumps)).toBeTruthy();

    const refresh = within(toolbar as HTMLElement).getByRole("button", {
      name: "Refresh",
    });
    const filter = within(toolbar as HTMLElement).getByRole("button", {
      name: "Filter by region (0)",
    });
    const hidden = within(toolbar as HTMLElement).getByRole("button", {
      name: "Hidden sources (0)",
    });
    // Every toolbar control is an icon button carrying a collapsible label
    // span and a tooltip title – never an aria-label
    for (const button of [refresh, filter, hidden]) {
      expect(button).toHaveClass("btn--secondary");
      expect(button).not.toHaveAttribute("aria-label");
      expect(button.querySelector(".btn__label")).not.toBeNull();
      expect(button.querySelector("svg")).not.toBeNull();
    }
    expect(refresh.querySelector(".btn__label")).toHaveTextContent("Refresh");
  });

  it("renders the auto-refresh setting as a native checkbox, unchecked by default, with the cadence range in its label", () => {
    renderPage();
    const checkbox = screen.getByRole("checkbox", {
      name: /auto-refresh/i,
    });
    expect(checkbox.tagName).toBe("INPUT");
    expect(checkbox).not.toBeChecked();
    // The label carries the refresh time frame derived from the fixture's
    // refreshable cadences (2, 5, 10 min)
    expect(screen.getByText("Auto-refresh (2–10 min)")).toBeInTheDocument();
    // The honest data-use note lives in the control's tooltip
    expect(checkbox).toHaveAttribute(
      "title",
      "Reloads each image on its operator's cadence – uses data",
    );
    // No icon – the setting is a plain checkbox pill like Compact view
    expect(checkbox.closest("label")!.querySelector("svg")).toBeNull();
  });

  it("communicates active counts through the Filter and Hidden sources button labels, with no badge dot", () => {
    renderSelectionPage();
    const filter = screen.getByRole("button", {
      name: "Filter by region (0)",
    });
    const hidden = screen.getByRole("button", { name: "Hidden sources (0)" });
    expect(filter.querySelector(".btn__badge")).toBeNull();
    expect(hidden.querySelector(".btn__badge")).toBeNull();

    // A hidden source updates the Hidden sources label
    fireEvent.click(screen.getByRole("button", { name: "Hide North Star" }));
    const hiddenAfter = screen.getByRole("button", {
      name: "Hidden sources (1)",
    });
    expect(hiddenAfter.querySelector(".btn__badge")).toBeNull();

    // An applied filter updates the Filter label
    const dialog = openFilter();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Nordic" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    const filterAfter = screen.getByRole("button", {
      name: "Filter by region (1)",
    });
    expect(filterAfter.querySelector(".btn__badge")).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Hidden sources (1)" })
        .querySelector(".btn__badge"),
    ).toBeNull();
  });

  it("persists the auto-refresh setting and restores it on a fresh mount", () => {
    const { unmount } = render(<Webcams {...pageProps} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /auto-refresh/i }));
    expect(
      screen.getByRole("checkbox", { name: /auto-refresh/i }),
    ).toBeChecked();
    expect(localStorage.getItem(AUTO_REFRESH_STORAGE_KEY)).toBe("true");
    unmount();
    render(<Webcams {...pageProps} />);
    expect(
      screen.getByRole("checkbox", { name: /auto-refresh/i }),
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
    const freshnessBefore =
      within(auroraCard).getByText(/^Loaded /).textContent;
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
      /^Loaded \d{2}:\d{2} · Refreshes every 2 min( · \(seasonal\))?$/,
    );
  });

  it("reloads refreshable cards at their own cadence and never faster, leaving non-refreshable cards untouched", () => {
    renderPage();
    fireEvent.click(screen.getByRole("checkbox", { name: /auto-refresh/i }));
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
    renderSelectionPage();
    fireEvent.click(screen.getByRole("checkbox", { name: /auto-refresh/i }));
    const twitchSrc = screen
      .getByTitle("Night Sky Live – live on Twitch")
      .getAttribute("src");
    const linkHrefs = Array.from(
      document.querySelectorAll(".webcam-link-row a"),
    ).map((a) => a.getAttribute("href"));
    advance(20 * 60_000);
    expect(
      screen.getByTitle("Night Sky Live – live on Twitch").getAttribute("src"),
    ).toBe(twitchSrc);
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
    fireEvent.click(screen.getByRole("checkbox", { name: /auto-refresh/i }));
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
    renderSelectionPage();
    fireEvent.click(screen.getByRole("button", { name: "Hide North Star" }));
    expect(
      screen.queryByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeNull();
    expect(
      screen.queryByAltText("North Star, Nordic – current sky view"),
    ).toBeNull();
    expect(localStorage.getItem("sw:webcams:hidden:v1")).toBe(
      JSON.stringify(["north-star"]),
    );
    // Siblings stay
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: /Northern Lights · 51\.1°N/,
      }),
    ).toBeInTheDocument();
  });

  it("hides the Twitch card", () => {
    renderSelectionPage();
    fireEvent.click(
      screen.getByRole("button", { name: "Hide Night Sky Live" }),
    );
    expect(screen.queryByTitle(/night sky live/i)).toBeNull();
    expect(localStorage.getItem("sw:webcams:hidden:v1")).toBe(
      JSON.stringify(["night-sky-live"]),
    );
  });

  it("keeps hidden items out of the gallery under every region filter", () => {
    renderSelectionPage();
    fireEvent.click(
      screen.getByRole("button", { name: "Hide Northern Lights" }),
    );
    const dialog = openFilter();
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: "North America" }),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    // The visible North American card stays, the hidden one never returns
    expect(
      screen.getByRole("heading", { level: 3, name: /Aurora Ridge · 56\.4°N/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        level: 3,
        name: /Northern Lights · 51\.1°N/,
      }),
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
    renderSelectionPage();
    fireEvent.click(screen.getByRole("button", { name: "Hide North Star" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Hide Northern Lights" }),
    );
    expect(
      screen.getByRole("button", { name: "Hidden sources (2)" }),
    ).toBeInTheDocument();
    const dialog = openHiddenDialog();
    expect(dialog.open).toBe(true);
    // The entry names live in the name column; the Show buttons repeat them
    // in their sr-only spans, so scope to the name column
    expect(
      within(dialog).getByText("North Star", {
        selector: ".webcams__hidden-name",
      }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Northern Lights", {
        selector: ".webcams__hidden-name",
      }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Show North Star" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Show all" }),
    ).toBeInTheDocument();
  });

  it("restores a single hidden entry from the dialog and keeps the count live", () => {
    renderSelectionPage();
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
    renderSelectionPage();
    fireEvent.click(screen.getByRole("button", { name: "Hide North Star" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Hide Northern Lights" }),
    );
    const dialog = openHiddenDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Show all" }));
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: /Northern Lights · 51\.1°N/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hidden sources (0)" }),
    ).toBeInTheDocument();
    expect(localStorage.getItem("sw:webcams:hidden:v1")).toBe("[]");
  });

  it("closes on Escape and returns focus to the Hidden sources button", () => {
    renderSelectionPage();
    fireEvent.click(screen.getByRole("button", { name: "Hide North Star" }));
    const dialog = openHiddenDialog();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(dialog.open).toBe(false);
    expect(
      screen.getByRole("button", { name: "Hidden sources (1)" }),
    ).toHaveFocus();
  });

  it("shows an honest empty note when nothing is hidden", () => {
    renderSelectionPage();
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
    const { unmount } = renderSelectionPage();
    fireEvent.click(screen.getByRole("button", { name: "Hide North Star" }));
    unmount();
    render(<Webcams {...pageProps} />);
    expect(
      screen.queryByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Hidden sources (1)" }),
    ).toBeInTheDocument();
  });

  it("shows the honest empty state when the filter and hidden set leave nothing", () => {
    renderSelectionPage();
    // North America holds the three image cards plus the live cam – hide
    // them all, then filter to North America
    fireEvent.click(screen.getByRole("button", { name: "Hide Aurora Ridge" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Hide Northern Lights" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Hide Still Sky" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Hide Poker Flat Live" }),
    );
    const dialog = openFilter();
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: "North America" }),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
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
    renderSelectionPage();
    const dialog = openFilter();
    expect(dialog.open).toBe(true);
    // Fixture regions: Nordic, North America (incl. the live cam) and the "rest" bucket
    const checkboxes = within(dialog).getAllByRole("checkbox");
    expect(checkboxes.map((box) => box.getAttribute("name"))).toEqual([
      "Nordic",
      "North America",
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
    renderSelectionPage();
    const dialog = openFilter();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Nordic" }));
    // Draft only – both regions still visible while the dialog is open
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: /Northern Lights · 51\.1°N/,
      }),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(dialog.open).toBe(false);
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        level: 3,
        name: /Northern Lights · 51\.1°N/,
      }),
    ).toBeNull();
    // Link rows narrow too
    expect(screen.queryByRole("link", { name: "Tasman Still" })).toBeNull();
  });

  it("shows every webcam when no region is applied", () => {
    renderSelectionPage();
    const dialog = openFilter();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Nordic" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    const dialog2 = openFilter();
    fireEvent.click(within(dialog2).getByRole("checkbox", { name: "Nordic" }));
    fireEvent.click(within(dialog2).getByRole("button", { name: "Apply" }));
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: /Northern Lights · 51\.1°N/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Tasman Still" }),
    ).toBeInTheDocument();
  });

  it("Select all and Deselect all toggle the draft checkboxes without touching the gallery or the hidden set until Apply", () => {
    renderSelectionPage();
    // A hidden source must survive both toggles untouched
    fireEvent.click(screen.getByRole("button", { name: "Hide Still Sky" }));
    const dialog = openFilter();
    fireEvent.click(within(dialog).getByRole("button", { name: "Select all" }));
    for (const box of within(dialog).getAllByRole("checkbox")) {
      expect(box).toBeChecked();
    }
    // Draft only – everything still visible while the dialog is open
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    // Checking every region keeps every region – the whole gallery stays,
    // including the Nordic and "rest" link rows
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: /Northern Lights · 51\.1°N/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Midnight Glacier" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Alpine Peak" }),
    ).toBeInTheDocument();
    // The hidden source is untouched by either toggle
    expect(
      screen.queryByRole("heading", { level: 3, name: /Still Sky · 53\.0°N/ }),
    ).toBeNull();
    expect(localStorage.getItem("sw:webcams:hidden:v1")).toBe(
      JSON.stringify(["still-sky"]),
    );

    const dialog2 = openFilter();
    fireEvent.click(
      within(dialog2).getByRole("button", { name: "Deselect all" }),
    );
    for (const box of within(dialog2).getAllByRole("checkbox")) {
      expect(box).not.toBeChecked();
    }
    fireEvent.click(within(dialog2).getByRole("button", { name: "Apply" }));
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
    expect(localStorage.getItem("sw:webcams:hidden:v1")).toBe(
      JSON.stringify(["still-sky"]),
    );
  });

  it("persists the applied filter and restores it on a fresh mount", () => {
    const { unmount } = renderSelectionPage();
    const dialog = openFilter();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Nordic" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(localStorage.getItem("sw:webcams:filters:v1")).toBe(
      JSON.stringify({ v: 1, regions: ["Nordic"] }),
    );
    // A fresh visit (new mount) still filters – the persisted view applies
    unmount();
    render(<Webcams {...pageProps} />);
    expect(
      screen.getByRole("heading", { level: 3, name: /North Star · 69\.6°N/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        level: 3,
        name: /Northern Lights · 51\.1°N/,
      }),
    ).toBeNull();
  });

  it("labels the Filter button with the applied region count and returns focus to it on close", () => {
    renderSelectionPage();
    const dialog = openFilter();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Nordic" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(
      screen.getByRole("button", { name: "Filter by region (1)" }),
    ).toBeInTheDocument();
    const dialog2 = openFilter();
    fireEvent.keyDown(dialog2, { key: "Escape" });
    expect(dialog2.open).toBe(false);
    expect(
      screen.getByRole("button", { name: "Filter by region (1)" }),
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

  addEventListener(type: string, cb: (event: { data?: string }) => void): void {
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

  const liveCard = (): HTMLElement | null =>
    document.querySelector(".webcam-card--live");
  const liveSection = (): HTMLElement | null =>
    liveCard()?.closest("section") ?? null;

  const setTabHidden = (hidden: boolean) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: hidden ? "hidden" : "visible",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
  };

  it("renders the live cam inside the North America section with station, latitude, placeholder, attribution, a Live updates toggle and a Hide control", () => {
    renderSelectionPage();
    const section = liveSection()!;
    expect(section).not.toBeNull();
    expect(
      within(section).getByRole("heading", {
        level: 2,
        name: "North America",
      }),
    ).toBeInTheDocument();
    expect(
      within(section).getByRole("heading", {
        level: 3,
        name: /Poker Flat Live · 65\.1°N/,
      }),
    ).toBeInTheDocument();
    const flag = liveCard()!.querySelector(".webcam-card__flag")!;
    expect(flag).toHaveAttribute("alt", "Alaska, US");
    expect(liveCard()!.querySelector(".webcam-card__img")).toHaveAttribute(
      "src",
      "https://cdn.example.org/poker-placeholder.jpg",
    );
    expect(liveCard()!.querySelector(".webcam-card__img")).toHaveAttribute(
      "alt",
      "Poker Flat Live, Alaska – current sky view",
    );
    expect(within(liveCard()!).getByText(/^Source:/)).toHaveTextContent(
      "Geophysical Institute",
    );
    // The Live updates toggle lives in its own actions row; the Hide button
    // sits in the card title row next to the station name
    const actions = section.querySelector(".webcam-card__actions")!;
    const toggle = within(actions as HTMLElement).getByRole("checkbox", {
      name: "Live updates",
    });
    expect(toggle).toBeChecked();
    expect(toggle).toBeDisabled(); // no feed without the global consent
    const head = liveCard()!.querySelector(".webcam-card__head")!;
    expect(
      within(head as HTMLElement).getByRole("button", {
        name: "Hide Poker Flat Live",
      }),
    ).toBeInTheDocument();
  });

  it("spans one card column while idle and two while the feed is active", () => {
    renderSelectionPage();
    const card = () => document.querySelector(".webcam-card--live")!;
    // Auto-refresh off – the feed is idle, one column wide
    expect(card()).not.toHaveClass("webcam-card--wide");
    fireEvent.click(screen.getByRole("checkbox", { name: /auto-refresh/i }));
    expect(card()).toHaveClass("webcam-card--wide");
    // Consent off again – back to one column
    fireEvent.click(screen.getByRole("checkbox", { name: /auto-refresh/i }));
    expect(card()).not.toHaveClass("webcam-card--wide");
  });

  it("spans the Twitch stream card two columns wide", () => {
    renderSelectionPage();
    expect(document.querySelector(".webcam-card--stream")).toHaveClass(
      "webcam-card--wide",
    );
  });

  it("follows the operator's SSE feed while auto-refresh is on and the tab is visible", () => {
    vi.stubGlobal("EventSource", MockEventSource);
    renderSelectionPage();
    const consent = screen.getByRole("checkbox", { name: /auto-refresh/i });
    expect(MockEventSource.instances).toHaveLength(0); // no feed without consent
    fireEvent.click(consent);
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe(
      "https://allsky.example.org/src/checkLive.php?cam=poker-flat",
    );
    const img = liveCard()!.querySelector(".webcam-card__img")!;
    act(() => {
      MockEventSource.instances[0].dispatch("message", {
        data: '{"0": "PKR/tagged_cam/PKR_260829140029.jpg"}',
      });
    });
    expect(img).toHaveAttribute(
      "src",
      "https://allsky.example.org/PKR/tagged_cam/PKR_260829140029.jpg",
    );
    expect(
      liveCard()!.querySelector(".webcam-card__freshness"),
    ).toHaveTextContent(
      /^Loaded \d{2}:\d{2} · live feed updates every ~5–15 s$/,
    );
  });

  it("shows an honest live-feed-unavailable fallback with the operator link on feed failure, and recovers on the next frame", () => {
    vi.stubGlobal("EventSource", MockEventSource);
    renderSelectionPage();
    fireEvent.click(screen.getByRole("checkbox", { name: /auto-refresh/i }));
    act(() => {
      MockEventSource.instances[0].dispatch("error");
    });
    const section = liveSection()!;
    expect(liveCard()!.querySelector(".webcam-card__img")).toBeNull();
    const fallback = within(section).getByText(/live feed unavailable/i);
    expect(
      within(fallback).getByRole("link", { name: /operator's site/i }),
    ).toHaveAttribute("href", "https://example.org/poker-flat");
    // No freshness claim and no Live updates toggle while the feed is down
    expect(within(section).queryByText(/live feed updates every/i)).toBeNull();
    expect(
      within(section).queryByRole("checkbox", { name: "Live updates" }),
    ).toBeNull();
    // The next frame restores the image
    act(() => {
      MockEventSource.instances[0].dispatch("message", {
        data: '{"0": "images/poker-notdark.jpg"}',
      });
    });
    expect(liveCard()!.querySelector(".webcam-card__img")).toHaveAttribute(
      "src",
      "https://allsky.example.org/images/poker-notdark.jpg",
    );
  });

  it("lets the user disable live updates on the card, closing the feed and showing the placeholder", () => {
    vi.stubGlobal("EventSource", MockEventSource);
    renderSelectionPage();
    fireEvent.click(screen.getByRole("checkbox", { name: /auto-refresh/i }));
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
    expect(liveCard()!.querySelector(".webcam-card__img")).toHaveAttribute(
      "src",
      "https://cdn.example.org/poker-placeholder.jpg",
    );
    expect(
      within(liveCard()!).getByText(/^Loaded \d{2}:\d{2} · placeholder frame$/),
    ).toBeInTheDocument();
    // Re-enabling opens a fresh feed
    fireEvent.click(toggle);
    expect(MockEventSource.instances).toHaveLength(2);
    expect(MockEventSource.instances[1].closed).toBe(false);
  });

  it("closes the feed when auto-refresh turns off or the tab hides, reopening when they return", () => {
    vi.stubGlobal("EventSource", MockEventSource);
    renderSelectionPage();
    const consent = screen.getByRole("checkbox", { name: /auto-refresh/i });
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
    renderSelectionPage();
    const consent = screen.getByRole("checkbox", { name: /auto-refresh/i });
    fireEvent.click(consent);
    act(() => {
      MockEventSource.instances[0].dispatch("message", {
        data: '{"0": "PKR/tagged_cam/PKR_260829140029.jpg"}',
      });
    });
    expect(liveCard()!.querySelector(".webcam-card__img")).toHaveAttribute(
      "src",
      "https://allsky.example.org/PKR/tagged_cam/PKR_260829140029.jpg",
    );
    // Global consent off – the last real frame must not linger under a
    // "placeholder frame" label
    fireEvent.click(consent);
    expect(liveCard()!.querySelector(".webcam-card__img")).toHaveAttribute(
      "src",
      "https://cdn.example.org/poker-placeholder.jpg",
    );
    expect(
      within(liveCard()!).getByText(/^Loaded \d{2}:\d{2} · placeholder frame$/),
    ).toBeInTheDocument();
    expect(
      within(liveCard()!).queryByText(/live feed updates every/i),
    ).toBeNull();
  });

  it("never reloads the live card on cadence intervals – only the SSE feed moves it", () => {
    vi.useFakeTimers();
    vi.stubGlobal("EventSource", MockEventSource);
    renderSelectionPage();
    fireEvent.click(screen.getByRole("checkbox", { name: /auto-refresh/i }));
    const liveImg = liveCard()!.querySelector(".webcam-card__img")!;
    act(() => vi.advanceTimersByTime(30 * 60_000));
    expect(liveImg).toHaveAttribute(
      "src",
      "https://cdn.example.org/poker-placeholder.jpg",
    );
  });

  it("hides the live cam from the gallery and restores it from the Hidden sources dialog", () => {
    renderSelectionPage();
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

describe("Webcams button polish (ticket 05)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("turns every Hide button into an icon button in the title row with a crossed-out-eye, a tooltip and an sr-only name matching it", () => {
    renderSelectionPage();
    for (const name of [
      "Hide Aurora Ridge",
      "Hide North Star",
      "Hide Night Sky Live",
      "Hide Poker Flat Live",
    ]) {
      const button = screen.getByRole("button", { name });
      expect(button).toHaveClass("btn--secondary");
      expect(button).toHaveAttribute("title", name);
      // Sits next to the card title, never in a bottom actions row
      expect(button.closest(".webcam-card__head")).not.toBeNull();
      // No visible text – the sr-only span repeats the tooltip verbatim
      expect(button.querySelector(".btn__label")).toBeNull();
      expect(button.querySelector("svg")).not.toBeNull();
      expect(button.querySelector(".sr-only")).toHaveTextContent(name);
    }
  });

  it("styles Apply as the primary action and the rest of the filter dialog as secondary", () => {
    renderSelectionPage();
    const dialog = openFilter();
    expect(within(dialog).getByRole("button", { name: "Apply" })).toHaveClass(
      "btn--primary",
    );
    for (const name of ["Select all", "Deselect all", "Cancel"]) {
      expect(within(dialog).getByRole("button", { name })).toHaveClass(
        "btn--secondary",
      );
    }
  });
});

describe("Webcams pinning (dashboard pins)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("opens pinning mode from the toolbar with the instruction strip, and Cancel leaves storage untouched", () => {
    renderSelectionPage();
    const pinButton = screen.getByRole("button", {
      name: "Pin webcam to dashboard",
    });
    expect(pinButton).toHaveClass("btn--secondary");
    expect(pinButton).toHaveAttribute("title", "Pin webcam to dashboard");
    expect(pinButton).toHaveAttribute("aria-expanded", "false");
    expect(pinButton).toHaveAttribute("aria-controls", "webcams-pin-strip");
    fireEvent.click(pinButton);
    expect(pinButton).toHaveAttribute("aria-expanded", "true");
    // The strip's note and both actions keep their text at every size
    expect(
      screen.getByText(
        /Pin 1 or 2 webcams that you would like to include in your Dashboard/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toHaveClass(
      "btn--primary",
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass(
      "btn--secondary",
    );
    // Card checkboxes appear – image, live and Twitch cards alike
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Pin Aurora Ridge webcam" }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Pin Poker Flat Live webcam" }),
    );
    expect(
      screen.getByRole("checkbox", { name: "Pin Night Sky Live webcam" }),
    ).toBeInTheDocument();
    // Each label leads its text
    // bottom, so the name stays the plain visible text
    const pinLabel = screen
      .getByRole("checkbox", { name: "Pin Aurora Ridge webcam" })
      .closest("label")!;
    expect(pinLabel.closest("article")!.lastElementChild).toBe(pinLabel);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(localStorage.getItem("sw:webcams:pins:v1")).toBeNull();
    expect(pinButton).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("checkbox", { name: "Pin Aurora Ridge webcam" }),
    ).toBeNull();
  });

  it("drafts at most two pins – further boxes lock until one is unchecked – and Apply persists them", () => {
    renderPage();
    fireEvent.click(
      screen.getByRole("button", { name: "Pin webcam to dashboard" }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Pin Aurora Ridge webcam" }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Pin Northern Lights webcam" }),
    );
    const third = screen.getByRole("checkbox", {
      name: "Pin Still Sky webcam",
    });
    expect(third).toBeDisabled();
    // Unchecking one unlocks the rest
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Pin Aurora Ridge webcam" }),
    );
    expect(
      screen.getByRole("checkbox", { name: "Pin Still Sky webcam" }),
    ).toBeEnabled();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Pin Still Sky webcam" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(localStorage.getItem("sw:webcams:pins:v1")).toBe(
      JSON.stringify({ v: 1, pins: ["northern-lights", "still-sky"] }),
    );
    expect(
      screen.getByRole("button", { name: "Pin webcam to dashboard" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("re-entering pinning mode pre-checks the applied pins, and unpinning then Apply clears them", () => {
    localStorage.setItem(
      "sw:webcams:pins:v1",
      JSON.stringify({ v: 1, pins: ["aurora-ridge"] }),
    );
    renderPage();
    fireEvent.click(
      screen.getByRole("button", { name: "Pin webcam to dashboard" }),
    );
    expect(
      screen.getByRole("checkbox", { name: "Pin Aurora Ridge webcam" }),
    ).toBeChecked();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Pin Aurora Ridge webcam" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(localStorage.getItem("sw:webcams:pins:v1")).toBe(
      JSON.stringify({ v: 1, pins: [] }),
    );
  });

  it("lists pinned cams that aren't visible in the current view, with working Unpin toggles", () => {
    localStorage.setItem(
      "sw:webcams:pins:v1",
      JSON.stringify({ v: 1, pins: ["poker-flat-live", "aurora-ridge"] }),
    );
    renderPage(); // curated – the live cam is off-screen here
    fireEvent.click(
      screen.getByRole("button", { name: "Pin webcam to dashboard" }),
    );
    const strip = document.getElementById("webcams-pin-strip")!;
    const offscreen = within(strip)
      .getByText(/pinned but not shown in this view/i)
      .closest(".webcams__pin-strip__offscreen")!;
    const unpin = within(offscreen as HTMLElement).getByRole("checkbox", {
      name: /Unpin Poker Flat Live/,
    });
    expect(unpin).toBeChecked();
    // The visible pinned cam keeps its normal card checkbox
    expect(
      screen.getByRole("checkbox", { name: "Pin Aurora Ridge webcam" }),
    ).toBeChecked();
    // Unpinning edits the draft – storage stays untouched until Apply
    fireEvent.click(unpin);
    expect(unpin).not.toBeChecked();
    expect(localStorage.getItem("sw:webcams:pins:v1")).toBe(
      JSON.stringify({ v: 1, pins: ["poker-flat-live", "aurora-ridge"] }),
    );
    fireEvent.click(within(strip).getByRole("button", { name: "Apply" }));
    expect(localStorage.getItem("sw:webcams:pins:v1")).toBe(
      JSON.stringify({ v: 1, pins: ["aurora-ridge"] }),
    );
  });

  it("unpinning an off-screen pin frees a slot for the visible cards", () => {
    localStorage.setItem(
      "sw:webcams:pins:v1",
      JSON.stringify({ v: 1, pins: ["poker-flat-live", "aurora-ridge"] }),
    );
    renderPage();
    fireEvent.click(
      screen.getByRole("button", { name: "Pin webcam to dashboard" }),
    );
    // Two drafted pins – every visible checkbox is locked
    expect(
      screen.getByRole("checkbox", { name: "Pin Northern Lights webcam" }),
    ).toBeDisabled();
    const strip = document.getElementById("webcams-pin-strip")!;
    fireEvent.click(
      within(strip).getByRole("checkbox", { name: /Unpin Poker Flat Live/ }),
    );
    // A slot is free – the visible cards unlock and a new pin can be drafted
    expect(
      screen.getByRole("checkbox", { name: "Pin Northern Lights webcam" }),
    ).toBeEnabled();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Pin Northern Lights webcam" }),
    );
    fireEvent.click(within(strip).getByRole("button", { name: "Apply" }));
    expect(localStorage.getItem("sw:webcams:pins:v1")).toBe(
      JSON.stringify({ v: 1, pins: ["aurora-ridge", "northern-lights"] }),
    );
  });

  it("keeps hidden sources' pins reachable from the strip", () => {
    renderSelectionPage();
    fireEvent.click(
      screen.getByRole("button", { name: "Pin webcam to dashboard" }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Pin North Star webcam" }),
    );
    fireEvent.click(
      within(document.getElementById("webcams-pin-strip")!).getByRole(
        "button",
        { name: "Apply" },
      ),
    );
    // Hide the pinned cam – it leaves the gallery but stays pinned
    fireEvent.click(screen.getByRole("button", { name: "Hide North Star" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Pin webcam to dashboard" }),
    );
    const strip = document.getElementById("webcams-pin-strip")!;
    const unpin = within(strip).getByRole("checkbox", { name: /Unpin North Star/ });
    expect(unpin).toBeChecked();
    fireEvent.click(unpin);
    fireEvent.click(within(strip).getByRole("button", { name: "Apply" }));
    expect(localStorage.getItem("sw:webcams:pins:v1")).toBe(
      JSON.stringify({ v: 1, pins: [] }),
    );
  });
});