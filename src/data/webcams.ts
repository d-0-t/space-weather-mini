/**
 * Curated webcam registry – the single source of truth for the webcams page
 * (ADR-0004). Every entry was verified hotlinkable with a browser UA and a
 * foreign Referer on 2026-08-29; see docs/research/webcam-sources-2026-08-29.md.
 * A cam that dies or changes licence is removed here, not in the page code.
 */

/** A gallery item is either a webcam (image card), the Twitch embed, the true-live cam, or a webcam link (link row). */
export type WebcamEntry =
  | WebcamImageEntry
  | WebcamTwitchEntry
  | WebcamLiveEntry
  | WebcamLinkEntry;

/** Regions in the fixed display order; `rest` buckets entries outside the named set. */
export type WebcamRegion =
  | "Scandinavia"
  | "Alaska"
  | "Canada"
  | "US"
  | "Antarctica"
  | "Australia"
  | "New Zealand"
  | "UK"
  | "Greenland"
  | "Russia"
  | "Iceland"
  | "rest";

export const WEBCAM_REGION_ORDER: readonly WebcamRegion[] = [
  "Scandinavia",
  "Alaska",
  "Canada",
  "US",
  "Antarctica",
  "Australia",
  "New Zealand",
  "UK",
  "Greenland",
  "Russia",
  "Iceland",
  "rest",
];

/**
 * Country → ISO 3166-1 alpha-2 code for the flagcdn.com flag on each card
 * (https://flagpedia.net/download/api). The `country` field is the
 * authoritative name – the flag carries it as its alt – and an unmapped
 * country falls back to an empty code (the contract test pins coverage).
 */
export const WEBCAM_COUNTRY_CODES: Record<string, string> = {
  Norway: "no",
  Sweden: "se",
  Finland: "fi",
  Canada: "ca",
  "Alaska, US": "us",
  US: "us",
  Russia: "ru",
};

export const webcamCountryCode = (country: string): string =>
  WEBCAM_COUNTRY_CODES[country] ?? "";

/** Image card: the operator's current still, shown as a plain <img>. */
export interface WebcamImageEntry {
  type: "image";
  id: string;
  /** Station name, e.g. "Tromsø AI – Tromsø". */
  name: string;
  /** Filter bucket; the card tag shows `country` instead. */
  region: WebcamRegion;
  /** Display country/locale for the card tag, e.g. "Norway", "Alaska, US". */
  country: string;
  /** Latitude to 1 decimal, signed (negative = south). */
  latitude: number;
  /** Panoramic feed – renders 3× card width. */
  panoramic?: boolean;
  operator: string;
  imageUrl: string;
  /** Operator's own refresh cadence; auto-refresh never polls faster than this. */
  cadenceMinutes: number;
  /** Eligible for opt-in auto-refresh (ADR-0003 discipline). */
  refreshable: boolean;
  /** Licence note for the card; null when no licence text could be found. */
  license: string | null;
  /** Seasonal or staleness note ("Operates when dark", "(seasonal)"). */
  note: string | null;
  alt: string;
  /** Operator's page, for the "Visit site" link. */
  siteUrl: string;
}

/** The single Twitch embed card (Lights over Lapland); never auto-refreshes. */
export interface WebcamTwitchEntry {
  type: "twitch";
  id: string;
  name: string;
  region: WebcamRegion;
  operator: string;
  twitchChannel: string;
  /** Operator's site, for the Source attribution link. */
  siteUrl: string;
  note: string | null;
}

/**
 * The one true-live cam (UAF Poker Flat): follows the operator's CORS-open SSE
 * feed for ~5–15 s frames while live mode is on (ADR-0003 discipline – gated
 * by the opt-in auto-refresh setting and the visible tab); the image falls
 * back to `imageUrl` when live mode is off.
 */
export interface WebcamLiveEntry {
  type: "live";
  id: string;
  name: string;
  region: WebcamRegion;
  /** Display country/locale for the card tag, e.g. "Alaska, US". */
  country: string;
  /** Latitude to 1 decimal, signed (negative = south). */
  latitude: number;
  operator: string;
  /** Daytime/off-season placeholder still shown while live mode is off. */
  imageUrl: string;
  /** CORS-open SSE endpoint emitting the current frame path as its first data value. */
  sseUrl: string;
  /** Base URL the emitted frame path is resolved against. */
  frameBaseUrl: string;
  /** Licence note for the card; null when no licence text could be found. */
  license: string | null;
  /** Seasonal or staleness note ("Night-only – placeholder frame in daylight"). */
  note: string | null;
  alt: string;
  /** Operator's page, for the "Visit site" link. */
  siteUrl: string;
}

/** Link row: a video-only or unembeddable source that links out instead of displaying an image. */
export interface WebcamLinkEntry {
  type: "link";
  id: string;
  name: string;
  region: WebcamRegion;
  operator: string;
  url: string;
  /** What the destination actually is – drives the kind note on the row. */
  kind: "youtube" | "twitch" | "player" | "http-only";
  note: string | null;
}

export const webcamRegistry: WebcamEntry[] = [
  // ── Image cards: Scandinavia ──────────────────────────────────────────────
  {
    type: "image",
    id: "irf-kiruna",
    country: "Sweden",
    name: "IRF Kiruna all-sky (KAGO)",
    region: "Scandinavia",
    latitude: 67.8,
    operator: "Swedish Institute of Space Physics (IRF)",
    imageUrl: "https://www.irf.se/alis/allsky/krn/latest_medium.jpeg",
    cadenceMinutes: 1,
    refreshable: true,
    license:
      "KAGO licence – free for non-commercial use; commercial use needs written permission",
    note: "(seasonal)",
    alt: "IRF Kiruna all-sky (KAGO), Scandinavia – current sky view",
    siteUrl: "https://www2.irf.se/Observatory/",
  },
  {
    type: "image",
    id: "uec-tromso",
    country: "Norway",
    name: "Tromsø AI – Tromsø",
    region: "Scandinavia",
    latitude: 69.6,
    operator: "UEC (Univ. of Electro-Communications)",
    imageUrl:
      "https://tromsoe-ai.cei.uec.ac.jp/~nanjo/public/aurora_alert/latest.jpg",
    cadenceMinutes: 5,
    refreshable: true,
    license: "Academic outreach – credit UEC/NIPR",
    note: null,
    alt: "Tromsø AI – Tromsø, Scandinavia – current sky view",
    siteUrl: "https://tromsoe-ai.cei.uec.ac.jp/",
  },
  {
    type: "image",
    id: "uec-abisko",
    country: "Sweden",
    name: "Tromsø AI – Abisko",
    region: "Scandinavia",
    latitude: 68.3,
    operator: "UEC (Univ. of Electro-Communications)",
    imageUrl:
      "https://tromsoe-ai.cei.uec.ac.jp/~nanjo/public/aurora_alert/latest_abisko.jpg",
    cadenceMinutes: 5,
    refreshable: true,
    license: "Academic outreach – credit UEC/NIPR",
    note: null,
    alt: "Tromsø AI – Abisko, Scandinavia – current sky view",
    siteUrl: "https://tromsoe-ai.cei.uec.ac.jp/",
  },
  {
    type: "image",
    id: "uec-kiruna",
    country: "Sweden",
    name: "Tromsø AI – Kiruna",
    region: "Scandinavia",
    latitude: 67.8,
    operator: "UEC (Univ. of Electro-Communications)",
    imageUrl:
      "https://tromsoe-ai.cei.uec.ac.jp/~nanjo/public/aurora_alert/latest_kiruna.jpg",
    cadenceMinutes: 5,
    refreshable: true,
    license: "Academic outreach – credit UEC/NIPR",
    note: null,
    alt: "Tromsø AI – Kiruna, Scandinavia – current sky view",
    siteUrl: "https://tromsoe-ai.cei.uec.ac.jp/",
  },
  {
    type: "image",
    id: "uec-skibotn",
    country: "Norway",
    name: "Tromsø AI – Skibotn",
    region: "Scandinavia",
    latitude: 69.4,
    operator: "UEC (Univ. of Electro-Communications)",
    imageUrl:
      "https://tromsoe-ai.cei.uec.ac.jp/~nanjo/public/aurora_alert/latest_skibotn.jpg",
    cadenceMinutes: 5,
    refreshable: true,
    license: "Academic outreach – credit UEC/NIPR",
    note: null,
    alt: "Tromsø AI – Skibotn, Scandinavia – current sky view",
    siteUrl: "https://tromsoe-ai.cei.uec.ac.jp/",
  },
  {
    type: "image",
    id: "tgo-asc01",
    country: "Norway",
    name: "TGO All-Sky ASC01",
    region: "Scandinavia",
    latitude: 69.4,
    operator: "Tromsø Geophysical Observatory (UiT)",
    imageUrl: "https://fox.phys.uit.no/ASC/Latest_ASC01.png",
    cadenceMinutes: 1,
    refreshable: true,
    license: "Academic – credit TGO/UiT",
    note: "Operates when dark",
    alt: "TGO All-Sky ASC01, Scandinavia – current sky view",
    siteUrl: "https://fox.phys.uit.no/ASC/",
  },
  {
    type: "image",
    id: "tgo-bacc5",
    country: "Norway",
    name: "TGO BACC colour cam",
    region: "Scandinavia",
    latitude: 69.4,
    operator: "Tromsø Geophysical Observatory (UiT)",
    imageUrl: "https://fox.phys.uit.no/ASC/BACC5.jpg",
    cadenceMinutes: 1,
    refreshable: true,
    license: "Academic – credit TGO/UiT",
    note: "Operates when dark",
    alt: "TGO BACC colour cam, Scandinavia – current sky view",
    siteUrl: "https://fox.phys.uit.no/ASC/",
  },
  {
    type: "image",
    id: "jokkmokk-nr2",
    country: "Sweden",
    name: "Jokkmokk PORJUS NR2",
    region: "Scandinavia",
    latitude: 66.9,
    operator: "Nature of Jokkmokk (jokkmokk.jp)",
    imageUrl: "https://uk.jokkmokk.jp/photo/nr2/latest_m.jpg",
    cadenceMinutes: 1,
    refreshable: true,
    license: null,
    note: null,
    alt: "Jokkmokk PORJUS NR2, Scandinavia – current sky view",
    siteUrl: "https://uk.jokkmokk.jp/",
  },
  {
    type: "image",
    id: "jokkmokk-nr3",
    country: "Sweden",
    name: "Jokkmokk PORJUS NR3",
    region: "Scandinavia",
    latitude: 66.9,
    operator: "Nature of Jokkmokk (jokkmokk.jp)",
    imageUrl: "https://uk.jokkmokk.jp/photo/nr3/latest_m.jpg",
    cadenceMinutes: 1,
    refreshable: true,
    license: null,
    note: null,
    alt: "Jokkmokk PORJUS NR3, Scandinavia – current sky view",
    siteUrl: "https://uk.jokkmokk.jp/",
  },
  {
    type: "image",
    id: "jokkmokk-nr4",
    country: "Sweden",
    name: "Jokkmokk PORJUS NR4",
    region: "Scandinavia",
    latitude: 66.9,
    operator: "Nature of Jokkmokk (jokkmokk.jp)",
    imageUrl: "https://uk.jokkmokk.jp/photo/nr4/latest_m.jpg",
    cadenceMinutes: 1,
    refreshable: true,
    license: null,
    note: null,
    alt: "Jokkmokk PORJUS NR4, Scandinavia – current sky view",
    siteUrl: "https://uk.jokkmokk.jp/",
  },
  {
    type: "image",
    id: "jokkmokk-nr5",
    country: "Sweden",
    name: "Jokkmokk PORJUS NR5",
    region: "Scandinavia",
    latitude: 66.9,
    operator: "Nature of Jokkmokk (jokkmokk.jp)",
    imageUrl: "https://uk.jokkmokk.jp/photo/nr5/latest_m.jpg",
    cadenceMinutes: 1,
    refreshable: true,
    license: null,
    note: null,
    alt: "Jokkmokk PORJUS NR5, Scandinavia – current sky view",
    siteUrl: "https://uk.jokkmokk.jp/",
  },
  {
    type: "image",
    id: "fmi-hankasalmi",
    country: "Finland",
    name: "FMI AuroraSnow – Hankasalmi",
    region: "Scandinavia",
    latitude: 62.3,
    operator: "Finnish Meteorological Institute (FMI)",
    imageUrl:
      "https://aurorasnow.fmi.fi/public_service/images/latest_SIR_AllSky.jpg",
    cadenceMinutes: 2,
    refreshable: true,
    license: "Free for teaching and non-commercial research – cite FMI",
    note: null,
    alt: "FMI AuroraSnow – Hankasalmi, Scandinavia – current sky view",
    siteUrl: "https://aurorasnow.fmi.fi/public_service/",
  },
  {
    type: "image",
    id: "fmi-nyrola",
    country: "Finland",
    name: "FMI AuroraSnow – Nyrölä",
    region: "Scandinavia",
    latitude: 62.2,
    operator: "Finnish Meteorological Institute (FMI)",
    imageUrl: "https://aurorasnow.fmi.fi/public_service/images/latest_SIR.jpg",
    cadenceMinutes: 2,
    refreshable: true,
    license: "Free for teaching and non-commercial research – cite FMI",
    note: null,
    alt: "FMI AuroraSnow – Nyrölä, Scandinavia – current sky view",
    siteUrl: "https://aurorasnow.fmi.fi/public_service/",
  },
  {
    type: "image",
    id: "fmi-kirkkonummi",
    country: "Finland",
    name: "FMI AuroraSnow – Kirkkonummi",
    region: "Scandinavia",
    latitude: 60.1,
    operator: "Finnish Meteorological Institute (FMI)",
    imageUrl: "https://aurorasnow.fmi.fi/public_service/images/latest_HOV.jpg",
    cadenceMinutes: 2,
    refreshable: true,
    license: "Free for teaching and non-commercial research – cite FMI",
    note: null,
    alt: "FMI AuroraSnow – Kirkkonummi, Scandinavia – current sky view",
    siteUrl: "https://aurorasnow.fmi.fi/public_service/",
  },
  {
    type: "image",
    id: "panomax-nordkapp",
    country: "Norway",
    name: "Panomax – Nordkapp",
    region: "Scandinavia",
    latitude: 71.2,
    operator: "Panomax GmbH",
    panoramic: true,
    imageUrl: "https://live-image.panomax.com/cams/5067/recent_reduced.jpg",
    cadenceMinutes: 5,
    refreshable: true,
    license:
      "Free for private/non-commercial use with credit – commercial use needs a licence",
    note: null,
    alt: "Panomax – Nordkapp, Scandinavia – current sky view",
    siteUrl: "https://www.panomax.com/cams/5067",
  },
  {
    type: "image",
    id: "panomax-loen",
    country: "Norway",
    name: "Panomax – Loen",
    region: "Scandinavia",
    latitude: 61.9,
    operator: "Panomax GmbH",
    panoramic: true,
    imageUrl: "https://live-image.panomax.com/cams/1941/recent_reduced.jpg",
    cadenceMinutes: 5,
    refreshable: true,
    license:
      "Free for private/non-commercial use with credit – commercial use needs a licence",
    note: null,
    alt: "Panomax – Loen, Scandinavia – current sky view",
    siteUrl: "https://www.panomax.com/cams/1941",
  },
  {
    type: "image",
    id: "yrno-setermoen",
    country: "Norway",
    name: "yr.no – Setermoen",
    region: "Scandinavia",
    latitude: 68.9,
    operator: "MET Norway (yr.no)",
    imageUrl: "https://www.yr.no/webcams/1/2000/setermoen/3.jpg",
    cadenceMinutes: 15,
    refreshable: true,
    license: "None found on live files (orphaned legacy URLs)",
    note: null,
    alt: "yr.no – Setermoen, Scandinavia – current sky view",
    siteUrl: "https://www.yr.no/",
  },
  {
    type: "image",
    id: "yrno-ortneset",
    country: "Norway",
    name: "yr.no – Brekke/Orneset",
    region: "Scandinavia",
    latitude: 61.1,
    operator: "MET Norway (yr.no)",
    imageUrl: "https://www.yr.no/webcams/1/2000/ortneset/1.jpg",
    cadenceMinutes: 15,
    refreshable: true,
    license: "None found on live files (orphaned legacy URLs)",
    note: null,
    alt: "yr.no – Brekke/Orneset, Scandinavia – current sky view",
    siteUrl: "https://www.yr.no/",
  },
  {
    type: "image",
    id: "yrno-finnsnes",
    country: "Norway",
    name: "yr.no – Finnsnes",
    region: "Scandinavia",
    latitude: 69.2,
    operator: "MET Norway (yr.no)",
    imageUrl: "https://www.yr.no/webcams/1/2000/finnsnes/2.jpg",
    cadenceMinutes: 15,
    refreshable: true,
    license: "None found on live files (orphaned legacy URLs)",
    note: null,
    alt: "yr.no – Finnsnes, Scandinavia – current sky view",
    siteUrl: "https://www.yr.no/",
  },
  {
    type: "image",
    id: "yrno-skjervoy",
    country: "Norway",
    name: "yr.no – Skjervøy",
    region: "Scandinavia",
    latitude: 70.0,
    operator: "MET Norway (yr.no)",
    imageUrl: "https://www.yr.no/webcams/1/2000/skjervoy/1.jpg",
    cadenceMinutes: 15,
    refreshable: true,
    license: "None found on live files (orphaned legacy URLs)",
    note: null,
    alt: "yr.no – Skjervøy, Scandinavia – current sky view",
    siteUrl: "https://www.yr.no/",
  },
  {
    type: "image",
    id: "yrno-risoyhamn",
    country: "Norway",
    name: "yr.no – Risøyhamn",
    region: "Scandinavia",
    latitude: 69.0,
    operator: "MET Norway (yr.no)",
    imageUrl: "https://www.yr.no/webcams/1/2000/risoyhamn/1.jpg",
    cadenceMinutes: 15,
    refreshable: true,
    license: "None found on live files (orphaned legacy URLs)",
    note: null,
    alt: "yr.no – Risøyhamn, Scandinavia – current sky view",
    siteUrl: "https://www.yr.no/",
  },
  {
    type: "image",
    id: "sgo-sodankyla",
    country: "Finland",
    name: "SGO UCL all-sky",
    region: "Scandinavia",
    latitude: 67.4,
    operator: "Sodankylä Geophysical Observatory (SGO)",
    imageUrl: "https://sgo.fi/Data/RealTime/Kuvat/UCL.jpg",
    cadenceMinutes: 1,
    refreshable: true,
    license: null,
    note: "Operates when dark",
    alt: "SGO UCL all-sky, Scandinavia – current sky view",
    siteUrl: "https://www.sgo.fi/",
  },
  {
    type: "image",
    id: "syrjavaara",
    country: "Finland",
    name: "Syrjävaara Dark Sky Park all-sky",
    region: "Scandinavia",
    latitude: 63.0,
    operator: "Syrjävaara Dark Sky Park",
    imageUrl: "https://syrjavaara.fi/img/syrjavaara_latest_img.jpg",
    cadenceMinutes: 1,
    refreshable: true,
    license: null,
    note: "Operates when dark",
    alt: "Syrjävaara Dark Sky Park all-sky, Scandinavia – current sky view",
    siteUrl: "https://syrjavaara.fi/",
  },

  // ── Image cards: Canada ───────────────────────────────────────────────────
  {
    type: "image",
    id: "auroramax",
    country: "Canada",
    name: "AuroraMAX",
    region: "Canada",
    latitude: 62.4,
    operator: "Univ. of Calgary / CSA / Astronomy North",
    imageUrl: "https://auroramax.phys.ucalgary.ca/recent/recent_480p.jpg",
    cadenceMinutes: 1,
    refreshable: true,
    license: "Canadian Space Agency, University of Calgary, Astronomy North",
    note: "Off May–August",
    alt: "AuroraMAX, Canada – current sky view",
    siteUrl: "https://auroramax.com/",
  },
  {
    type: "image",
    id: "trex-gillam",
    country: "Canada",
    name: "TREx RGB – Gillam",
    region: "Canada",
    latitude: 56.4,
    operator: "UCalgary Auroral Imaging Group",
    imageUrl:
      "https://api.phys.ucalgary.ca/api/v1/rt/trexrgb_gill_standard/latest",
    cadenceMinutes: 1,
    refreshable: true,
    license:
      "Academic research network – credit UCalgary Auroral Imaging Group",
    note: "Operates when dark",
    alt: "TREx RGB – Gillam, Canada – current sky view",
    siteUrl: "https://aurora.phys.ucalgary.ca/",
  },
  {
    type: "image",
    id: "trex-pinawa",
    country: "Canada",
    name: "TREx RGB – Pinawa",
    region: "Canada",
    latitude: 50.2,
    operator: "UCalgary Auroral Imaging Group",
    imageUrl:
      "https://api.phys.ucalgary.ca/api/v1/rt/trexrgb_pina_standard/latest",
    cadenceMinutes: 1,
    refreshable: true,
    license:
      "Academic research network – credit UCalgary Auroral Imaging Group",
    note: "Operates when dark",
    alt: "TREx RGB – Pinawa, Canada – current sky view",
    siteUrl: "https://aurora.phys.ucalgary.ca/",
  },
  {
    type: "image",
    id: "trex-rabbit-lake",
    country: "Canada",
    name: "TREx RGB – Rabbit Lake",
    region: "Canada",
    latitude: 58.2,
    operator: "UCalgary Auroral Imaging Group",
    imageUrl:
      "https://api.phys.ucalgary.ca/api/v1/rt/trexrgb_rabb_standard/latest",
    cadenceMinutes: 1,
    refreshable: true,
    license:
      "Academic research network – credit UCalgary Auroral Imaging Group",
    note: "Operates when dark",
    alt: "TREx RGB – Rabbit Lake, Canada – current sky view",
    siteUrl: "https://aurora.phys.ucalgary.ca/",
  },
  {
    type: "image",
    id: "smile-kapuskasing",
    country: "Canada",
    name: "SMILE ASI – Kapuskasing",
    region: "Canada",
    latitude: 49.4,
    operator: "UCalgary Auroral Imaging Group",
    imageUrl:
      "https://api.phys.ucalgary.ca/api/v1/rt/smileasi_kapu_standard/latest",
    cadenceMinutes: 1,
    refreshable: true,
    license:
      "Academic research network – credit UCalgary Auroral Imaging Group",
    note: "Operates when dark",
    alt: "SMILE ASI – Kapuskasing, Canada – current sky view",
    siteUrl: "https://aurora.phys.ucalgary.ca/",
  },
  {
    type: "image",
    id: "smile-rankin-inlet",
    country: "Canada",
    name: "SMILE ASI – Rankin Inlet",
    region: "Canada",
    latitude: 62.8,
    operator: "UCalgary Auroral Imaging Group",
    imageUrl:
      "https://api.phys.ucalgary.ca/api/v1/rt/smileasi_rank_standard/latest",
    cadenceMinutes: 1,
    refreshable: true,
    license:
      "Academic research network – credit UCalgary Auroral Imaging Group",
    note: "Operates when dark",
    alt: "SMILE ASI – Rankin Inlet, Canada – current sky view",
    siteUrl: "https://aurora.phys.ucalgary.ca/",
  },
  {
    type: "image",
    id: "ucalgary-campus",
    country: "Canada",
    name: "UCalgary campus all-sky",
    region: "Canada",
    latitude: 51.0,
    operator: "UCalgary Auroral Imaging Group",
    imageUrl: "https://cam01.sci.ucalgary.ca/AllSkyCam/AllSkyCurrentImage.JPG",
    cadenceMinutes: 2,
    refreshable: true,
    license:
      "Academic research network – credit UCalgary Auroral Imaging Group",
    note: null,
    alt: "UCalgary campus all-sky, Canada – current sky view",
    siteUrl: "https://aurora.phys.ucalgary.ca/",
  },

  // ── Image cards: US ───────────────────────────────────────────────────────
  {
    type: "image",
    id: "nps-isle-royale",
    country: "US",
    name: "NPS Isle Royale – Northshore",
    region: "US",
    latitude: 48.0,
    operator: "US National Park Service",
    imageUrl: "https://www.nps.gov/webcams-isro/northshore.jpg",
    cadenceMinutes: 5,
    refreshable: true,
    license: "Public domain (US federal government) – credit NPS",
    note: null,
    alt: "NPS Isle Royale – Northshore, US – current sky view",
    siteUrl: "https://www.nps.gov/webcams-isro/",
  },
  {
    type: "image",
    id: "allskycam-hope",
    country: "US",
    name: "AllSkyCam – Hope",
    region: "US",
    latitude: 40.9,
    operator: "AllSkyCam.com community",
    imageUrl: "https://www.allskycam.com/u/627/latest_full.jpg",
    cadenceMinutes: 5,
    refreshable: true,
    license: "Free use with credit – AllSkyCam.com community",
    note: null,
    alt: "AllSkyCam – Hope, US – current sky view",
    siteUrl: "https://www.allskycam.com/u/627",
  },
  {
    type: "image",
    id: "linuxkidd-mayhill",
    country: "US",
    name: "linuxkidd all-sky",
    region: "US",
    latitude: 32.9,
    operator: "allsky.linuxkidd.com",
    imageUrl: "https://allsky.linuxkidd.com/image-fullsize.jpg",
    cadenceMinutes: 2,
    refreshable: true,
    license: "No licence text – credit allsky.linuxkidd.com",
    note: null,
    alt: "linuxkidd all-sky, US – current sky view",
    siteUrl: "https://allsky.linuxkidd.com/",
  },

  // ── Image cards: Russia ───────────────────────────────────────────────────
  {
    type: "image",
    id: "starvisor-kaliningrad",
    country: "Russia",
    name: "Starvisor – Kaliningrad",
    region: "Russia",
    latitude: 54.7,
    operator: "Starvisor",
    imageUrl: "https://starvisor.ru/wp-content/uploads/webcam/cap_klnsky.jpg",
    cadenceMinutes: 1,
    refreshable: true,
    license: "No licence text – credit starvisor.ru",
    note: "Aurora only on extreme storms (54°N)",
    alt: "Starvisor – Kaliningrad, Russia – current sky view",
    siteUrl: "https://starvisor.ru/",
  },

  // ── Live cam ──────────────────────────────────────────────────────────────
  {
    type: "live",
    id: "uaf-poker-flat",
    country: "Alaska, US",
    name: "UAF Allsky Aurora Camera – Poker Flat",
    region: "Alaska",
    latitude: 65.1,
    operator: "Geophysical Institute, Univ. of Alaska Fairbanks",
    // Daytime/off-season placeholder. The SSE names the live frame at
    // runtime (probed 2026-08-29: images/poker-notdark.jpg in daylight,
    // PKR/tagged_cam/… at night), so this still only shows while live
    // updates are off.
    imageUrl: "https://allsky.gi.alaska.edu/images/poker-notdark.jpg",
    sseUrl: "https://allsky.gi.alaska.edu/src/checkLive.php?cam=poker-flat",
    frameBaseUrl: "https://allsky.gi.alaska.edu/",
    license: "Public monitor – credit Geophysical Institute, UAF",
    note: null,
    alt: "UAF Allsky Aurora Camera – Poker Flat, Alaska – current sky view",
    siteUrl: "https://allsky.gi.alaska.edu/",
  },

  // ── Twitch embed ──────────────────────────────────────────────────────────
  {
    type: "twitch",
    id: "lights-over-lapland",
    name: "Lights over Lapland",
    region: "Scandinavia",
    operator: "Lights over Lapland",
    twitchChannel: "lightsoverlaplandlive",
    siteUrl: "https://lightsoverlapland.com/",
    note: null,
  },

  // ── Link rows: New Zealand ────────────────────────────────────────────────
  {
    type: "link",
    id: "grahams-allsky",
    name: "Graham's AllSky",
    region: "New Zealand",
    operator: "Graham's AllSky",
    url: "http://grahamsallsky.zapto.org/allsky/image.jpg",
    kind: "http-only",
    note: null,
  },

  // ── Link rows: UK ─────────────────────────────────────────────────────────
  {
    type: "link",
    id: "shetland-cliff-cam-3",
    name: "Shetland Webcams – Cliff Cam 3",
    region: "UK",
    operator: "North Broadcast Ltd (Shetland Webcams)",
    url: "https://www.shetlandwebcams.com/cliff-cam-3/",
    kind: "player",
    note: "Video stream (HLS/HTML5) – no embeddable still",
  },
  {
    type: "link",
    id: "shetland-eshaness",
    name: "Shetland Webcams – Eshaness Lighthouse",
    region: "UK",
    operator: "North Broadcast Ltd (Shetland Webcams)",
    url: "https://www.shetlandwebcams.com/eshaness-lighthouse/",
    kind: "player",
    note: "Video stream – no embeddable still",
  },

  // ── Link rows: Greenland ──────────────────────────────────────────────────
  {
    type: "link",
    id: "ilulissat",
    name: "Ilulissat Airport",
    region: "Greenland",
    operator: "YouTube",
    url: "https://www.youtube.com/watch?v=nT9QtAbaLg4",
    kind: "youtube",
    note: null,
  },
  {
    type: "link",
    id: "tasiilaq",
    name: "Tasiilaq Heliport",
    region: "Greenland",
    operator: "YouTube",
    url: "https://www.youtube.com/watch?v=hfF9bhaBuvw",
    kind: "youtube",
    note: null,
  },

  // ── Link rows: Russia ─────────────────────────────────────────────────────
  {
    type: "link",
    id: "teriberka",
    name: "Teriberka aurora cam",
    region: "Russia",
    operator: "video.auroracam.ru",
    url: "https://video.auroracam.ru/page/mmeWvVgS",
    kind: "player",
    note: "Boomstream video player",
  },

  // ── Link rows: Iceland ────────────────────────────────────────────────────
  {
    type: "link",
    id: "landhotel",
    name: "Hella Landhotel northern lights cam",
    region: "Iceland",
    operator: "Hella Landhotel",
    url: "https://landhotel.is/index.php/northernlights-live",
    kind: "player",
    note: "Video page",
  },
  {
    type: "link",
    id: "adaldalshraun",
    name: "Aðaldalshraun northern lights cam",
    region: "Iceland",
    operator: "Netnurds",
    url: "https://netnurds.com",
    kind: "player",
    note: "Video page",
  },

  // ── Link rows: Scandinavia ────────────────────────────────────────────────
  {
    type: "link",
    id: "kilpisjarvi",
    name: "Kilpisjärvi (North)",
    region: "Scandinavia",
    operator: "YouTube",
    url: "https://www.youtube.com/watch?v=ccTVAhJU5lg",
    kind: "youtube",
    note: null,
  },
  {
    type: "link",
    id: "levi",
    name: "Levi",
    region: "Scandinavia",
    operator: "YouTube",
    url: "https://www.youtube.com/watch?v=rKfecmmzzw0",
    kind: "youtube",
    note: null,
  },
  {
    type: "link",
    id: "posio",
    name: "Posio",
    region: "Scandinavia",
    operator: "YouTube",
    url: "https://www.youtube.com/watch?v=iOmco6eIa-0",
    kind: "youtube",
    note: null,
  },
  {
    type: "link",
    id: "fabian-wimmer-abisko",
    name: "Abisko all-sky by Fabian Wimmer",
    region: "Scandinavia",
    operator: "Fabian Wimmer",
    url: "https://fabianwimmer.com/",
    kind: "player",
    note: "Site player – no plain still in page HTML",
  },
  {
    type: "link",
    id: "nipr-skibotn",
    name: "NIPR Watec – Skibotn",
    region: "Scandinavia",
    operator: "National Institute of Polar Research (NIPR)",
    url: "http://pc115.seg20.nipr.ac.jp/www/opt/realtime.html",
    kind: "http-only",
    note: null,
  },

  // ── Link rows: Canada ─────────────────────────────────────────────────────
  {
    type: "link",
    id: "churchill",
    name: "Churchill",
    region: "Canada",
    operator: "YouTube",
    url: "https://www.youtube.com/watch?v=a0i1Kg6fROg",
    kind: "youtube",
    note: null,
  },
  {
    type: "link",
    id: "banff",
    name: "Banff",
    region: "Canada",
    operator: "YouTube",
    url: "https://www.youtube.com/watch?v=_YomWp1APOk",
    kind: "youtube",
    note: null,
  },

  // ── Link rows: US ─────────────────────────────────────────────────────────
  {
    type: "link",
    id: "fairbanks",
    name: "Fairbanks",
    region: "US",
    operator: "YouTube",
    url: "https://www.youtube.com/watch?v=k7S5IkS_FTA",
    kind: "youtube",
    note: null,
  },
  {
    type: "link",
    id: "sebec-lake",
    name: "Sebec Lake webcam",
    region: "US",
    operator: "NEOC (neoc.com)",
    url: "https://neoc.com/webcam3/",
    kind: "player",
    note: "Site player",
  },

  // ── Link rows: Antarctica ─────────────────────────────────────────────────
  {
    type: "link",
    id: "aad-davis",
    name: "AAD Davis Station webcams",
    region: "Antarctica",
    operator: "Australian Antarctic Division",
    url: "https://www.antarctica.gov.au/live-and-work/predicted-weather/webcams/",
    kind: "player",
    note: "Timestamped frame filenames – no stable still",
  },

  // ── Link rows: rest ───────────────────────────────────────────────────────
  {
    type: "link",
    id: "pizzo-matro",
    name: "Pizzo Matro",
    region: "rest",
    operator: "Roundshot",
    url: "https://pizzomatro.roundshot.com/",
    kind: "player",
    note: "Roundshot viewer – no embeddable still",
  },
  {
    type: "link",
    id: "cape-arkona",
    name: "Cape Arkona (Vitt)",
    region: "rest",
    operator: "Panomax",
    url: "https://kap-arkona.panomax.com/",
    kind: "player",
    note: "Panomax viewer",
  },
];
