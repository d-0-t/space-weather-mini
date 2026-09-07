import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import Nav from "./Nav";
import { DisplayTimezoneProvider } from "../DisplayTimezone/DisplayTimezoneContext";

const renderNav = () =>
  render(
    <MemoryRouter>
      <DisplayTimezoneProvider>
        <Nav />
      </DisplayTimezoneProvider>
    </MemoryRouter>,
  );

const summaryFor = (label: string): HTMLElement => screen.getByText(label);

const disclosureFor = (label: string): HTMLDetailsElement =>
  summaryFor(label).closest("details") as HTMLDetailsElement;

describe("Nav keyboard accessibility", () => {
  it("exposes the Details submenu as a native disclosure that starts closed", () => {
    renderNav();
    const details = disclosureFor("Details");
    expect(details.tagName).toBe("DETAILS");
    expect(details.open).toBe(false);
    const summary = summaryFor("Details");
    expect(summary.tagName).toBe("SUMMARY");
    // The submenu is a list of links, not a menu: no popup semantics
    expect(summary).not.toHaveAttribute("aria-haspopup");
    // Native disclosure: no aria-expanded bookkeeping either
    expect(summary).not.toHaveAttribute("aria-expanded");
    // A chevron on the right of the label announces the toggle visually
    expect(summary.querySelector(".dropdown__chevron")).not.toBeNull();
  });

  it("reveals submenu links to keyboard users on Enter and Escape returns focus to the trigger", async () => {
    const user = userEvent.setup();
    renderNav();
    const details = disclosureFor("Details");
    const summary = summaryFor("Details");

    summary.focus();
    await user.keyboard("{Enter}");
    expect(details.open).toBe(true);

    // All submenu links are now reachable and visible to the accessibility tree
    for (const name of [
      "Geophysical Alert",
      "Daily Data",
      "3-Day Forecast",
      "Weekly Report",
      "27 Day Outlook",
      "Forecast Discussion",
    ]) {
      expect(screen.getByRole("link", { name })).toBeVisible();
    }

    // Tab moves focus into the first submenu item
    await user.tab();
    expect(screen.getByRole("link", { name: "Daily Data" })).toHaveFocus();

    // Escape collapses the menu and returns focus to trigger
    await user.keyboard("{Escape}");
    expect(details.open).toBe(false);
    expect(summary).toHaveFocus();
  });

  it("Space also toggles the disclosure", async () => {
    const user = userEvent.setup();
    renderNav();
    const details = disclosureFor("Details");
    const summary = summaryFor("Details");
    summary.focus();
    await user.keyboard(" ");
    expect(details.open).toBe(true);
    await user.keyboard(" ");
    expect(details.open).toBe(false);
  });

  it("uses valid list markup – link is inside list item, not the reverse", async () => {
    renderNav();
    // Every <a> inside the nav should be a descendant of an <li>, not a parent of one.
    const nav = screen.getByRole("navigation", { name: /primary/i });
    const links = nav.querySelectorAll("a");
    for (const link of Array.from(links)) {
      expect(link.closest("li")).not.toBeNull();
      expect(link.querySelector("li")).toBeNull();
    }
    // Lists are directly under <nav> / <ul>, not wrapped by links
    const listItems = nav.querySelectorAll("li");
    expect(listItems.length).toBeGreaterThan(0);
    for (const li of Array.from(listItems)) {
      expect(li.closest("a")).toBeNull();
    }
  });
});

describe("About submenu", () => {
  it("exposes the About submenu as a native disclosure with the three destinations", () => {
    renderNav();
    const details = disclosureFor("About");
    expect(details.open).toBe(false);
    const links = Array.from(details.querySelectorAll(".dropdown-content a"));
    expect(links.map((l) => l.textContent)).toEqual([
      "This site",
      "Sources",
      "Explainers",
    ]);
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/about",
      "/about/sources",
      "/explainers",
    ]);
  });

  it("reveals the submenu links on activation, moves focus into This site on Tab, and Escape collapses back to the trigger", async () => {
    const user = userEvent.setup();
    renderNav();
    const details = disclosureFor("About");
    const summary = summaryFor("About");

    summary.focus();
    await user.keyboard("{Enter}");
    expect(details.open).toBe(true);
    for (const name of ["This site", "Sources", "Explainers"]) {
      expect(screen.getByRole("link", { name })).toBeVisible();
    }
    await user.tab();
    expect(screen.getByRole("link", { name: "This site" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(details.open).toBe(false);
    expect(summary).toHaveFocus();
  });

  it("closes on blur when focus leaves the disclosure tree", async () => {
    const user = userEvent.setup();
    renderNav();
    const details = disclosureFor("About");
    await user.click(summaryFor("About"));
    expect(details.open).toBe(true);
    // Focus moves outside the About disclosure tree
    fireEvent.blur(details, { relatedTarget: document.body });
    expect(details.open).toBe(false);
  });

  it("opening one submenu closes the other", async () => {
    const user = userEvent.setup();
    renderNav();
    const forecasts = disclosureFor("Details");
    const about = disclosureFor("About");

    await user.click(summaryFor("Details"));
    expect(forecasts.open).toBe(true);
    await user.click(summaryFor("About"));
    expect(about.open).toBe(true);
    expect(forecasts.open).toBe(false);
    await user.click(summaryFor("Details"));
    expect(forecasts.open).toBe(true);
    expect(about.open).toBe(false);
  });

  it("no longer offers Explainers at the top level – it lives inside the About submenu", () => {
    renderNav();
    const menu = document.getElementById("primary-menu")!;
    // No direct child link of the top-level menu links to /explainers
    const topLevelExplainers = menu.querySelectorAll(
      ":scope > li > a[href='/explainers']",
    );
    expect(topLevelExplainers).toHaveLength(0);
    // The Dashboard, Webcams and Local conditions entries stay top level
    for (const href of ["/", "/webcams", "/conditions"]) {
      expect(menu.querySelector(`a[href="${href}"]`)).not.toBeNull();
    }
  });
});

describe("Header brand link", () => {
  it("links the logo and title to the dashboard", () => {
    renderNav();
    const brand = screen.getByRole("link", {
      name: /space weather mini/i,
    });
    expect(brand).toHaveAttribute("href", "/");
    expect(brand.querySelector("img")).not.toBeNull();
    expect(brand.textContent).toContain("Space Weather Mini");
  });
});

describe("Top-level nav entries", () => {
  it("sits the Webcams and Local conditions entries between Dashboard and Details", () => {
    renderNav();
    const nav = screen.getByRole("navigation", { name: /primary/i });
    const items = Array.from(
      nav.querySelectorAll("li > a, li > button, li > details > summary"),
    );
    const labels = items.map((el) => el.textContent?.trim() ?? "");
    const dashboard = labels.indexOf("Dashboard");
    const webcams = labels.indexOf("Webcams");
    const conditions = labels.indexOf("Local conditions");
    const details = labels.indexOf("Details");
    expect(webcams).toBeGreaterThan(dashboard);
    expect(webcams).toBeLessThan(details);
    expect(conditions).toBeGreaterThan(webcams);
    expect(conditions).toBeLessThan(details);
    expect(nav.querySelector('a[href="/webcams"]')).not.toBeNull();
    expect(nav.querySelector('a[href="/conditions"]')).not.toBeNull();
  });
});

describe("Mobile menu (hamburger)", () => {
  it("exposes a hamburger toggle that controls the menu list via aria-expanded", () => {
    renderNav();
    const toggle = screen.getByRole("button", { name: /open menu/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    const menuId = toggle.getAttribute("aria-controls");
    expect(menuId).toBeTruthy();
    const menu = document.getElementById(menuId!);
    expect(menu).toBeInTheDocument();
    expect(menu).toContainElement(summaryFor("About"));
  });

  it("opens the menu on activation, reflects state in aria-expanded, and closes on Escape", async () => {
    const user = userEvent.setup();
    renderNav();
    const toggle = screen.getByRole("button", { name: /open menu/i });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAccessibleName("Close menu");
    await user.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });

  it("closes the menu when a navigation link is activated", async () => {
    const user = userEvent.setup();
    renderNav();
    const toggle = screen.getByRole("button", { name: /open menu/i });
    await user.click(toggle);
    await user.click(screen.getByRole("link", { name: "Dashboard" }));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps the menu open when the About disclosure is activated", async () => {
    const user = userEvent.setup();
    renderNav();
    const toggle = screen.getByRole("button", { name: /open menu/i });
    await user.click(toggle);
    const about = disclosureFor("About");
    await user.click(summaryFor("About"));
    expect(about.open).toBe(true);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.click(summaryFor("About"));
    expect(about.open).toBe(false);
    // Toggling the disclosure closed still keeps the panel itself open
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps an open submenu open on blur while the panel is open, and switches via click", async () => {
    const user = userEvent.setup();
    renderNav();
    const toggle = screen.getByRole("button", { name: /open menu/i });
    await user.click(toggle);
    await user.click(summaryFor("Details"));
    const forecasts = disclosureFor("Details");
    const about = disclosureFor("About");
    // Focus moving to the About trigger must not close Details mid-click:
    // the collapse would move the About trigger out from under the pointer
    fireEvent.blur(forecasts, {
      relatedTarget: about.querySelector("summary"),
    });
    expect(forecasts.open).toBe(true);
    // Switching to About closes Details and keeps the panel open
    await user.click(summaryFor("About"));
    expect(about.open).toBe(true);
    expect(forecasts.open).toBe(false);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("closes the menu on backdrop click, but not when Details is tapped", async () => {
    const user = userEvent.setup();
    renderNav();
    const toggle = screen.getByRole("button", { name: /open menu/i });
    await user.click(toggle);
    const backdrop = document.querySelector(".header__menu-backdrop");
    expect(backdrop).not.toBeNull();

    // Tapping Details opens the submenu and keeps the panel open
    await user.click(summaryFor("Details"));
    expect(disclosureFor("Details").open).toBe(true);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    // Tapping the backdrop closes the panel and its submenu
    await user.click(backdrop as HTMLElement);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(disclosureFor("Details").open).toBe(false);
    expect(document.querySelector(".header__menu-backdrop")).toBeNull();
  });

  it("closes the menu when the panel surface is tapped, but not on controls", async () => {
    const user = userEvent.setup();
    renderNav();
    const toggle = screen.getByRole("button", { name: /open menu/i });
    await user.click(toggle);
    const menu = document.getElementById("primary-menu")!;

    // Controls keep the panel open
    await user.click(summaryFor("Details"));
    expect(disclosureFor("Details").open).toBe(true);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    // A tap on the panel surface closes it
    await user.click(menu);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(disclosureFor("Details").open).toBe(false);
  });
});

describe("Time button (ticket 02)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("sits the Time button before Astro mode, styled like it", () => {
    renderNav();
    const nav = screen.getByRole("navigation", { name: /primary/i });
    const items = Array.from(
      nav.querySelectorAll("li > a, li > button, li > details > summary"),
    );
    const labels = items.map((el) => el.textContent?.trim() ?? "");
    const time = labels.indexOf("Time (local)");
    const astro = labels.indexOf("Astro mode");
    expect(time).toBeGreaterThan(-1);
    expect(time).toBeLessThan(astro);
    const button = screen.getByRole("button", { name: "Time (local)" });
    expect(button).toHaveClass("btn--secondary", "header__time");
  });

  it("shows the current setting in the button label and updates live on Apply", async () => {
    const user = userEvent.setup();
    renderNav();
    const button = screen.getByRole("button", { name: "Time (local)" });
    await user.click(button);
    const dialog = document.querySelector(
      "dialog.time-dialog",
    ) as HTMLDialogElement;
    await user.click(
      within(dialog).getByRole("checkbox", { name: "Show times in UTC" }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(
      screen.getByRole("button", { name: "Time (UTC)" }),
    ).toBeInTheDocument();
  });

  it("opens the Time modal from the hamburger panel and keeps the panel open", async () => {
    const user = userEvent.setup();
    renderNav();
    const toggle = screen.getByRole("button", { name: /open menu/i });
    await user.click(toggle);
    const time = screen.getByRole("button", { name: "Time (local)" });
    expect(time).toBeVisible();
    await user.click(time);
    const dialog = document.querySelector(
      "dialog.time-dialog",
    ) as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});

describe("Astro mode toggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.style.filter = "";
  });

  it("shows an icon button labelled Astro mode with a tooltip title", () => {
    renderNav();
    const button = screen.getByRole("button", { name: "Astro mode" });
    expect(button).toHaveAttribute("title", "Astro mode");
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("toggles the body filter and persists the choice", async () => {
    const user = userEvent.setup();
    renderNav();
    const button = screen.getByRole("button", { name: "Astro mode" });
    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(document.body.style.filter).toBe(
      "sepia(1) saturate(5) hue-rotate(-39deg) contrast(1.1) brightness(0.9)",
    );
    expect(localStorage.getItem("astro-mode")).toBe("on");
    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(document.body.style.filter).toBe("");
    expect(localStorage.getItem("astro-mode")).toBe("off");
  });

  it("restores Astro mode from localStorage on mount", () => {
    localStorage.setItem("astro-mode", "on");
    renderNav();
    const button = screen.getByRole("button", { name: "Astro mode" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(document.body.style.filter).toBe(
      "sepia(1) saturate(5) hue-rotate(-39deg) contrast(1.1) brightness(0.9)",
    );
  });
});
