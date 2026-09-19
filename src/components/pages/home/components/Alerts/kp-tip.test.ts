import { describe, expect, it } from "vitest";

import { kpTip } from "./kp-tip";

/**
 * Expected Kp values worked by hand from the Tips reach rule
 * (edge = 66° − 2° × Kp, src/products/reach-towns.ts) over the
 * centered-dipole |MLAT| values the reach-cities table precomputes:
 * Luleå |MLAT| 63.27 sits inside Kp 2's edge (62°) but outside Kp 1's
 * (64°); Reykjavík 68.79 is poleward of every edge (slider floor 1);
 * New York 49.91 only enters reach at Kp 9 (edge 48°); Denver 47.32 is
 * never reached, not even at Kp 9.
 */
const LULEÅ = { latitude: 65.5841, longitude: 22.1547, shortName: "Luleå" };
const REYKJAVÍK = {
  latitude: 64.1355,
  longitude: -21.8954,
  shortName: "Reykjavík",
};
const NEW_YORK = {
  latitude: 40.7143,
  longitude: -74.006,
  shortName: "New York",
};
const DENVER = { latitude: 39.7392, longitude: -104.9847, shortName: "Denver" };

describe("the Kp threshold tip (ticket 06)", () => {
  it("names the smallest Kp whose reach edge typically reaches the place", () => {
    expect(kpTip(LULEÅ)).toBe("Kp 2 typically brings the oval to Luleå.");
  });

  it("clamps poleward-of-every-edge places to the slider floor", () => {
    expect(kpTip(REYKJAVÍK)).toBe(
      "Kp 1 typically brings the oval to Reykjavík.",
    );
  });

  it("never promises beyond Kp 9", () => {
    expect(kpTip(NEW_YORK)).toBe("Kp 9 typically brings the oval to New York.");
  });

  it("says so honestly when no Kp brings the oval to the place", () => {
    expect(kpTip(DENVER)).toBe(
      "Even Kp 9 rarely brings the oval to Denver.",
    );
  });

  it("is null without a stored place – the generic fallback is the UI's", () => {
    expect(kpTip(null)).toBeNull();
  });
});
