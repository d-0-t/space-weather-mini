import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import Nav from "./Nav";
import { DisplayTimezoneProvider } from "../DisplayTimezone/DisplayTimezoneContext";
import { DISPLAY_TIMEZONE_STORAGE_KEY } from "../../products/display-timezone";

/** The Nav host the way the app root composes it: router + provider. */
const renderNav = () =>
  render(
    <MemoryRouter>
      <DisplayTimezoneProvider>
        <Nav />
      </DisplayTimezoneProvider>
    </MemoryRouter>,
  );

/** Opens the Time modal from the header button and returns the dialog. */
const openTimeModal = async (
  user: ReturnType<typeof userEvent.setup>,
): Promise<HTMLDialogElement> => {
  await user.click(screen.getByRole("button", { name: /^Time \(/ }));
  const dialog = document.querySelector(
    "dialog.time-dialog",
  ) as HTMLDialogElement;
  expect(dialog.open).toBe(true);
  return dialog;
};

const checkboxIn = (dialog: HTMLDialogElement): HTMLInputElement =>
  within(dialog).getByRole("checkbox", {
    name: "Show times in UTC",
  }) as HTMLInputElement;

describe("Time modal (ticket 02)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("opens from the nav button, named by its visible heading, with the checkbox unchecked by default", async () => {
    const user = userEvent.setup();
    renderNav();
    expect(document.querySelector("dialog.time-dialog")).toBeNull();
    const dialog = await openTimeModal(user);
    expect(screen.getByRole("dialog", { name: "Time Settings" })).toBe(dialog);
    expect(checkboxIn(dialog).checked).toBe(false);
  });

  it("reflects a stored UTC choice as checked", async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      DISPLAY_TIMEZONE_STORAGE_KEY,
      JSON.stringify({ timezone: "utc", v: 1 }),
    );
    renderNav();
    const dialog = await openTimeModal(user);
    expect(checkboxIn(dialog).checked).toBe(true);
  });

  it("Apply saves the versioned choice, closes, and returns focus to the Time button", async () => {
    const user = userEvent.setup();
    renderNav();
    const dialog = await openTimeModal(user);
    await user.click(checkboxIn(dialog));
    await user.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(dialog.open).toBe(false);
    expect(localStorage.getItem(DISPLAY_TIMEZONE_STORAGE_KEY)).toBe(
      JSON.stringify({ timezone: "utc", v: 1 }),
    );
    expect(screen.getByRole("button", { name: "Time (UTC)" })).toHaveFocus();
  });

  it("Apply saves Local when the box is left unchecked", async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      DISPLAY_TIMEZONE_STORAGE_KEY,
      JSON.stringify({ timezone: "utc", v: 1 }),
    );
    renderNav();
    const dialog = await openTimeModal(user);
    await user.click(checkboxIn(dialog)); // uncheck
    await user.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(localStorage.getItem(DISPLAY_TIMEZONE_STORAGE_KEY)).toBe(
      JSON.stringify({ timezone: "local", v: 1 }),
    );
    expect(screen.getByRole("button", { name: "Time (local)" })).toHaveFocus();
  });

  it("Cancel discards the change and reopening shows the stored value", async () => {
    const user = userEvent.setup();
    renderNav();
    const dialog = await openTimeModal(user);
    await user.click(checkboxIn(dialog));
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(dialog).not.toBeInTheDocument();
    expect(localStorage.getItem(DISPLAY_TIMEZONE_STORAGE_KEY)).toBeNull();
    const reopened = await openTimeModal(user);
    expect(checkboxIn(reopened).checked).toBe(false);
  });

  it("X discards the change without saving", async () => {
    const user = userEvent.setup();
    renderNav();
    const dialog = await openTimeModal(user);
    await user.click(checkboxIn(dialog));
    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(document.querySelector("dialog.time-dialog")).toBeNull();
    expect(localStorage.getItem(DISPLAY_TIMEZONE_STORAGE_KEY)).toBeNull();
  });

  it("Escape discards the change without saving", async () => {
    const user = userEvent.setup();
    renderNav();
    const dialog = await openTimeModal(user);
    await user.click(checkboxIn(dialog));
    await user.keyboard("{Escape}");
    expect(document.querySelector("dialog.time-dialog")).toBeNull();
    expect(localStorage.getItem(DISPLAY_TIMEZONE_STORAGE_KEY)).toBeNull();
    expect(screen.getByRole("button", { name: "Time (local)" })).toHaveFocus();
  });

  it("a backdrop click discards the change without saving", async () => {
    const user = userEvent.setup();
    renderNav();
    const dialog = await openTimeModal(user);
    await user.click(checkboxIn(dialog));
    fireEvent.pointerDown(document, {
      button: 0,
      clientX: 200,
      clientY: 200,
    });
    expect(document.querySelector("dialog.time-dialog")).toBeNull();
    expect(localStorage.getItem(DISPLAY_TIMEZONE_STORAGE_KEY)).toBeNull();
  });

  it("explains the device-timezone rule and the UTC-dated tables exception", async () => {
    const user = userEvent.setup();
    renderNav();
    const dialog = await openTimeModal(user);
    const text = dialog.textContent ?? "";
    expect(text).toMatch(/device's timezone/);
    expect(text).toMatch(/no matter what location/);
    expect(text).toMatch(/27-day outlook/);
    expect(text).toMatch(/daily geomagnetic indices/);
    expect(text).toMatch(/UTC dates/);
  });
});
