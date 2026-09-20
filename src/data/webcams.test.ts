import { describe, expect, it } from "vitest";

import {
  CURATED_WEBCAM_IDS,
  webcamRegistry,
  webcamCountryCode,
  webcamsForTown,
  WEBCAM_REGION_ORDER,
  type WebcamEntry,
  type WebcamImageEntry,
  type WebcamLinkEntry,
  type WebcamLiveEntry,
  type WebcamRegion,
  type WebcamTwitchEntry,
} from "./webcams";
import { REACH_CITIES } from "./reach-cities";

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
      // Link rows carry no notes (ticket 05 follow-up)
      if (!isLink(entry)) {
        expect(entry.note === null || typeof entry.note === "string").toBe(
          true,
        );
      }
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

  it("ships every link entry with an https url, a known kind, and a country that has a flag code", () => {
    const kinds = new Set(["youtube", "twitch", "player", "http-only"]);
    const links = webcamRegistry.filter(isLink);
    expect(links.length).toBeGreaterThan(0);
    for (const entry of links) {
      expect(entry.url).toMatch(/^https?:\/\//);
      expect(kinds.has(entry.kind)).toBe(true);
      expect(entry.country.trim()).not.toBe("");
      expect(webcamCountryCode(entry.country)).toMatch(/^[a-z]{2}$/);
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

  it("ships every image and live entry with a Reach towns city", () => {
    for (const entry of webcamRegistry) {
      if (isImage(entry) || isLive(entry)) {
        expect(entry.city.trim(), entry.id).not.toBe("");
      } else {
        expect("city" in entry).toBe(false);
      }
    }
  });

  it("resolves every image and live cam's city inside the Reach towns table", () => {
    // The camera-icon seam: the Possible locations panel can only open a
    // town's webcams when the reach list names that town, so every cam's
    // city must exist in data/reach-cities.ts under the same flag code.
    const reachKeys = new Set(
      REACH_CITIES.map((city) => `${city.countryCode}/${city.city}`),
    );
    for (const entry of webcamRegistry) {
      if (isImage(entry) || isLive(entry)) {
        const key = `${webcamCountryCode(entry.country)}/${entry.city}`;
        expect(
          reachKeys.has(key),
          `${entry.id} cam town ${key} is in REACH_CITIES`,
        ).toBe(true);
      }
    }
  });

  it("ships the verified 2026-08-29 set with image cards for every region that has one", () => {
    // Image regions present: Nordic, North America, Russia (the live cam sits
    // inside the North America section)
    const imageRegions = new Set(
      webcamRegistry.filter(isImage).map((e) => e.region),
    );
    for (const region of ["Nordic", "North America", "Russia"]) {
      expect(imageRegions.has(region as WebcamRegion)).toBe(true);
    }
    // Link regions present: UK, rest (NZ and Antarctica links live in the
    // "Other regions" bucket); Nordic carries both cards and links
    const linkRegions = new Set(webcamRegistry.filter(isLink).map((e) => e.region));
    for (const region of ["UK", "rest", "Nordic"]) {
      expect(linkRegions.has(region as WebcamRegion)).toBe(true);
    }
  });

  it("ships the one true-live entry (UAF Poker Flat) with a CORS-open sse feed and a placeholder image", () => {
    const live = webcamRegistry.filter(isLive);
    expect(live).toHaveLength(1);
    for (const entry of live) {
      expect(entry.id).toBe("uaf-poker-flat");
      expect(entry.region).toBe("North America");
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

  it("ships the AuroraMAX entry under its short station name (Yellowknife)", () => {
    const auroramax = webcamRegistry.find((e) => e.id === "auroramax");
    expect(auroramax?.type).toBe("image");
    if (auroramax?.type === "image") {
      expect(auroramax.name).toBe("Yellowknife");
      expect(auroramax.alt).toBe(
        "AuroraMAX – Yellowknife, Canada – current sky view",
      );
    }
  });

  it("resolves every curated id to a distinct image entry that carries longitude", () => {
    const byId = new Map(webcamRegistry.map((e) => [e.id, e]));
    expect(new Set(CURATED_WEBCAM_IDS).size).toBe(CURATED_WEBCAM_IDS.length);
    for (const id of CURATED_WEBCAM_IDS) {
      const entry = byId.get(id);
      expect(entry, `curated id ${id} resolves`).toBeDefined();
      expect(entry!.type, `curated id ${id} is an image card`).toBe("image");
      const image = entry as WebcamImageEntry;
      expect(
        typeof image.longitude,
        `curated id ${id} carries longitude for the darkness gate`,
      ).toBe("number");
      expect(image.longitude).toBeGreaterThan(-180);
      expect(image.longitude).toBeLessThanOrEqual(180);
    }
  });
});

describe("webcamsForTown (the camera-icon seam)", () => {
  it("returns the town's image and live cams, matched by flag code + city", () => {
    // Skibotn owns three image cards; Norway's reach flag code is "no".
    const cams = webcamsForTown("no", "Skibotn");
    expect(cams.map((cam) => cam.id).sort()).toEqual([
      "tgo-asc01",
      "tgo-bacc5",
      "uec-skibotn",
    ]);
    expect(cams.every((cam) => cam.type === "image")).toBe(true);
  });

  it("stacks every cam of a multi-cam town and never mixes towns", () => {
    expect(webcamsForTown("se", "Kiruna").map((cam) => cam.id).sort()).toEqual([
      "irf-kiruna",
      "uec-kiruna",
    ]);
    // Tromsø owns one card; the UEC Abisko and NIPR Skibotn entries must
    // not leak into it through partial matches.
    expect(webcamsForTown("no", "Tromsø").map((cam) => cam.id)).toEqual([
      "uec-tromso",
    ]);
  });

  it("maps the cam's own country string through the flag table", () => {
    // Poker Flat's country is "Alaska, US"; the Fairbanks reach town is "us".
    const fairbanks = webcamsForTown("us", "Fairbanks");
    expect(fairbanks).toHaveLength(1);
    expect(fairbanks[0].id).toBe("uaf-poker-flat");
    expect(fairbanks[0].type).toBe("live");
  });

  it("returns nothing for a town without a webcam or an unknown town", () => {
    // Rovaniemi is in the reach table but owns no cam.
    expect(webcamsForTown("fi", "Rovaniemi")).toEqual([]);
    expect(webcamsForTown("fi", "Atlantis")).toEqual([]);
    // Link rows never become town cams (they carry no image for a modal).
    expect(webcamsForTown("gb", "Lerwick")).toEqual([]);
  });
});