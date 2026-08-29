import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Webcams from "./webcams";
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
    // Image regions (2) + Twitch stream + Webcam links
    expect(screen.getAllByRole("link", { name: "Jump to top" })).toHaveLength(4);
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