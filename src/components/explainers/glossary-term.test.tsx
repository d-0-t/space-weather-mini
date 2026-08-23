import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import GlossaryTerm from "./GlossaryTerm";

describe("GlossaryTerm", () => {
  it("renders as a link to the explainers anchor with the correct href", () => {
    render(
      <MemoryRouter>
        <GlossaryTerm termId="kp-index">Kp index</GlossaryTerm>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Kp index" });
    expect(link).toHaveAttribute("href", "/explainers#kp-index");
  });

  it("is keyboard-accessible and not hover-only (focusable and shows focus ring via class)", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <GlossaryTerm termId="radio-flux">Radio flux</GlossaryTerm>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Radio flux" });
    // Link must be in the tab order
    expect(link).not.toHaveAttribute("tabindex", "-1");
    await user.tab();
    expect(link).toHaveFocus();
    expect(link).toHaveClass("glossary-term");
  });

  it("preserves the exact CONTEXT.md term as its accessible name", () => {
    render(
      <MemoryRouter>
        <GlossaryTerm termId="geospace">Geospace</GlossaryTerm>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Geospace" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Geospace" })).toHaveAttribute(
      "href",
      "/explainers#geospace",
    );
  });
});
