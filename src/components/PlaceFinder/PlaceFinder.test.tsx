// The modal formats nothing time-dependent; the fixtures carry the honest
// Nominatim payloads and the geolocation stub the single-shot device fix.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PlaceFinder from "./PlaceFinder";
import { DEFAULT_PLACE } from "../../data/place-storage";
import type { GeocodeMatch } from "../../data/geocoding";
import kirunaFixture from "../../data/fixtures/nominatim-kiruna.json";
import springfieldFixture from "../../data/fixtures/nominatim-springfield.json";
import reverseTromsoFixture from "../../data/fixtures/nominatim-reverse-tromso.json";
import {
  jsonResponse,
  restoreGeolocation,
  stubGeolocation,
} from "../../test/nominatim-test-utils";

/** Harness: shows what the page would receive so picks are observable. */
const Harness: React.FC<{ pickedRef?: (match: GeocodeMatch | null) => void }> = ({
  pickedRef,
}) => {
  const [picked, setPicked] = useState<GeocodeMatch | null>(null);
  pickedRef?.(picked);
  return (
    <>
      <PlaceFinder
        place={DEFAULT_PLACE}
        onPick={(match) => {
          setPicked(match);
          pickedRef?.(match);
        }}
      />
      {picked ? <p>Picked: {picked.displayName}</p> : null}
    </>
  );
};

const renderFinder = (): { picked: () => GeocodeMatch | null } => {
  let latest: GeocodeMatch | null = null;
  render(<Harness pickedRef={(match) => (latest = match)} />);
  return { picked: () => latest };
};

const modal = (): HTMLDialogElement =>
  document.querySelector("dialog.place-finder__modal") as HTMLDialogElement;

const openModal = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(trigger());
};

/** The trigger; browsers name it by the shortName text, jsdom by the title. */
const trigger = (): HTMLButtonElement =>
  screen.getByRole("button", {
    name: /Östersund, Jämtland County/,
  }) as HTMLButtonElement;

describe("PlaceFinder modal (shared place, ticket 02 offline-personal-oval)", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    restoreGeolocation();
  });

  it("renders the trigger as an icon+shortName button named by the place", () => {
    renderFinder();
    const button = trigger();
    expect(button).toHaveClass("place-finder__trigger");
    expect(button.querySelector(".btn__label")?.textContent).toBe(
      "Östersund, Jämtland County",
    );
    // Mouse users get the full display name as the tooltip
    expect(button.getAttribute("title")).toBe(
      "Östersund, Jämtland County, Sweden",
    );
    expect(modal().open).toBe(false);
  });

  it("opens the change-location modal on click and closes it on the close button", async () => {
    const user = userEvent.setup();
    renderFinder();
    await user.click(trigger());
    expect(modal().open).toBe(true);
    expect(
      within(modal()).getByRole("heading", { name: "Change location" }),
    ).toBeInTheDocument();
    // The close control belongs to the modal box itself (not the viewport)
    expect(
      within(modal()).getByRole("button", { name: "Close" }),
    ).toBeInTheDocument();
    await user.click(within(modal()).getByRole("button", { name: "Close" }));
    expect(modal().open).toBe(false);
  });

  it("moves keyboard focus into the modal on open and names it by the heading", async () => {
    const user = userEvent.setup();
    renderFinder();
    await user.click(trigger());
    expect(modal().open).toBe(true);
    // Native showModal traps Tab inside; moving focus to the search field
    // puts keyboard users at the start of that trap.
    expect(document.activeElement).toBe(
      screen.getByRole("searchbox", { name: "Search for a place" }),
    );
    const labelledBy = modal().getAttribute("aria-labelledby");
    expect(labelledBy).not.toBeNull();
    expect(document.getElementById(labelledBy!)?.textContent).toBe(
      "Change location",
    );
  });

  it("queries Nominatim only on Enter inside the modal, never per keystroke", async () => {
    const user = userEvent.setup();
    renderFinder();
    await openModal(user);
    const field = screen.getByRole("searchbox", { name: "Search for a place" });
    await user.type(field, "Springfield");
    expect(mockFetch).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = new URL(String(mockFetch.mock.calls[0][0]));
    expect(url.host).toBe("nominatim.openstreetmap.org");
    expect(url.searchParams.get("q")).toBe("Springfield");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("addressdetails")).toBe("1");
  });

  it("stages a match on click without closing, and only picks on Apply and close", async () => {
    mockFetch.mockResolvedValue(jsonResponse(springfieldFixture));
    const user = userEvent.setup();
    const harness = renderFinder();
    await openModal(user);
    await user.type(
      screen.getByRole("searchbox", { name: "Search for a place" }),
      "Springfield",
    );
    await user.keyboard("{Enter}");
    const radios = within(modal()).getAllByRole("radio");
    expect(radios).toHaveLength(5);
    await user.click(
      within(modal()).getByRole("radio", {
        name: "Springfield, Hampden County, Massachusetts, United States",
      }),
    );
    // Selecting only stages: nothing picked yet and the modal stays open
    expect(harness.picked()).toBeNull();
    expect(modal().open).toBe(true);
    await user.click(
      within(modal()).getByRole("button", { name: "Apply and close" }),
    );
    const picked = harness.picked();
    expect(picked?.displayName).toBe(
      "Springfield, Hampden County, Massachusetts, United States",
    );
    expect(picked?.shortName).toBe("Springfield, Hampden County");
    expect(picked?.latitude).toBe(42.1018764);
    expect(picked?.longitude).toBe(-72.5886727);
    // The pick is confirmed - the modal closes behind it
    expect(modal().open).toBe(false);
  });

  it("Cancel discards the staged match, resets the field and keeps the place", async () => {
    mockFetch.mockResolvedValue(jsonResponse(springfieldFixture));
    const user = userEvent.setup();
    const harness = renderFinder();
    await openModal(user);
    await user.type(
      screen.getByRole("searchbox", { name: "Search for a place" }),
      "Springfield",
    );
    await user.keyboard("{Enter}");
    await user.click(
      within(modal()).getByRole("radio", {
        name: "Springfield, Hampden County, Massachusetts, United States",
      }),
    );
    await user.click(within(modal()).getByRole("button", { name: "Cancel" }));
    expect(harness.picked()).toBeNull();
    expect(modal().open).toBe(false);
    // Reopening starts clean: empty field, no stale matches
    await openModal(user);
    expect(
      screen.getByRole("searchbox", { name: "Search for a place" }),
    ).toHaveValue("");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("shows the no-match copy for an empty result", async () => {
    mockFetch.mockResolvedValue(jsonResponse([]));
    const user = userEvent.setup();
    renderFinder();
    await openModal(user);
    await user.type(
      screen.getByRole("searchbox", { name: "Search for a place" }),
      "zzz nowhere",
    );
    await user.keyboard("{Enter}");
    expect(
      screen.getByText("No match – try adding a country"),
    ).toBeInTheDocument();
  });

  it("shows the busy copy on a 429 with retry-after", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, 429).withRetryAfter(5));
    const user = userEvent.setup();
    renderFinder();
    await openModal(user);
    await user.type(
      screen.getByRole("searchbox", { name: "Search for a place" }),
      "Kiruna",
    );
    await user.keyboard("{Enter}");
    expect(
      screen.getByText("Search is busy – wait a second"),
    ).toBeInTheDocument();
  });

  it("shows a plain retryable copy on a network failure", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    renderFinder();
    await openModal(user);
    await user.type(
      screen.getByRole("searchbox", { name: "Search for a place" }),
      "Kiruna",
    );
    await user.keyboard("{Enter}");
    expect(screen.getByText("Search failed – try again")).toBeInTheDocument();
  });

  it("proposes the device fix with ±m and stores it only on Apply and close", async () => {
    stubGeolocation({ kind: "ok", latitude: 69.6492, longitude: 18.9553, accuracy: 12 });
    mockFetch.mockResolvedValue(jsonResponse(reverseTromsoFixture));
    const user = userEvent.setup();
    const harness = renderFinder();
    await openModal(user);
    await user.click(
      screen.getByRole("button", { name: "Find my location" }),
    );
    // The fix is proposed, not stored: no pick before the confirm tap
    expect(harness.picked()).toBeNull();
    expect(screen.getByText("±12m")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Use this location" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use this location" }));
    // Staging the fix still stores nothing and leaves the modal open
    expect(harness.picked()).toBeNull();
    expect(modal().open).toBe(true);
    await user.click(
      within(modal()).getByRole("button", { name: "Apply and close" }),
    );
    const picked = harness.picked();
    expect(picked?.displayName).toBe(
      "Storgata, Nerstranda, Sørbyen, Tromsø, Troms, 9008, Norge",
    );
    expect(picked?.shortName).toBe("Storgata, Nerstranda");
    // The stored place keeps the fix's own high-accuracy coordinates
    expect(picked?.latitude).toBe(69.6492);
    expect(picked?.longitude).toBe(18.9553);
    expect(modal().open).toBe(false);
  });

  it("warns when the fix accuracy is worse than 200 m", async () => {
    stubGeolocation({ kind: "ok", latitude: 69.6492, longitude: 18.9553, accuracy: 250 });
    mockFetch.mockResolvedValue(jsonResponse(reverseTromsoFixture));
    const user = userEvent.setup();
    renderFinder();
    await openModal(user);
    await user.click(screen.getByRole("button", { name: "Find my location" }));
    expect(screen.getByText("±250m")).toBeInTheDocument();
    expect(
      screen.getByText("Low accuracy – double-check the place name"),
    ).toBeInTheDocument();
  });

  it("falls back to My location when Nominatim cannot name the fix", async () => {
    stubGeolocation({ kind: "ok", latitude: 69.6492, longitude: 18.9553, accuracy: 15 });
    mockFetch.mockResolvedValue(jsonResponse({ error: "no result" }));
    const user = userEvent.setup();
    const harness = renderFinder();
    await openModal(user);
    await user.click(screen.getByRole("button", { name: "Find my location" }));
    expect(screen.getByText("My location")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use this location" }));
    expect(harness.picked()).toBeNull();
    await user.click(
      within(modal()).getByRole("button", { name: "Apply and close" }),
    );
    const picked = harness.picked();
    expect(picked?.displayName).toBe("My location");
    expect(picked?.shortName).toBe("My location");
    expect(picked?.latitude).toBe(69.6492);
  });

  it("shows the honest device location copy when geolocation is denied", async () => {
    stubGeolocation({ kind: "error", code: 1 });
    const user = userEvent.setup();
    renderFinder();
    await openModal(user);
    await user.click(screen.getByRole("button", { name: "Find my location" }));
    expect(
      screen.getByText(
        "Could not get your device location – type a place like 'Tromsø, Norway'",
      ),
    ).toBeInTheDocument();
  });

  it("shows the honest device location copy when geolocation is absent", async () => {
    restoreGeolocation();
    const user = userEvent.setup();
    renderFinder();
    await openModal(user);
    await user.click(screen.getByRole("button", { name: "Find my location" }));
    expect(
      screen.getByText(
        "Could not get your device location – type a place like 'Tromsø, Norway'",
      ),
    ).toBeInTheDocument();
  });

  it("always shows the OpenStreetMap attribution linked to osm.org", async () => {
    const user = userEvent.setup();
    renderFinder();
    await openModal(user);
    const link = screen.getByRole("link", {
      name: "© OpenStreetMap contributors",
    });
    expect(link).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/copyright",
    );
  });

  it("searches for Kiruna and hands the typed match to the page on Apply", async () => {
    mockFetch.mockResolvedValue(jsonResponse(kirunaFixture));
    const user = userEvent.setup();
    const harness = renderFinder();
    await openModal(user);
    await user.type(
      screen.getByRole("searchbox", { name: "Search for a place" }),
      "Kiruna",
    );
    await user.keyboard("{Enter}");
    await user.click(
      within(modal()).getByRole("radio", {
        name: "Kiruna, Kiruna kommun, Norrbottens län, 981 30, Sverige",
      }),
    );
    expect(harness.picked()).toBeNull();
    expect(modal().open).toBe(true);
    await user.click(
      within(modal()).getByRole("button", { name: "Apply and close" }),
    );
    const picked = harness.picked();
    expect(picked?.displayName).toBe(
      "Kiruna, Kiruna kommun, Norrbottens län, 981 30, Sverige",
    );
    expect(picked?.shortName).toBe("Kiruna, Kiruna kommun");
    expect(picked?.countryCode).toBe("se");
    expect(modal().open).toBe(false);
  });
});
