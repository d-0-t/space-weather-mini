import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import CompactToggle from "./CompactToggle";

describe("CompactToggle", () => {
  it("renders a native Compact checkbox with the compress icon left of the label", () => {
    render(<CompactToggle checked={false} onChange={() => {}} />);
    const toggle = screen.getByRole("checkbox", { name: "Compact" });
    expect(toggle).toBeInTheDocument();
    expect(toggle).not.toBeChecked();

    // Named by its visible label text, never aria-label.
    expect(toggle).not.toHaveAttribute("aria-label");
    const label = toggle.closest("label")!;
    expect(label.textContent).toContain("Compact");
    expect(label).toHaveClass("btn--secondary");

    // Compress icon is decoration: DOM order input → label → icon paints
    // visually as icon → label → checkbox via row-reverse, so the icon sits
    // left of the "Compact" label while the checkbox stays on the right
    // (the Color-blind pill pattern).
    const icon = label.querySelector("svg[aria-hidden='true']");
    expect(icon).not.toBeNull();
    const labelText = label.querySelector(".btn__label")!;
    expect(labelText.textContent).toBe("Compact");
    expect(labelText.compareDocumentPosition(icon!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("reflects the checked state and reports changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <CompactToggle checked={false} onChange={onChange} />,
    );
    const toggle = screen.getByRole("checkbox", { name: "Compact" });
    await user.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);

    rerender(<CompactToggle checked={true} onChange={onChange} />);
    expect(screen.getByRole("checkbox", { name: "Compact" })).toBeChecked();
  });
});
