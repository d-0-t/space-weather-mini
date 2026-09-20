import { describe, expect, it } from "vitest";

import type { ReachCity } from "../data/reach-cities";
import {
  isDarkForAurora,
  probabilityBand,
  reachEdge,
  selectReachTowns,
} from "./reach-towns";

/** A synthetic town; coordinates stay 0 – the sun model is injected. */
const city = (
  name: string,
  country: string,
  countryCode: string,
  mlat: number,
): ReachCity => ({
  city: name,
  country,
  countryCode,
  lat: 0,
  lon: 0,
  mlat,
});

/** Every synthetic town is dark for the selection tests. */
const DARK = () => -20;

describe("reachEdge", () => {
  it("applies the Tips rule E = 66° − 2° × Kp at the boundary Kp values", () => {
    expect(reachEdge(0)).toBe(66);
    expect(reachEdge(5)).toBe(56);
    expect(reachEdge(9)).toBe(48);
  });
});

describe("probabilityBand", () => {
  it("maps the margin boundaries: 0/2/6 with null below zero", () => {
    expect(probabilityBand(-0.01)).toBeNull();
    expect(probabilityBand(0)).toBe("possible");
    expect(probabilityBand(1.99)).toBe("possible");
    expect(probabilityBand(2)).toBe("likely");
    expect(probabilityBand(5.99)).toBe("likely");
    expect(probabilityBand(6)).toBe("very-likely");
  });
});

describe("isDarkForAurora", () => {
  it("gates at −12°: astronomical twilight and darker", () => {
    expect(isDarkForAurora(-12)).toBe(true);
    expect(isDarkForAurora(-18)).toBe(true);
    expect(isDarkForAurora(-11.99)).toBe(false);
    expect(isDarkForAurora(0)).toBe(false);
  });
});

describe("selectReachTowns", () => {
  it("keeps towns at or poleward of the edge, ordered by band then margin", () => {
    const result = selectReachTowns(
      [
        city("Out", "X", "XX", 55), // margin −1: equatorward of E(5) = 56
        city("Edge", "A", "AA", 56), // possible, margin 0
        city("Possible", "B", "BB", 57.9), // possible, margin 1.9
        city("LowLikely", "C", "CC", 58), // likely, margin 2
        city("HighLikely", "D", "DD", 61.9), // likely, margin 5.9
        city("Very", "E", "EE", 62), // very likely, margin 6
      ],
      5,
      DARK,
    );
    expect(result.map((town) => town.city)).toEqual([
      "Very",
      "HighLikely",
      "LowLikely",
      "Possible",
      "Edge",
    ]);
    expect(result.map((town) => town.probability)).toEqual([
      "very-likely",
      "likely",
      "likely",
      "possible",
      "possible",
    ]);
  });

  it("drops towns whose sun sits above −12°", () => {
    const result = selectReachTowns(
      [city("Lit", "A", "AA", 60), city("Dark", "B", "BB", 60)],
      5,
      (town) => (town.city === "Lit" ? -11.99 : -12),
    );
    expect(result.map((town) => town.city)).toEqual(["Dark"]);
  });

  it("returns nothing when every town is equatorward of the edge", () => {
    expect(selectReachTowns([city("South", "A", "AA", 47.99)], 9, DARK)).toEqual(
      [],
    );
  });

  it("keeps one town per band per country – larger margin wins, ties alphabetical", () => {
    const result = selectReachTowns(
      [
        city("Zeta", "Norway", "NO", 60), // likely, margin 4 – beats Alpha
        city("Alpha", "Norway", "NO", 59), // likely, margin 3
        city("Beta", "Norway", "NO", 56), // possible, margin 0 – other band, kept
        city("Alfa", "Sweden", "SE", 60), // likely, margin 4
        city("Aaa", "Iceland", "IS", 60), // likely, margin 4
      ],
      5,
      DARK,
    );
    // Likely ties order alphabetically; the same-country likely loser is gone.
    expect(result.map((town) => town.city)).toEqual([
      "Aaa",
      "Alfa",
      "Zeta",
      "Beta",
    ]);
  });

  it("caps the list at 12 rows, keeping the strongest margins", () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      city(
        `Town${String(i).padStart(2, "0")}`,
        `Country${i}`,
        "XX",
        66 + i * 0.1,
      ),
    );
    expect(selectReachTowns(many, 0, DARK)).toHaveLength(12);
    // The cap keeps the strongest margins – the last three synthetic towns.
    expect(selectReachTowns(many, 0, DARK).map((town) => town.city)).toEqual([
      "Town14",
      "Town13",
      "Town12",
      "Town11",
      "Town10",
      "Town09",
      "Town08",
      "Town07",
      "Town06",
      "Town05",
      "Town04",
      "Town03",
    ]);
  });
});

describe("selectReachTowns webcam bypass", () => {
  const webcamTowns = new Set(["NO/Kiruna", "NO/Skibotn", "SE/Abisko"]);

  it("keeps every webcam town of a country and band, not only the largest margin", () => {
    // Kp 5 (edge 56): Skibotn's 11.02 margin beats Kiruna's 9.66 in the
    // Norway very-likely slot; as webcam towns both survive alongside
    // Sweden's Abisko, and guide-only Oslo keeps its likely slot.
    const result = selectReachTowns(
      [
        city("Skibotn", "Norway", "NO", 67.02), // webcam, very likely 11.02
        city("Kiruna", "Norway", "NO", 65.66), // webcam, very likely 9.66
        city("Abisko", "Sweden", "SE", 66.32), // webcam, very likely 10.32
        city("Oslo", "Norway", "NO", 59.67), // guide, likely 3.67
      ],
      5,
      DARK,
      webcamTowns,
    );
    expect(result.map((town) => town.city)).toEqual([
      "Skibotn",
      "Abisko",
      "Kiruna",
      "Oslo",
    ]);
  });

  it("keeps the guide dedup for non-webcam towns even when a webcam town shares the country", () => {
    // Oslo is Norway's best guide likely margin, so Alta loses its guide
    // slot even though the webcam town rides beside them.
    const result = selectReachTowns(
      [
        city("Kiruna", "Norway", "NO", 65.66), // webcam, very likely 9.66
        city("Oslo", "Norway", "NO", 59.67), // guide, likely 3.67
        city("Alta", "Norway", "NO", 59.17), // guide, likely 3.17 – loses to Oslo
      ],
      5,
      DARK,
      webcamTowns,
    );
    expect(result.map((town) => town.city)).toEqual(["Kiruna", "Oslo"]);
  });

  it("lets webcam towns ride past the 12-row guide cap", () => {
    // 15 guide towns from distinct countries (12-row cap applies) plus 2
    // webcam towns with the weakest margins – all 14 rows come back.
    const many = Array.from({ length: 15 }, (_, i) =>
      city(
        `Town${String(i).padStart(2, "0")}`,
        `Country${i}`,
        "XX",
        66 + i * 0.1,
      ),
    );
    const result = selectReachTowns(
      [...many, city("WeakCam1", "Camland", "NO", 56.2), city("WeakCam2", "Camland2", "SE", 56.1)],
      5,
      DARK,
      new Set(["NO/WeakCam1", "SE/WeakCam2"]),
    );
    expect(result.map((town) => town.city)).toContain("WeakCam1");
    expect(result.map((town) => town.city)).toContain("WeakCam2");
    expect(result).toHaveLength(14);
  });

  it("still applies eligibility to webcam towns: out of reach or lit means absent", () => {
    const result = selectReachTowns(
      [
        city("SouthCam", "Camland", "NO", 50), // margin −6: equatorward
        city("LitCam", "Camland2", "SE", 60), // in reach but lit
      ],
      5,
      (town) => (town.city === "LitCam" ? -11.99 : -20),
      webcamTowns,
    );
    expect(result).toEqual([]);
  });
});
