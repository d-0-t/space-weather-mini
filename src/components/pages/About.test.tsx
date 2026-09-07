import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import About from "./About";

describe("About page (This site, ticket 01)", () => {
  it("retitles the page heading to This site and keeps the biography", () => {
    render(<About />);
    expect(
      screen.getByRole("heading", { level: 1, name: "This site" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 3, name: "A very short biography" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "The future plans for the site (alert service)",
      }),
    ).toBeVisible();
  });

  it("no longer carries the Data & Sources article – it moved to /about/sources", () => {
    render(<About />);
    expect(
      screen.queryByRole("heading", { name: /data & sources/i }),
    ).toBeNull();
    expect(screen.queryByRole("link", { name: /SWPC NOAA/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /Open-Meteo/i })).toBeNull();
  });
});
