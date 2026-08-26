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
      "sepia(1) saturate(4.5) hue-rotate(-39deg)",
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
      "sepia(1) saturate(4.5) hue-rotate(-39deg)",
    );
  });
});
