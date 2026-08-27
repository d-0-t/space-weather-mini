import "./sources.scss";

export interface Source {
  label: string;
  href: string;
}

export const SOURCES = {
  noaaSwpc: {
    label: "NOAA/SWPC",
    href: "https://www.swpc.noaa.gov/",
  },
  irf: {
    label: "IRF",
    href: "https://spaceweather.irf.se/",
  },
  kyoto: {
    label: "WDC for Geomagnetism, Kyoto",
    href: "https://wdc.kugi.kyoto-u.ac.jp/",
  },
} as const satisfies Record<string, Source>;

/** "Source: <a>…</a>" attribution line, shown in the footer of each panel. */
export const SourceAttribution: React.FC<{ source: Source }> = ({ source }) => (
  <p className="source-attribution">
    Source:{" "}
    <a href={source.href} target="_blank" rel="noopener noreferrer">
      {source.label}
    </a>
  </p>
);