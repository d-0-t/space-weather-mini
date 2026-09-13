import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import GlossaryTerm from "./GlossaryTerm";
import { getGlossaryEntry } from "./glossary";

const renderTerm = (termId = "kp-index", label = "Kp index") =>
  render(
    <MemoryRouter>
      <p>
        Learn more: <GlossaryTerm termId={termId}>{label}</GlossaryTerm>
      </p>
    </MemoryRouter>,
  );

describe("GlossaryTerm", () => {
  it("renders a focusable term control, not a navigation link", async () => {
    const user = userEvent.setup();
    const { container } = renderTerm();
    // The reader keeps their place: no anchor that navigates to Explainers
    expect(screen.queryByRole("link", { name: "Kp index" })).toBeNull();
    const term = screen.getByRole("button", { name: "Kp index" });
    expect(container.querySelector(".glossary-term")).toContainElement(term);
    await user.tab();
    expect(term).toHaveFocus();
  });

  it("opens the entry in a popup at the term, verbatim from the shared source", async () => {
    const user = userEvent.setup();
    renderTerm();
    const entry = getGlossaryEntry("kp-index")!;
    await user.click(screen.getByRole("button", { name: "Kp index" }));
    expect(screen.getByText(entry.body)).toBeInTheDocument();
    // The popover body is named for assistive tech by the entry title
    expect(
      screen.getByRole("button", { name: `Close: ${entry.title}` }),
    ).toBeInTheDocument();
  });

  it("moves focus into the popup and reaches the full-glossary link", async () => {
    const user = userEvent.setup();
    renderTerm();
    const entry = getGlossaryEntry("kp-index")!;
    const term = screen.getByRole("button", { name: "Kp index" });
    await user.click(term);
    // Focus lands inside the popup, not left on the term
    const close = screen.getByRole("button", { name: `Close: ${entry.title}` });
    expect(close).toHaveFocus();
    await user.tab();
    expect(
      screen.getByRole("link", { name: /read the full glossary/i }),
    ).toHaveFocus();
    // Focus cycles back into the popup rather than escaping to the page
    await user.tab();
    expect(close).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(term).toHaveFocus();
  });

  it("returns focus to the term when dismissed from outside", async () => {
    const user = userEvent.setup();
    renderTerm();
    const term = screen.getByRole("button", { name: "Kp index" });
    await user.click(term);
    fireEvent.pointerDown(document.body, { clientX: 0, clientY: 0 });
    expect(screen.queryByText(getGlossaryEntry("kp-index")!.body)).toBeNull();
    expect(term).toHaveFocus();
  });

  it("closes on Escape and returns focus to the term", async () => {
    const user = userEvent.setup();
    renderTerm();
    const entry = getGlossaryEntry("kp-index")!;
    const term = screen.getByRole("button", { name: "Kp index" });
    await user.click(term);
    expect(screen.getByText(entry.body)).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByText(entry.body)).toBeNull();
    expect(term).toHaveFocus();
  });

  it("opens from the keyboard and returns focus on dismiss", async () => {
    const user = userEvent.setup();
    renderTerm();
    const entry = getGlossaryEntry("kp-index")!;
    const term = screen.getByRole("button", { name: "Kp index" });
    await user.tab();
    expect(term).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByText(entry.body)).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByText(entry.body)).toBeNull();
    expect(term).toHaveFocus();
  });

  it("offers a quiet read-full-glossary path to the entry anchor", async () => {
    const user = userEvent.setup();
    renderTerm();
    await user.click(screen.getByRole("button", { name: "Kp index" }));
    expect(
      screen.getByRole("link", { name: /read the full glossary/i }),
    ).toHaveAttribute("href", "/explainers#kp-index");
  });

  it("keeps the exact CONTEXT.md term as the accessible name", () => {
    renderTerm("geospace", "Geospace");
    expect(
      screen.getByRole("button", { name: "Geospace" }),
    ).toBeInTheDocument();
  });

  it("falls back to plain text when the term has no entry", () => {
    renderTerm("not-a-term", "Mystery term");
    expect(
      screen.queryByRole("button", { name: "Mystery term" }),
    ).toBeNull();
    expect(screen.getByText(/Mystery term/)).toBeInTheDocument();
  });
});
