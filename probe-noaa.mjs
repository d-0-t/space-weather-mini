const urls = [
  "https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json",
  "https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json",
  "https://services.swpc.noaa.gov/json/boulder_k_index_1m.json",
];
for (const u of urls) {
  const r = await fetch(u);
  const cors = r.headers.get("access-control-allow-origin");
  const t = await r.text();
  let parsed = null;
  try { parsed = JSON.parse(t); } catch { /* not json */ }
  console.log("URL:", u);
  console.log("  status:", r.status, "CORS:", cors, "len:", t.length);
  if (Array.isArray(parsed) && parsed.length) {
    console.log("  count:", parsed.length);
    console.log("  first:", JSON.stringify(parsed[0]));
    console.log("  last :", JSON.stringify(parsed[parsed.length - 1]));
  } else {
    console.log("  body head:", t.slice(0, 200));
  }
  console.log("");
}