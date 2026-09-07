import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DISPLAY_TIMEZONE_STORAGE_KEY } from "../../products/display-timezone";
import {
  DisplayTimezoneProvider,
  useDisplayTimezone,
} from "./DisplayTimezoneContext";

/** A consumer probe: shows the mode and buttons that flip it. */
const Probe: React.FC = () => {
  const { displayTimezone, setDisplayTimezone } = useDisplayTimezone();
  return (
    <>
      <p>mode: {displayTimezone}</p>
      <button
        type="button"
        onClick={() => setDisplayTimezone("utc")}
      >
        choose utc
      </button>
      <button
        type="button"
        onClick={() => setDisplayTimezone("local")}
      >
        choose local
      </button>
    </>
  );
};

const renderProbe = () =>
  render(
    <DisplayTimezoneProvider>
      <Probe />
    </DisplayTimezoneProvider>,
  );

describe("DisplayTimezoneContext (ticket 02)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("provides the persisted mode to consumers", () => {
    localStorage.setItem(
      DISPLAY_TIMEZONE_STORAGE_KEY,
      JSON.stringify({ timezone: "utc", v: 1 }),
    );
    renderProbe();
    expect(screen.getByText("mode: utc")).toBeInTheDocument();
  });

  it("provides Local when nothing is stored – the default", () => {
    renderProbe();
    expect(screen.getByText("mode: local")).toBeInTheDocument();
  });

  it("persists a change versioned and updates consumers live", async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.click(screen.getByRole("button", { name: "choose utc" }));
    expect(localStorage.getItem(DISPLAY_TIMEZONE_STORAGE_KEY)).toBe(
      JSON.stringify({ timezone: "utc", v: 1 }),
    );
    expect(screen.getByText("mode: utc")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "choose local" }));
    expect(localStorage.getItem(DISPLAY_TIMEZONE_STORAGE_KEY)).toBe(
      JSON.stringify({ timezone: "local", v: 1 }),
    );
    expect(screen.getByText("mode: local")).toBeInTheDocument();
  });

  it("throws when a consumer renders outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => render(<Probe />)).toThrow(
        /useDisplayTimezone must be used inside DisplayTimezoneProvider/,
      );
    } finally {
      spy.mockRestore();
    }
  });
});
