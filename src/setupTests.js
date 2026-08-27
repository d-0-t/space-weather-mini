// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom does not implement <dialog> showModal()/close(), so native-dialog
// modals need a minimal API shim in tests. Mirrors browser behavior:
// showModal() opens the dialog and Escape closes it.
if (
  typeof HTMLDialogElement !== "undefined" &&
  !HTMLDialogElement.prototype.showModal
) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    if (this.open) return;
    this.open = true;
    this._closeOnEscape = (event) => {
      if (event.key === "Escape" && this.open) this.close();
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
  };
}

afterEach(() => {
  cleanup();
});