import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import Nav from "./Nav";

const renderNav = () =>
  render(
    <MemoryRouter>
      <Nav />
    </MemoryRouter>,
  );

describe("Nav keyboard accessibility", () => {
  it("exposes the Details submenu as an accessible menu via a button with aria-expanded", async () => {
    renderNav();
    const trigger = screen.getByRole("button", {
      name: /^details$/i,
    });
    expect(trigger).toHaveAttribute("aria-haspopup", "true");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-controls")).toBeTruthy();
  });

  it("reveals submenu links to keyboard users on focus and toggles aria-expanded on activation", async () => {
    const user = userEvent.setup();
    renderNav();
    const trigger = screen.getByRole("button", {
      name: /^details$/i,
    });
    const submenuId = trigger.getAttribute("aria-controls")!;
    const submenu = document.getElementById(submenuId)!;
    expect(submenu).toBeInTheDocument();

    // Initially collapsed
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    // Tab to the trigger and activate with Enter – should expand
    trigger.focus();
    expect(trigger).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");

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
    expect(
      screen.getByRole("link", { name: "Geophysical Alert" }),
    ).toHaveFocus();

    // Escape collapses the menu and returns focus to trigger
    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
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

describe("Mobile menu (hamburger)", () => {
  it("exposes a hamburger toggle that controls the menu list via aria-expanded", () => {
    renderNav();
    const toggle = screen.getByRole("button", { name: /open menu/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    const menuId = toggle.getAttribute("aria-controls");
    expect(menuId).toBeTruthy();
    const menu = document.getElementById(menuId!);
    expect(menu).toBeInTheDocument();
    expect(menu).toContainElement(
      screen.getByRole("link", { name: "About" }),
    );
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
    await user.click(screen.getByRole("link", { name: "About" }));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps the menu open when the Details disclosure is activated", async () => {
    const user = userEvent.setup();
    renderNav();
    const toggle = screen.getByRole("button", { name: /open menu/i });
    await user.click(toggle);
    await user.click(
      screen.getByRole("button", { name: /^details$/i }),
    );
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
