/**
 * External map links for Local conditions (ticket 04): two honest links that
 * land centred on the current geocoded place. No numeric Bortle or SQM value
 * is fetched or stored – the maps are external viewers, not APIs.
 */

/** Light-pollution map centred on the place with the B0 VIIRS layer. */
export function lightPollutionMapUrl(latitude: number, longitude: number): string {
  // Hash fragment per https://www.lightpollutionmap.info/#zoom=15&lat=&lon=&layers=B0FFFFFFTFFFFFFFFFF (see research doc 2026-09-01). Zoom 15 lands on the spot; B0 is the VIIRS layer preset.
  const lat = String(latitude);
  const lon = String(longitude);
  return `https://www.lightpollutionmap.info/#zoom=15&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&layers=B0FFFFFFTFFFFFFFFFF`;
}

/** Cloud-cover map centred on the place with a pin. */
export function cloudCoverMapUrl(latitude: number, longitude: number): string {
  const lat = String(latitude);
  const lon = String(longitude);
  return `https://www.weather-radar-live.com/cloud-cover-map/#zoom=8&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
}
