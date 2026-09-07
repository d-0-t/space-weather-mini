import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Sources from "./Sources";

describe("Sources page (ticket 01)", () => {
  it("renders a level-1 Sources heading with the moved Data & Sources article", () => {
    render(<Sources />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Sources" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: /data & sources/i }),
    ).toBeVisible();
    expect(screen.getByText(/NOAA SWPC/)).toBeVisible();
  });

  it("keeps every external source attribution from the moved article", () => {
    render(<Sources />);
    for (const name of [
      "SWPC NOAA",
      "SWPC NOAA Glossary and Terminology",
      "IRF - Swedish space weather center",
      "WDC for Geomagnetism, Kyoto",
      "© OpenStreetMap contributors",
      "Open-Meteo",
    ]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
});
