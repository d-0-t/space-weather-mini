// TDD RED for ticket 07: the "Install & Alerts" section of the About
// submenu. The relocated install steps (with the Home-Screen step iOS
// requires for push), the background-alerts do/don't documentation and the
// no-accounts privacy note, served at /about/install-alerts as the deep-link
// target for the alert settings' failure panels.
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import InstallAlerts from "./InstallAlerts";

const renderPage = (route = "/about/install-alerts") =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <InstallAlerts />
    </MemoryRouter>,
  );

describe("Install & Alerts page (ticket 07)", () => {
  it("renders one h1 and the three sections in reading order", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "Install & Alerts" }),
    ).toBeVisible();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual([
      "Install on mobile",
      "What background alerts do",
      "Your data",
    ]);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("carries both platform install flows under the anchor the failure panels deep-link to", () => {
    renderPage();
    expect(document.getElementById("install")).not.toBeNull();
    const body = document.body.textContent ?? "";
    // The relocated Android flow keeps its steps
    expect(body).toMatch(/three vertical dots/i);
    expect(body).toMatch(/Create shortcut/i);
    // The Home-Screen step iOS requires for push
    expect(body).toMatch(/Safari/i);
    expect(body).toMatch(/Share/i);
    expect(body).toMatch(/Add to Home Screen/i);
  });

  it("documents what background alerts do and don't do", () => {
    renderPage();
    const body = document.body.textContent ?? "";
    // Closed-phone delivery is the point of the feature
    expect(body).toMatch(/even with the app closed/i);
    // The installed-app requirement on iOS, named honestly
    expect(body).toMatch(/installed this way/i);
  });

  it("states the no-accounts privacy note: what the sender receives and withholds", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Your data" })).toBeVisible();
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/no accounts/i);
    expect(body).toMatch(/receives/i);
    expect(body).toMatch(/does not receive/i);
    // Exactly the stored facts, in the glossary's own terms
    expect(body).toMatch(/push address/i);
    expect(body).toMatch(/alert threshold/i);
    expect(body).toMatch(/alert type toggles/i);
    expect(body).toMatch(/live alert settings/i);
    expect(body).toMatch(/short name and timezone/i);
    // And the withheld ones
    expect(body).toMatch(/personal information/i);
    expect(body).toMatch(/current location/i);
  });

  it("stays inside the honesty bounds: no delivery promise, no per-town promises", () => {
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/guarantee|will arrive|always works/i);
    expect(body).not.toMatch(/Michigan|Maine|Florida|Texas/i);
  });

  it("lands on the heading the URL names", () => {
    const scrolled: string[] = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function scrollIntoViewStub() {
      scrolled.push(this.id);
    };
    try {
      renderPage("/about/install-alerts#install");
      expect(scrolled).toEqual(["install"]);
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });
});
