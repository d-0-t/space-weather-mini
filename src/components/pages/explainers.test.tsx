import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Explainers from "./explainers";

const renderPage = () =>
  render(
    <MemoryRouter>
      <Explainers />
    </MemoryRouter>,
  );

describe("Explainers page", () => {
  it("renders a level-1 heading for the explainers glossary", async () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /explainers/i }),
    ).toBeInTheDocument();
  });

  it("lists one plain-language explanation per concept with vocabulary matching CONTEXT.md", async () => {
    renderPage();
    // Core measures and phenomena – headings must use the exact CONTEXT.md terms
    for (const name of [
      "Kp index",
      "A index",
      "Radio flux",
      "Geomagnetic activity",
      "Geospace",
      "Solar radiation storm",
      "Radio blackout",
      "Aurora forecast",
    ]) {
      expect(
        screen.getByRole("heading", { level: 2, name }),
      ).toBeInTheDocument();
    }
    // Product types – each product the app displays gets an entry
    for (const name of [
      "Space weather product",
      "Forecast discussion",
      "3-day forecast",
      "Weekly report",
      "27-day outlook",
      "Daily geomagnetic indices",
      "Geophysical alert",
    ]) {
      expect(
        screen.getByRole("heading", { level: 2, name }),
      ).toBeInTheDocument();
    }
    // Each entry has an id anchor so product pages can deep-link to it
    expect(document.getElementById("kp-index")).toBeInTheDocument();
    expect(document.getElementById("a-index")).toBeInTheDocument();
    expect(document.getElementById("radio-flux")).toBeInTheDocument();
    expect(document.getElementById("geospace")).toBeInTheDocument();
    expect(document.getElementById("aurora-forecast")).toBeInTheDocument();
  });

  it("uses plain-language body copy without avoided terms", async () => {
    renderPage();
    // Spot-check that the body copy reflects CONTEXT.md definitions
    expect(
      screen.getByText(/planetary geomagnetic activity index on a 0–9 scale/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/daily planetary geomagnetic index derived from Kp/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/solar radio flux at 10\.7 cm/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/near-Earth space environment/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/S1–S5 scale.*elevated energetic particles/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/R1–R5 scale.*disrupting HF radio/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/OVATION 30-minute aurora images/i),
    ).toBeInTheDocument();
    // Avoided synonyms must not appear anywhere on the page
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/K-index/i);
    expect(body).not.toMatch(/GeoAlert/);
    expect(body).not.toMatch(/wwv\b/);
    expect(body).not.toMatch(/regionale/i);
  });

  it("has a single h1 and correct heading hierarchy", async () => {
    renderPage();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    // At least the 15 product/measure headings above
    expect(
      screen.getAllByRole("heading", { level: 2 }).length,
    ).toBeGreaterThanOrEqual(15);
  });

  it("explains the offline PWA honestly: first visit online, iOS eviction, no invented data", async () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 2, name: "Offline (PWA)" }),
    ).toBeInTheDocument();
    const article = document.getElementById("offline-pwa")!;
    expect(article).toBeInTheDocument();
    const body = article.textContent ?? "";
    // First visit must be online
    expect(body).toMatch(/first visit must be online/i);
    // Honest stale copy and no-data-invented promise
    expect(body).toMatch(/couldn't reach NOAA/i);
    expect(body).toMatch(/no data is invented/i);
    // iOS 7-day eviction is documented
    expect(body).toMatch(/7 days/i);
  });
});
