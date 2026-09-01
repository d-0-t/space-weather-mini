import { describe, expect, it } from "vitest";

import { cloudCoverMapUrl, lightPollutionMapUrl } from "./external-links";

describe("external map links (ticket 04)", () => {
  it("builds the light-pollution map URL with zoom, lat, lon and B0 layer", () => {
    const url = lightPollutionMapUrl(63.1792, 14.6357);
    expect(url).toBe(
      "https://www.lightpollutionmap.info/#zoom=15&lat=63.1792&lon=14.6357&layers=B0FFFFFFTFFFFFFFFFF",
    );
    expect(url).toContain("zoom=15");
    expect(url).toContain("lat=63.1792");
    expect(url).toContain("lon=14.6357");
    expect(url).toContain("layers=B0FFFFFFTFFFFFFFFFF");
  });

  it("encodes negative western longitude and southern latitude", () => {
    const url = lightPollutionMapUrl(-33.9, -151.2);
    expect(url).toContain("lat=-33.9");
    expect(url).toContain("lon=-151.2");
  });

  it("builds the cloud-cover map URL with zoom, lat and lon on the correct host", () => {
    const url = cloudCoverMapUrl(63.1792, 14.6357);
    expect(url).toContain("https://www.weather-radar-live.com/cloud-cover-map/");
    expect(url).toContain("lat=63.1792");
    expect(url).toContain("lon=14.6357");
    expect(url).toContain("zoom=8");
  });

  it("keeps both URLs distinct for distinct places", () => {
    const a = lightPollutionMapUrl(59.91, 10.75);
    const b = lightPollutionMapUrl(67.8558, 20.2253);
    expect(a).not.toBe(b);
    const c = cloudCoverMapUrl(59.91, 10.75);
    const d = cloudCoverMapUrl(67.8558, 20.2253);
    expect(c).not.toBe(d);
  });
});
