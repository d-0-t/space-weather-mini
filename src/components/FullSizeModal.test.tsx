import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import FullSizeModal from "./FullSizeModal";

const renderModal = () =>
  render(
    <FullSizeModal
      label="Test media, full size"
      triggerClassName="test-tile"
      trigger={<img alt="Test media" src="preview.jpg" />}
    >
      <img alt="Test media" src="full.jpg" />
    </FullSizeModal>,
  );

describe("FullSizeModal", () => {
  it("opens on trigger click and closes on a backdrop pointerdown", () => {
    renderModal();
    const dialog = document.querySelector("dialog.image-modal") as HTMLDialogElement;
    expect(dialog.open).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /test media, full size/i }));
    expect(dialog.open).toBe(true);
    // Outside the dialog box (jsdom reports a zero rect, so any nonzero
    // pointer position is "outside") – the dimmed backdrop click closes it
    fireEvent.pointerDown(document, { clientX: 100, clientY: 100 });
    expect(dialog.open).toBe(false);
  });

  it("stays open when the pointerdown lands inside the dialog box", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: /test media, full size/i }));
    const dialog = document.querySelector("dialog.image-modal") as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    fireEvent.pointerDown(dialog.querySelector("img")!, { clientX: 0, clientY: 0 });
    expect(dialog.open).toBe(true);
  });

  it("stays open on a right-click on the backdrop (only primary button closes)", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: /test media, full size/i }));
    const dialog = document.querySelector("dialog.image-modal") as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    fireEvent.pointerDown(document, { clientX: 100, clientY: 100, button: 2 });
    expect(dialog.open).toBe(true);
  });
});