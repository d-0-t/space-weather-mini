// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom does not implement <dialog> showModal()/close(), so native-dialog
// modals need a minimal API shim in tests. Mirrors browser behavior:
// showModal() opens the dialog, moves focus to its first focusable element,
// and Escape closes it; close() fires the cancel/close events and returns
// focus to the element that had it before the dialog opened.
if (
  typeof HTMLDialogElement !== "undefined" &&
  !HTMLDialogElement.prototype.showModal
) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    if (this.open) return;
    this._lastFocused = document.activeElement;
    this.open = true;
    const focusable = this.querySelector(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    focusable?.focus();
    this._closeOnEscape = (event) => {
      if (event.key === "Escape" && this.open) {
        this.dispatchEvent(new Event("cancel", { cancelable: true }));
        this.close();
      }
    };
    document.addEventListener("keydown", this._closeOnEscape);
  };
  HTMLDialogElement.prototype.close = function close() {
    if (!this.open) return;
    this.open = false;
    if (this._closeOnEscape) {
      document.removeEventListener("keydown", this._closeOnEscape);
      this._closeOnEscape = null;
    }
    this._lastFocused?.focus?.();
    this.dispatchEvent(new Event("close"));
  };
}

afterEach(() => {
  cleanup();
});