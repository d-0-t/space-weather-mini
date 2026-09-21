import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import About from "./About";

describe("About page (This site, ticket 01)", () => {
  it("retitles the page heading to This site with the three article h2s", () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "This site" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "Who am I?" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "What this site does" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "Install on mobile" }),
    ).toBeVisible();
  });

  // PARKED 2026-09-21 (background-push field findings): the Install &
  // Alerts section is hidden until background alerts are proven on real
  // phones. Restore with the pointer in About.tsx, the nav entry, the
  // route and the title map.
  // it("hands the install steps to the Install & Alerts section", () => {
  //   render(
  //     <MemoryRouter>
  //       <About />
  //     </MemoryRouter>,
  //   );
  //   const link = screen.getByRole("link", { name: "Install & Alerts" });
  //   expect(link).toHaveAttribute("href", "/about/install-alerts");
  //   // The ordered steps themselves moved; only the pointer stays
  //   expect(document.querySelector("article ol")).toBeNull();
  // });

  it("links the feature pages to their routes", () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("link", { name: "Local conditions" }),
    ).toHaveAttribute("href", "/conditions");
    expect(screen.getByRole("link", { name: "Webcams" })).toHaveAttribute(
      "href",
      "/webcams",
    );
    expect(screen.getByRole("link", { name: "Explainers" })).toHaveAttribute(
      "href",
      "/explainers",
    );
  });
});
