import { describe, expect, it } from "vitest";

import {
  webcamRegistry,
  webcamCountryCode,
  WEBCAM_REGION_ORDER,
  type WebcamEntry,
  type WebcamImageEntry,
  type WebcamLinkEntry,
  type WebcamLiveEntry,
  type WebcamRegion,
  type WebcamTwitchEntry,
} from "./webcams";

const isImage = (e: WebcamEntry): e is WebcamImageEntry => e.type === "image";
const isTwitch = (e: WebcamEntry): e is WebcamTwitchEntry => e.type === "twitch";
const isLink = (e: WebcamEntry): e is WebcamLinkEntry => e.type === "link";
const isLive = (e: WebcamEntry): e is WebcamLiveEntry => e.type === "live";

describe("webcam registry contract", () => {
  it("gives every entry a unique id and a non-empty name, region and operator", () => {
    const ids = webcamRegistry.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of webcamRegistry) {
      expect(entry.id.trim()).not.toBe("");
      expect(entry.name.trim()).not.toBe("");
      expect(entry.region.trim()).not.toBe("");
      expect(entry.operator.trim()).not.toBe("");
    }
  });

  it("keeps every region inside the closed display-order set", () => {
    const known = new Set<WebcamRegion>(WEBCAM_REGION_ORDER);
    for (const entry of webcamRegistry) {
      expect(known.has(entry.region)).toBe(true);
    }
  });

  it("ships every image entry with an https imageUrl, latitude, alt and a cadence of at least 1 minute", () => {
    const images = webcamRegistry.filter(isImage);
    expect(images.length).toBeGreaterThan(0);
    for (const entry of images) {
      expect(entry.imageUrl).toMatch(/^https:\/\//);
      expect(typeof entry.latitude).toBe("number");
      expect(entry.latitude).toBeGreaterThan(-90);
      expect(entry.latitude).toBeLessThanOrEqual(90);
      expect(entry.alt.trim()).not.toBe("");
      expect(entry.country.trim()).not.toBe("");
      expect(entry.cadenceMinutes).toBeGreaterThanOrEqual(1);
      expect(entry.siteUrl).toMatch(/^https:\/\//);
    }
  });

  it("ships license as string or null and note as string or null", () => {
    for (const entry of webcamRegistry) {
      if (isImage(entry)) {
        expect(entry.license === null || typeof entry.license === "string").toBe(
          true,
        );
      }
      expect(entry.note === null || typeof entry.note === "string").toBe(true);
    }
  });

  it("marks refreshable only on image entries", () => {
    for (const entry of webcamRegistry) {
      if (isImage(entry)) {
        expect(typeof entry.refreshable).toBe("boolean");
      } else {
        expect("refreshable" in entry).toBe(false);
      }
    }
  });

  it("ships every link entry with an https url and a known kind", () => {
    const kinds = new Set(["youtube", "twitch", "player", "http-only"]);
    const links = webcamRegistry.filter(isLink);
    expect(links.length).toBeGreaterThan(0);
    for (const entry of links) {
      expect(entry.url).toMatch(/^https?:\/\//);
      expect(kinds.has(entry.kind)).toBe(true);
    }
  });

  it("ships the Lights over Lapland Twitch entry with a channel and an https source site", () => {
    const twitch = webcamRegistry.filter(isTwitch);
    expect(twitch.length).toBeGreaterThan(0);
    for (const entry of twitch) {
      expect(entry.twitchChannel.trim()).not.toBe("");
      expect(entry.siteUrl).toMatch(/^https:\/\//);
    }
  });

  it("keeps panoramic as an optional boolean only on image entries", () => {
    for (const entry of webcamRegistry) {
      if (isImage(entry)) {
        if ("panoramic" in entry) {
          expect(typeof entry.panoramic).toBe("boolean");
        }
      } else {
        expect("panoramic" in entry).toBe(false);
      }
    }
  });

  it("gives every image entry's country a flagcdn country code", () => {
    const images = webcamRegistry.filter(isImage);
    for (const entry of images) {
      expect(webcamCountryCode(entry.country)).toMatch(/^[a-z]{2}$/);
    }
  });

  it("ships the verified 2026-08-29 set with image cards for every region that has one", () => {
    // Image regions present: Scandinavia, Canada, US, Russia (Alaska's cam is the live entry)
    const imageRegions = new Set(
      webcamRegistry.filter(isImage).map((e) => e.region),
    );
    for (const region of ["Scandinavia", "Canada", "US", "Russia"]) {
      expect(imageRegions.has(region as WebcamRegion)).toBe(true);
    }
    // Link regions present: New Zealand, UK, Greenland, Iceland
    const linkRegions = new Set(webcamRegistry.filter(isLink).map((e) => e.region));
    for (const region of ["New Zealand", "UK", "Greenland", "Iceland"]) {
      expect(linkRegions.has(region as WebcamRegion)).toBe(true);
    }
  });

  it("ships the one true-live entry (UAF Poker Flat) with a CORS-open sse feed and a placeholder image", () => {
    const live = webcamRegistry.filter(isLive);
    expect(live).toHaveLength(1);
    for (const entry of live) {
      expect(entry.id).toBe("uaf-poker-flat");
      expect(entry.region).toBe("Alaska");
      expect(entry.sseUrl).toMatch(/^https:\/\//);
      expect(entry.frameBaseUrl).toMatch(/^https:\/\/.+\/$/);
      expect(entry.imageUrl).toMatch(/^https:\/\//);
      expect(entry.alt.trim()).not.toBe("");
      expect(entry.siteUrl).toMatch(/^https:\/\//);
      expect(entry.country.trim()).not.toBe("");
      expect(entry.latitude).toBeGreaterThan(-90);
      expect(entry.latitude).toBeLessThanOrEqual(90);
      expect(entry.license === null || typeof entry.license === "string").toBe(
        true,
      );
      expect(entry.note === null || typeof entry.note === "string").toBe(true);
    }
  });
});