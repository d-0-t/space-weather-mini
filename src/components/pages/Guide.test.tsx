import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { DisplayTimezoneProvider } from "../DisplayTimezone/DisplayTimezoneContext";
import Guide from "./Guide";

const renderGuide = () =>
  render(
    <MemoryRouter>
      <DisplayTimezoneProvider>
        <Guide />
      </DisplayTimezoneProvider>
    </MemoryRouter>,
  );

describe("Aurora guide page (ticket 09)", () => {
  it("renders the Aurora guide heading and the five sections in the evening's order", () => {
    renderGuide();
    expect(
      screen.getByRole("heading", { level: 1, name: "Aurora guide" }),
    ).toBeVisible();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual([
      "What auroras are",
      "When to look",
      "Where to look",
      "What can hide aurora",
      "Before you go out",
    ]);
  });

  it("teaches latitude-aware where-to-look instead of a blanket 'face north'", () => {
    renderGuide();
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/not always/i);
    expect(body).toMatch(/overhead/i);
    expect(body).toMatch(/southern sky/i);
    expect(body).toMatch(/low on the northern horizon/i);
    expect(body).toMatch(/next 30–90 minutes/i);
  });

  it("defers the live position to the Dashboard's oval and view-distance anchors", () => {
    renderGuide();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/#view-distance",
    );
    expect(
      screen.getByRole("link", { name: "Oval glow intensity" }),
    ).toHaveAttribute("href", "/#oval-glow");
  });

  it("links the sky caveats to the stored place's cloud and light-pollution maps", () => {
    renderGuide();
    for (const [name, host] of [
      ["live cloud-cover map", "weather-radar-live.com"],
      ["light-pollution map", "lightpollutionmap.info"],
    ] as const) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link.getAttribute("href")).toContain(host);
    }
    // Both carry the stored place (Luleå by default): honest map viewers,
    // never an invented light-pollution number.
    expect(
      screen
        .getByRole("link", { name: "light-pollution map" })
        .getAttribute("href"),
    ).toContain("lat=65.5848");
  });

  it("keeps the honesty bounds: no promise, no colour promise, no city strings, no light-pollution numbers", () => {
    renderGuide();
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/never something anyone can promise/i);
    expect(body).toMatch(/approximate/i);
    expect(body).toMatch(/never a promise/i);
    expect(body).not.toMatch(/you will see (green|red|purple)/i);
    expect(body).not.toMatch(/Michigan|Maine|Florida|Texas/i);
    // N6: no invented sky numbers – the map link is the only light-pollution
    // surface, never a Bortle or SQM value.
    expect(body).not.toMatch(/Bortle|SQM/i);
  });

  it("routes its terms through the shared glossary popups", () => {
    renderGuide();
    for (const name of [
      "solar wind",
      "Night",
      "Kp index",
      "Oval",
      "View distance",
    ]) {
      expect(screen.getByRole("button", { name })).toBeVisible();
    }
    expect(screen.queryByRole("link", { name: "Night" })).toBeNull();
  });
});
