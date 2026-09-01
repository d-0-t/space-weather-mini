import { beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_PLACE,
  KIRUNA_PLACE,
  LULEA_PLACE,
  PLACE_PRESETS,
  PLACE_STORAGE_KEY,
  loadGeocodedPlace,
  saveGeocodedPlace,
} from "./place-storage";

const TROMSO: Parameters<typeof saveGeocodedPlace>[1] = {
  displayName: "Tromsø, Troms og Finnmark, Norway",
  latitude: 69.6492,
  longitude: 18.9553,
  fetchedAt: "2026-09-01T12:00:00.000Z",
};

describe("Geocoded place storage (ticket 01)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to Östersund when nothing is stored", () => {
    expect(loadGeocodedPlace(localStorage)).toEqual(DEFAULT_PLACE);
  });

  it("ships the preset places with plausible coordinates", () => {
    expect(PLACE_PRESETS).toContain(KIRUNA_PLACE);
    expect(PLACE_PRESETS).toContain(LULEA_PLACE);
    for (const preset of PLACE_PRESETS) {
      expect(preset.latitude).toBeGreaterThanOrEqual(55);
      expect(preset.latitude).toBeLessThanOrEqual(70);
      expect(preset.longitude).toBeGreaterThanOrEqual(5);
      expect(preset.longitude).toBeLessThanOrEqual(35);
    }
  });

  it("persists a picked place as a versioned value and reads it back", () => {
    saveGeocodedPlace(localStorage, TROMSO);
    expect(localStorage.getItem(PLACE_STORAGE_KEY)).toBe(
      JSON.stringify({ v: 1, place: TROMSO }),
    );
    expect(loadGeocodedPlace(localStorage)).toEqual(TROMSO);
  });

  it("overwrites the stored place on every new pick", () => {
    saveGeocodedPlace(localStorage, TROMSO);
    const rovaniemi = { ...TROMSO, displayName: "Rovaniemi, Finland" };
    saveGeocodedPlace(localStorage, rovaniemi);
    expect(loadGeocodedPlace(localStorage)).toEqual(rovaniemi);
  });

  it("falls back to the default place on corrupt storage", () => {
    localStorage.setItem(PLACE_STORAGE_KEY, "not json");
    expect(loadGeocodedPlace(localStorage)).toEqual(DEFAULT_PLACE);
  });

  it("falls back to the default place on foreign-shaped or unknown-version storage", () => {
    localStorage.setItem(
      PLACE_STORAGE_KEY,
      JSON.stringify({ v: 1, place: { name: "Oslo" } }),
    );
    expect(loadGeocodedPlace(localStorage)).toEqual(DEFAULT_PLACE);
    localStorage.setItem(PLACE_STORAGE_KEY, JSON.stringify({ v: 2, place: TROMSO }));
    expect(loadGeocodedPlace(localStorage)).toEqual(DEFAULT_PLACE);
    localStorage.setItem(PLACE_STORAGE_KEY, JSON.stringify({ v: 1 }));
    expect(loadGeocodedPlace(localStorage)).toEqual(DEFAULT_PLACE);
  });

  it("falls back to the default place when lat or lon is not a plausible coordinate", () => {
    localStorage.setItem(
      PLACE_STORAGE_KEY,
      JSON.stringify({ v: 1, place: { ...TROMSO, latitude: 91 } }),
    );
    expect(loadGeocodedPlace(localStorage)).toEqual(DEFAULT_PLACE);
    localStorage.setItem(
      PLACE_STORAGE_KEY,
      JSON.stringify({ v: 1, place: { ...TROMSO, longitude: "18.9" } }),
    );
    expect(loadGeocodedPlace(localStorage)).toEqual(DEFAULT_PLACE);
  });
});