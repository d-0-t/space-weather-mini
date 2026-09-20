// The solar gate is absolute-instant math, but the suite pins the device
// zone like every time-sensitive file so its instants stay deterministic.
process.env.TZ = "Europe/Stockholm";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DisplayTimezoneProvider } from "../../../../DisplayTimezone/DisplayTimezoneContext";
import type {
  ReachProbability,
  ReachTown,
} from "../../../../../products/reach-towns";
import ReachTowns from "./ReachTowns";

/**
 * The component reads the wall clock through suncalc, so the fake Date
 * pins the instants; full fake timers let the 60 s tick be advanced.
 */
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** One reach town under test, in the shape the selection returns. */
const town = (
  city: string,
  country: string,
  countryCode: string,
  probability: ReachProbability,
): ReachTown => ({
  city,
  country,
  countryCode,
  margin: 3,
  probability,
});

describe("ReachTowns", () => {
  it("renders nothing when no town is both in reach and dark", () => {
    // Midsummer, Kp 0 (edge 66°): every high-MLAT town is in daylight,
    // midnight sun or bright twilight – nothing qualifies.
    vi.setSystemTime(new Date("2026-06-21T12:00:00Z"));
    const { container } = render(<ReachTowns kp={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the towns in reach for the current Kp with flag, city and probability", () => {
    // 2026-12-21T12:00Z, Kp 1 (edge 64°): Rankin Inlet (MLAT 71.26 → Very
    // likely) is at 06:22 local, Yellowknife (68.52 → Likely, webcam town)
    // at 04:22, Churchill (67.11 → Likely, guide town) at 04:36, Rabbit
    // Lake (65.68 → Possible, webcam town) at 06:22, Fairbanks (65.67 →
    // Possible, webcam town) at 02:10 and Gillam (64.68 → Possible,
    // webcam town) at 06:22 – all deep night. Webcam towns ride past the
    // guide dedup: Canada carries four cam rows plus its guide-likely
    // winner Churchill, and Europe is still too bright at this hour
    // (Tromsø tops out at −3° sun on the solstice).
    vi.setSystemTime(new Date("2026-12-21T12:00:00Z"));
    render(<ReachTowns kp={1} />);

    const rows = Array.from(document.querySelectorAll(".reach-towns__town"));
    expect(
      rows.map((row) => row.querySelector(".reach-towns__city")?.textContent),
    ).toEqual([
      "Rankin Inlet",
      "Yellowknife",
      "Churchill",
      "Rabbit Lake",
      "Fairbanks",
      "Gillam",
    ]);

    const fairbanks = screen.getByText("Fairbanks").closest("li")!;
    const flag = within(fairbanks).getByRole("img", { name: "United States" });
    expect(flag).toHaveAttribute("src", "https://flagcdn.com/16x12/us.png");
    expect(flag).toHaveAttribute("width", "16");
    expect(flag).toHaveAttribute("height", "12");
    expect(flag).toHaveAttribute("loading", "lazy");
    expect(flag).toHaveAttribute("title", "United States");

    // The probability icon is ranked (bars), wrapped in the band class,
    // titled with the band explanation and named for screen readers.
    const probability = fairbanks.querySelector(".reach-towns__probability")!;
    expect(probability).toHaveClass("reach-towns__probability--possible");
    const icon = probability.querySelector(".reach-towns__probability-icon")!;
    expect(icon.getAttribute("title")).toMatch(
      /Possible .* May be seen, not promised\./,
    );
    expect(within(fairbanks).getByText("Possible")).toHaveClass("sr-only");
    expect(icon.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("recomputes the list as time passes on its 60 s tick", () => {
    // 2026-12-21T12:00Z: Abisko (MLAT 66.32, in reach at Kp 5) is at its
    // 13:00 local bright civil twilight; twelve hours later it is 01:00
    // and deep night.
    vi.setSystemTime(new Date("2026-12-21T12:00:00Z"));
    render(<ReachTowns kp={5} />);
    expect(screen.queryByText("Abisko")).toBeNull();
    act(() => vi.advanceTimersByTime(12 * 60 * 60_000));
    expect(screen.getByText("Abisko")).toBeInTheDocument();
  });

  it("gives a town with a webcam a camera button that opens its webcams dialog", () => {
    render(
      <DisplayTimezoneProvider>
        <ReachTowns
          kp={5}
          towns={[town("Tromsø", "Norway", "no", "very-likely")]}
        />
      </DisplayTimezoneProvider>,
    );
    const row = screen.getByText("Tromsø").closest("li")!;
    const camera = within(row).getByRole("button", {
      name: "Open the Tromsø webcam",
    });
    expect(camera).toHaveClass("reach-towns__camera");
    expect(camera).toHaveAttribute("title", "Open the Tromsø webcam");
    expect(camera.querySelector("svg")).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(camera);
    const dialog = document.querySelector(
      "dialog.reach-town-webcams",
    ) as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(
      within(dialog).getByRole("heading", {
        name: "Norway Tromsø, Norway webcams",
      }),
    ).toBeInTheDocument();
    const still = within(dialog).getByRole("img", { name: /Tromsø AI/ });
    expect(still.getAttribute("src")).toMatch(
      /^https:\/\/tromsoe-ai\.cei\.uec\.ac\.jp\/.*\?t=\d+$/,
    );
    expect(
      within(dialog).getByRole("link", { name: "UEC - Tromsø AI" }),
    ).toHaveAttribute("href", "https://tromsoe-ai.cei.uec.ac.jp/");

    // A primary pointerdown outside the dialog box (jsdom reports a zero
    // rect, so any nonzero position is outside) closes it.
    fireEvent.pointerDown(document, { clientX: 100, clientY: 100 });
    expect(dialog.open).toBe(false);
  });

  it("stacks every webcam of a multi-cam town and leaves camless towns buttonless", () => {
    render(
      <DisplayTimezoneProvider>
        <ReachTowns
          kp={5}
          towns={[
            town("Kiruna", "Sweden", "se", "very-likely"),
            town("Rovaniemi", "Finland", "fi", "possible"),
          ]}
        />
      </DisplayTimezoneProvider>,
    );
    const kiruna = screen.getByText("Kiruna").closest("li")!;
    fireEvent.click(
      within(kiruna).getByRole("button", { name: "Open the Kiruna webcams" }),
    );
    const dialog = document.querySelector(
      "dialog.reach-town-webcams",
    ) as HTMLDialogElement;
    // A multi-cam dialog carries the landscape modifier (side-by-side
    // columns from sm); a single-cam one stays fit-content.
    expect(dialog).toHaveClass("reach-town-webcams--multi");
    expect(within(dialog).getAllByRole("heading", { level: 4 })).toHaveLength(
      2,
    );
    expect(
      within(dialog).getAllByRole("img", { name: /current sky view/ }),
    ).toHaveLength(2);
    // Rovaniemi owns no cam: no camera button, no dialog of its own.
    const rovaniemi = screen.getByText("Rovaniemi").closest("li")!;
    expect(within(rovaniemi).queryByRole("button")).toBeNull();
    expect(dialog.textContent).toContain("Kiruna");
  });
});
