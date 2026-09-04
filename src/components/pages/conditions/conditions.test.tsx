// The page formats times in the device time zone, so the suite pins one
// (Sweden, UTC+2) to keep every asserted band and time deterministic.
process.env.TZ = "Europe/Stockholm";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LocalConditions from "./conditions";
import { PLACE_STORAGE_KEY } from "../../../data/place-storage";
import kirunaFixture from "../../../data/fixtures/nominatim-kiruna.json";
import springfieldFixture from "../../../data/fixtures/nominatim-springfield.json";
import reverseTromsoFixture from "../../../data/fixtures/nominatim-reverse-tromso.json";
import openMeteoKirunaFixture from "../../../data/fixtures/open-meteo-kiruna.json";
import {
  jsonResponse,
  restoreGeolocation,
  stubGeolocation,
} from "../../../test/nominatim-test-utils";

/** Query client for page tests: no retries so failures surface immediately. */
const testQueryClient = (): QueryClient =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

/** Renders the page inside the TanStack Query provider (weather fetches on mount). */
const renderPage = (): ReturnType<typeof render> =>
  render(
    <QueryClientProvider client={testQueryClient()}>
      <LocalConditions />
    </QueryClientProvider>,
  );

/** The header place button that opens the shared Change location modal. */
const placeTrigger = (): HTMLElement =>
  document.querySelector(".place-finder__trigger") as HTMLElement;

/** Opens the shared modal from the page header button. */
const openModal = async (
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> => {
  await user.click(placeTrigger());
};

/** The Open-Meteo host the weather query fetches from on mount. */
const OPEN_METEO_HOST = "api.open-meteo.com";

/**
 * Answers the weather fetch with the real Kiruna fixture and routes every
 * other request (Nominatim) to `respond`.
 */
const routeWeather = (
  fetchMock: ReturnType<typeof vi.fn>,
  respond: () => Response,
): void => {
  fetchMock.mockImplementation((input: unknown) => {
    const url = new URL(String(input));
    return Promise.resolve(
      url.host === OPEN_METEO_HOST
        ? jsonResponse(openMeteoKirunaFixture)
        : respond(),
    );
  });
};

const nominatimCalls = (
  fetchMock: ReturnType<typeof vi.fn>,
): Array<unknown[]> =>
  fetchMock.mock.calls.filter(
    ([input]) => new URL(String(input)).host === "nominatim.openstreetmap.org",
  );

const atNoon = (iso: string): void => {
  vi.useFakeTimers({ toFake: ["Date"] } as unknown as Parameters<
    typeof vi.useFakeTimers
  >[0]);
  vi.setSystemTime(new Date(iso));
};

const seedOslo = (): void => {
  localStorage.setItem(
    PLACE_STORAGE_KEY,
    JSON.stringify({
      v: 1,
      place: {
        displayName: "Oslo, Norway",
        shortName: "Oslo",
        latitude: 59.91,
        longitude: 10.75,
        fetchedAt: "2026-09-15T10:00:00.000Z",
      },
    }),
  );
};

const seedKiruna = (): void => {
  localStorage.setItem(
    PLACE_STORAGE_KEY,
    JSON.stringify({
      v: 1,
      place: {
        displayName: "Kiruna, Norrbotten County, Sweden",
        shortName: "Kiruna, Norrbotten County",
        latitude: 67.8558,
        longitude: 20.2253,
        fetchedAt: "2026-06-01T10:00:00.000Z",
      },
    }),
  );
};

/** The day-section names of the luminosity timeline, in order. */
const bandsInDay = (heading: string): HTMLElement[] => {
  const headingEl = screen.getByRole("heading", { name: heading });
  const section = headingEl.closest("section") as HTMLElement;
  return within(section).getAllByRole("listitem");
};

const bandNames = (heading = "Today's daylight chart"): string[] =>
  bandsInDay(heading)
    .map((li) => li.querySelector(".conditions__band-name")?.textContent ?? "")
    .filter(Boolean);

/** The flex-grow ratio (duration in minutes) of the named band. */
const bandGrow = (name: string, heading = "Today's daylight chart"): number => {
  const li = bandsInDay(heading).find(
    (item) => item.querySelector(".conditions__band-name")?.textContent === name,
  )!;
  return Number(li.style.flexGrow);
};

const bandTime = (
  name: string,
  heading = "Today's daylight chart",
): string | null =>
  bandsInDay(heading)
    .find(
      (item) =>
        item.querySelector(".conditions__band-name")?.textContent === name,
    )
    ?.querySelector(".conditions__band-time")?.textContent ?? null;

describe("Local conditions page (ticket 01)", () => {
  beforeEach(() => {
    localStorage.clear();
    // The page now fetches weather on mount; answer it deterministically so
    // the daylight-only assertions never touch the network.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(openMeteoKirunaFixture)),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders the page heading and the default Östersund place button", () => {
    atNoon("2026-09-01T12:00:00Z");
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "Local conditions" }),
    ).toBeInTheDocument();
    const button = placeTrigger();
    expect(button).toHaveTextContent("Östersund, Jämtland County");
    expect(button.getAttribute("title")).toBe(
      "Östersund, Jämtland County, Sweden",
    );
    expect(button.querySelector('img[title="Sweden"]')).toBeInTheDocument();
  });

  it("persists the Östersund default as the geocoded place on first open", () => {
    atNoon("2026-09-01T12:00:00Z");
    renderPage();
    const stored = JSON.parse(localStorage.getItem(PLACE_STORAGE_KEY)!);
    expect(stored.v).toBe(1);
    expect(stored.place.displayName).toBe("Östersund, Jämtland County, Sweden");
    expect(stored.place.shortName).toBe("Östersund, Jämtland County");
    expect(stored.place.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("renders the luminosity timeline as the full 24 h day split into day sections", () => {
    atNoon("2026-09-15T12:00:00Z");
    seedOslo();
    renderPage();
    // Band widths are duration ratios: they sum to one full day (1440 min)
    // and the Day band at Oslo in mid-September runs about 12 h 54 m.
    const total = bandsInDay("Today's daylight chart").reduce(
      (sum, li) => sum + Number(li.style.flexGrow),
      0,
    );
    expect(total).toBeCloseTo(1440, 6);
    expect(bandGrow("Day")).toBeGreaterThan(760);
    expect(bandGrow("Day")).toBeLessThan(790);
  });

  it("labels each band with its start time and the last one with 24:00", () => {
    atNoon("2026-09-15T12:00:00Z");
    seedOslo();
    renderPage();
    expect(bandTime("Night")).toMatch(/^\d{2}:\d{2}$/);
    expect(bandTime("Day")).toMatch(/^\d{2}:\d{2}$/);
    const last = bandsInDay("Today's daylight chart").at(-1)!;
    expect(last.querySelector(".conditions__band-time--end")?.textContent).toBe(
      "24:00",
    );
    expect(last.textContent).toContain("to 24:00");
  });

  it("renders one bright Day band at Kiruna in June (midnight sun)", () => {
    atNoon("2026-06-21T12:00:00Z");
    seedKiruna();
    renderPage();
    expect(
      screen.getAllByText("Sun does not set today").length,
    ).toBeGreaterThan(0);
    expect(bandNames()).toEqual(["Day"]);
    expect(bandGrow("Day")).toBe(1440);
  });

  it("renders the twilight chain without a Day band at Kiruna in December (polar night)", () => {
    atNoon("2026-12-21T12:00:00Z");
    seedKiruna();
    renderPage();
    expect(
      screen.getAllByText("Sun does not rise today").length,
    ).toBeGreaterThan(0);
    expect(bandNames()).toEqual([
      "Night",
      "Astronomical twilight",
      "Nautical twilight",
      "Civil twilight",
      "Nautical twilight",
      "Astronomical twilight",
      "Night",
    ]);
  });

  it("shows a stored place instead of the default", () => {
    atNoon("2026-09-01T12:00:00Z");
    seedOslo();
    renderPage();
    const button = placeTrigger();
    expect(button).toHaveTextContent("Oslo");
    expect(button.getAttribute("title")).toBe("Oslo, Norway");
    expect(button.querySelector('img[title="Norway"]')).toBeInTheDocument();
    expect(button.textContent).not.toContain(
      "Östersund, Jämtland County, Sweden",
    );
  });

  it("opens with the Night band at 00:00 and never wraps it past midnight at Östersund in early September", () => {
    // The sun dips below −18° only between 00:05 and 01:44 local: the Night
    // band belongs at the start of the day, and the day ends in
    // astronomical twilight – a past-midnight Night band would be a bug.
    atNoon("2026-09-01T20:00:00Z");
    renderPage();
    expect(bandNames()).toEqual([
      "Night",
      "Astronomical twilight",
      "Nautical twilight",
      "Civil twilight",
      "Day",
      "Civil twilight",
      "Nautical twilight",
      "Astronomical twilight",
    ]);
    expect(bandNames().filter((name) => name === "Night")).toHaveLength(1);
    expect(bandTime("Night")).toBe("00:00");
    const last = bandsInDay("Today's daylight chart").at(-1)!;
    expect(last.querySelector(".conditions__band-name")?.textContent).toBe(
      "Astronomical twilight",
    );
    expect(last.textContent).toContain("to 24:00");
    expect(last.querySelector(".conditions__band-time--end")?.textContent).toBe(
      "24:00",
    );
  });
});

describe("Local conditions search (shared modal, ticket 02)", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    restoreGeolocation();
  });

  it("queries Nominatim only on Enter, never per keystroke", async () => {
    routeWeather(mockFetch, () => jsonResponse(springfieldFixture));
    const user = userEvent.setup();
    renderPage();
    await openModal(user);
    const field = screen.getByRole("searchbox", {
      name: "Search for a place",
    });
    await user.type(field, "Springfield");
    expect(nominatimCalls(mockFetch)).toHaveLength(0);
    await user.keyboard("{Enter}");
    expect(nominatimCalls(mockFetch)).toHaveLength(1);
    const url = new URL(String(nominatimCalls(mockFetch)[0][0]));
    expect(url.searchParams.get("q")).toBe("Springfield");
  });

  it("shows up to five matches as a radio pick list on submit", async () => {
    mockFetch.mockResolvedValue(jsonResponse(springfieldFixture));
    const user = userEvent.setup();
    renderPage();
    await openModal(user);
    await user.type(
      screen.getByRole("searchbox", { name: "Search for a place" }),
      "Springfield",
    );
    await user.click(screen.getByRole("button", { name: "Search" }));
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(5);
    expect(
      screen.getByRole("radio", {
        name: "Springfield, Sangamon County, Illinois, United States",
      }),
    ).toBeInTheDocument();
  });

  it("moves focus with arrow keys without selecting, stages on Enter, stores on Apply", async () => {
    mockFetch.mockResolvedValue(jsonResponse(springfieldFixture));
    const user = userEvent.setup();
    renderPage();
    await openModal(user);
    await user.type(
      screen.getByRole("searchbox", { name: "Search for a place" }),
      "Springfield",
    );
    await user.click(screen.getByRole("button", { name: "Search" }));
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios).toHaveLength(5);
    radios[0].focus();
    expect(document.activeElement).toBe(radios[0]);
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(radios[1]);
    // No selection yet - still default
    const before = JSON.parse(localStorage.getItem(PLACE_STORAGE_KEY)!);
    expect(before.place.displayName).toBe(
      "Östersund, Jämtland County, Sweden",
    );
    await user.keyboard("{Enter}");
    // Enter only stages: still the default, modal still open
    const staged = JSON.parse(localStorage.getItem(PLACE_STORAGE_KEY)!);
    expect(staged.place.displayName).toBe(
      "Östersund, Jämtland County, Sweden",
    );
    expect(
      (document.querySelector("dialog.place-finder__modal") as HTMLDialogElement)
        .open,
    ).toBe(true);
    await user.click(screen.getByRole("button", { name: "Apply and close" }));
    const stored = JSON.parse(localStorage.getItem(PLACE_STORAGE_KEY)!);
    expect(stored.place.displayName).toBe(
      "Springfield, Hampden County, Massachusetts, United States",
    );
  });

  it("writes the picked match to the versioned store and updates the daylight", async () => {
    atNoon("2026-06-21T12:00:00Z");
    mockFetch.mockResolvedValue(jsonResponse(kirunaFixture));
    const user = userEvent.setup();
    renderPage();
    await openModal(user);
    await user.type(
      screen.getByRole("searchbox", { name: "Search for a place" }),
      "Kiruna",
    );
    await user.click(screen.getByRole("button", { name: "Search" }));
    await user.click(
      screen.getByRole("radio", {
        name: "Kiruna, Kiruna kommun, Norrbottens län, 981 30, Sverige",
      }),
    );
    // Clicking only stages: the store still holds the default
    const pending = JSON.parse(localStorage.getItem(PLACE_STORAGE_KEY)!);
    expect(pending.place.displayName).toBe(
      "Östersund, Jämtland County, Sweden",
    );
    await user.click(screen.getByRole("button", { name: "Apply and close" }));
    const stored = JSON.parse(localStorage.getItem(PLACE_STORAGE_KEY)!);
    expect(stored.v).toBe(1);
    expect(stored.place.displayName).toBe(
      "Kiruna, Kiruna kommun, Norrbottens län, 981 30, Sverige",
    );
    expect(stored.place.shortName).toBe("Kiruna, Kiruna kommun");
    expect(stored.place.latitude).toBe(67.8496111);
    expect(stored.place.longitude).toBe(20.30625);
    expect(stored.place.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // The daylight recomputes for the picked place: midnight sun in June.
    expect(
      screen.getAllByText("Sun does not set today").length,
    ).toBeGreaterThan(0);
    expect(bandNames()).toEqual(["Day"]);
    // The pick is confirmed - the modal closes behind it
    expect(
      (document.querySelector("dialog.place-finder__modal") as HTMLDialogElement)
        .open,
    ).toBe(false);
  });

  it("shows the no-match copy for an empty result", async () => {
    mockFetch.mockResolvedValue(jsonResponse([]));
    const user = userEvent.setup();
    renderPage();
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

  it("shows the busy copy on 429", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({}, 429).withRetryAfter(5),
    );
    const user = userEvent.setup();
    renderPage();
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
    renderPage();
    await openModal(user);
    await user.type(
      screen.getByRole("searchbox", { name: "Search for a place" }),
      "Kiruna",
    );
    await user.keyboard("{Enter}");
    expect(screen.getByText("Search failed – try again")).toBeInTheDocument();
  });

  it("always shows the OpenStreetMap attribution linked to osm.org under the field", async () => {
    const user = userEvent.setup();
    renderPage();
    await openModal(user);
    const link = screen.getByRole("link", {
      name: "© OpenStreetMap contributors",
    });
    expect(link).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/copyright",
    );
  });

  it("shows the honest device location copy on geolocation denial", async () => {
    stubGeolocation({ kind: "error", code: 1 });
    const user = userEvent.setup();
    renderPage();
    await openModal(user);
    await user.click(screen.getByRole("button", { name: "Find my location" }));
    expect(
      screen.getByText(
        "Could not get your device location – type a place like 'Tromsø, Norway'",
      ),
    ).toBeInTheDocument();
  });

  it("proposes the device fix with ±m and writes the geocoded place only on confirm", async () => {
    stubGeolocation({ kind: "ok", latitude: 69.6492, longitude: 18.9553, accuracy: 12 });
    mockFetch.mockResolvedValue(jsonResponse(reverseTromsoFixture));
    const user = userEvent.setup();
    renderPage();
    await openModal(user);
    await user.click(screen.getByRole("button", { name: "Find my location" }));
    // The fix is proposed, not stored: the place is still the default
    const proposed = JSON.parse(localStorage.getItem(PLACE_STORAGE_KEY)!);
    expect(proposed.place.displayName).toBe(
      "Östersund, Jämtland County, Sweden",
    );
    expect(screen.getByText("±12m")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use this location" }));
    // Staging the fix stores nothing yet
    const staged = JSON.parse(localStorage.getItem(PLACE_STORAGE_KEY)!);
    expect(staged.place.displayName).toBe(
      "Östersund, Jämtland County, Sweden",
    );
    await user.click(screen.getByRole("button", { name: "Apply and close" }));
    const stored = JSON.parse(localStorage.getItem(PLACE_STORAGE_KEY)!);
    expect(stored.place.displayName).toBe(
      "Storgata, Nerstranda, Sørbyen, Tromsø, Troms, 9008, Norge",
    );
    expect(stored.place.shortName).toBe("Storgata, Nerstranda");
    // The stored place keeps the fix's own high-accuracy coordinates; the
    // reverse response only supplies the display name for verification.
    expect(stored.place.latitude).toBe(69.6492);
    expect(stored.place.longitude).toBe(18.9553);
    const button = placeTrigger();
    expect(button).toHaveTextContent("Storgata, Nerstranda");
    expect(button.getAttribute("title")).toBe(
      "Storgata, Nerstranda, Sørbyen, Tromsø, Troms, 9008, Norge",
    );
    expect(button.querySelector('img[title="Norge"]')).toBeInTheDocument();
  });
});

describe("Local conditions weather (ticket 03)", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    restoreGeolocation();
  });

  it("renders the current conditions from a real Open-Meteo Kiruna response", async () => {
    atNoon("2026-09-01T12:00:00Z");
    seedKiruna();
    mockFetch.mockResolvedValue(jsonResponse(openMeteoKirunaFixture));
    renderPage();
    expect((await screen.findAllByText("11°C")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Moderate rain").length).toBeGreaterThan(0);
    // Humidity and cloud are now icons with sr-only labels, low/mid/high on separate lines
    const current = document.querySelector(".weather-current") as HTMLElement;
    expect(current).toBeInTheDocument();
    expect(current.textContent).toContain("97%");
    expect(within(current).getByText("low: 100%")).toBeInTheDocument();
    expect(within(current).getByText("mid: 22%")).toBeInTheDocument();
    expect(within(current).getByText("high: 17%")).toBeInTheDocument();
    expect(current.querySelector(".sr-only")?.textContent).toBeDefined();
    expect(current.querySelector(".weather-icon[title=\"Moderate rain\"]")).toBeInTheDocument();
    expect(
      current.querySelector(".weather-current__main .sr-only")?.textContent,
    ).toBe("Moderate rain");
    expect(
      screen.getByRole("link", { name: "Open-Meteo" }),
    ).toHaveAttribute("href", "https://open-meteo.com/");
    expect(
      screen.getByText(
        (_, el) =>
          el?.classList.contains("weather-block__fetched") === true &&
          (el?.textContent ?? "").includes(
            "Updated at 14:00, near Kiruna, Norrbotten County",
          ),
      ),
    ).toBeInTheDocument();
  });

  it("renders the 24 hour hourly strip as a scrollable list labelled by time", async () => {
    atNoon("2026-09-01T12:00:00Z");
    seedKiruna();
    mockFetch.mockResolvedValue(jsonResponse(openMeteoKirunaFixture));
    renderPage();
    const strip = await screen.findByRole("list", {
      name: "24-hour hourly strip",
    });
    const hours = within(strip).getAllByRole("listitem");
    expect(hours).toHaveLength(24);
    expect(within(hours[0]).getByText("00:00")).toBeInTheDocument();
    expect(within(hours[0]).getByText("11°C")).toBeInTheDocument();
    expect(within(hours[0]).getAllByText("Overcast").length).toBeGreaterThan(0);
    expect(within(hours[0]).getByText("98%")).toBeInTheDocument();
    // low/mid/high split is shown in current only; hourly shows total cloud only
    expect(
      hours[0].querySelector(".weather-icon[title=\"Overcast\"]"),
    ).toBeInTheDocument();
    expect(within(hours[23]).getByText("23:00")).toBeInTheDocument();
  });

  it("renders the 3 day daily row as a table with a caption and sun times", async () => {
    atNoon("2026-09-01T12:00:00Z");
    seedKiruna();
    mockFetch.mockResolvedValue(jsonResponse(openMeteoKirunaFixture));
    renderPage();
    const table = await screen.findByRole("table");
    expect(table.querySelector("caption")?.textContent).toMatch(
      /3-day weather forecast/,
    );
    expect(table.querySelector("caption")?.getAttribute("title")).toBe(
      "Kiruna, Norrbotten County, Sweden",
    );
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(within(table).getByText("2026-09-01")).toBeInTheDocument();
    expect(within(table).getAllByText("Heavy rain").length).toBeGreaterThan(0);
    expect(within(table).getByText("13°C")).toBeInTheDocument();
    expect(within(table).getByText("9°C")).toBeInTheDocument();
    expect(within(table).getByText("05:06")).toBeInTheDocument();
    expect(within(table).getByText("20:11")).toBeInTheDocument();
  });

  it("reissues the same fetch for the same place on Refresh and updates the timestamp", async () => {
    atNoon("2026-09-01T12:00:00Z");
    seedKiruna();
    mockFetch.mockResolvedValue(jsonResponse(openMeteoKirunaFixture));
    const user = userEvent.setup();
    renderPage();
    expect(
      await screen.findByText(
        (_, el) =>
          el?.classList.contains("weather-block__fetched") === true &&
          (el?.textContent ?? "").includes(
            "Updated at 14:00, near Kiruna, Norrbotten County",
          ),
      ),
    ).toBeInTheDocument();
    vi.setSystemTime(new Date("2026-09-01T12:05:00Z"));
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    expect(
      await screen.findByText(
        (_, el) =>
          el?.classList.contains("weather-block__fetched") === true &&
          (el?.textContent ?? "").includes(
            "Updated at 14:05, near Kiruna, Norrbotten County",
          ),
      ),
    ).toBeInTheDocument();
    const weatherCalls = mockFetch.mock.calls.filter(
      ([input]) => new URL(String(input)).host === OPEN_METEO_HOST,
    );
    expect(weatherCalls).toHaveLength(2);
  });

  it("keeps the Refresh button enabled while the timestamp shows the last fetch", async () => {
    atNoon("2026-09-01T12:00:00Z");
    seedKiruna();
    mockFetch.mockResolvedValue(jsonResponse(openMeteoKirunaFixture));
    const user = userEvent.setup();
    renderPage();
    expect(
      await screen.findByText(
        (_, el) =>
          el?.classList.contains("weather-block__fetched") === true &&
          (el?.textContent ?? "").includes(
            "Updated at 14:00, near Kiruna, Norrbotten County",
          ),
      ),
    ).toBeInTheDocument();
    const refresh = screen.getByRole("button", { name: "Refresh" });
    expect(refresh).toBeEnabled();
    await user.click(refresh);
    expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled();
  });

  it("shows a busy state while the weather loads", async () => {
    atNoon("2026-09-01T12:00:00Z");
    seedKiruna();
    let resolveFetch!: (value: Response) => void;
    mockFetch.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    renderPage();
    expect(
      screen.getByText("Loading weather…"),
    ).toBeInTheDocument();
    resolveFetch(jsonResponse(openMeteoKirunaFixture));
    expect(
      await screen.findByText(
        (_, el) =>
          el?.classList.contains("weather-block__fetched") === true &&
          (el?.textContent ?? "").includes(
            "Updated at 14:00, near Kiruna, Norrbotten County",
          ),
      ),
    ).toBeInTheDocument();
  });

  it("keeps the place and daylight visible and swaps only the weather block on failure", async () => {
    atNoon("2026-09-01T12:00:00Z");
    seedOslo();
    mockFetch.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    renderPage();
    expect(
      await screen.findByText("Couldn't load the weather – check back later."),
    ).toBeInTheDocument();
    {
      const button = placeTrigger();
      expect(button).toHaveTextContent("Oslo");
      expect(button.querySelector('img[title="Norway"]')).toBeInTheDocument();
    }
    expect(
      screen.getByRole("heading", { name: "Today's daylight chart" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
    const refresh = screen.getByRole("button", { name: "Refresh" });
    expect(refresh).toBeEnabled();
    mockFetch.mockResolvedValue(jsonResponse(openMeteoKirunaFixture));
    await user.click(refresh);
    expect(
      await screen.findByText(
        (_, el) =>
          el?.classList.contains("weather-block__fetched") === true &&
          (el?.textContent ?? "").includes("Updated at 14:00, near Oslo"),
      ),
    ).toBeInTheDocument();
  });
});

describe("Local conditions full composition (ticket 04)", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    restoreGeolocation();
  });

  it("renders Today's and Tomorrow's daylight charts together and each sums to 24h", () => {
    atNoon("2026-09-15T12:00:00Z");
    seedOslo();
    mockFetch.mockResolvedValue(jsonResponse(openMeteoKirunaFixture));
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Today's daylight chart" }),
    ).toBeInTheDocument();
    // Tomorrow's chart removed per user request – only Today remains
    expect(
      screen.queryByRole("heading", { name: "Tomorrow's daylight chart" }),
    ).not.toBeInTheDocument();
    const todayTotal = bandsInDay("Today's daylight chart").reduce(
      (sum, li) => sum + Number(li.style.flexGrow),
      0,
    );
    expect(todayTotal).toBeCloseTo(1440, 6);
  });

  it("keeps the dark window for tomorrow visible even when today still has a long Day", () => {
    atNoon("2026-09-15T12:00:00Z");
    seedOslo();
    mockFetch.mockResolvedValue(jsonResponse(openMeteoKirunaFixture));
    renderPage();
    // Tomorrow removed – verify Today still shows its dark window
    expect(
      screen.queryByRole("heading", { name: "Tomorrow's daylight chart" }),
    ).not.toBeInTheDocument();
    const todayBands = bandNames("Today's daylight chart");
    expect(todayBands).toContain("Night");
    expect(todayBands.join(" ")).toContain("Astronomical twilight");
  });

  it("shows polar copy for both days at midnight sun (June at 69 N)", () => {
    atNoon("2026-06-21T12:00:00Z");
    seedKiruna();
    mockFetch.mockResolvedValue(jsonResponse(openMeteoKirunaFixture));
    renderPage();
    // Only Today rendered now
    expect(screen.getAllByText("Sun does not set today")).toHaveLength(1);
    expect(bandNames("Today's daylight chart")).toEqual(["Day"]);
  });

  it("shows polar copy for both days at polar night (December at 69 N)", () => {
    atNoon("2026-12-21T12:00:00Z");
    seedKiruna();
    mockFetch.mockResolvedValue(jsonResponse(openMeteoKirunaFixture));
    renderPage();
    expect(screen.getAllByText("Sun does not rise today")).toHaveLength(1);
    expect(bandNames("Today's daylight chart")).toEqual([
      "Night",
      "Astronomical twilight",
      "Nautical twilight",
      "Civil twilight",
      "Nautical twilight",
      "Astronomical twilight",
      "Night",
    ]);
  });

  it("renders two external links baked with the current lat and lon, zoom/centre, B0 and pin, opening in a new tab", async () => {
    atNoon("2026-09-01T12:00:00Z");
    seedOslo();
    mockFetch.mockResolvedValue(jsonResponse(openMeteoKirunaFixture));
    renderPage();
    await screen.findByRole("heading", { name: "Weather" });
    const pollution = screen.getByRole("link", {
      name: "See light pollution at this spot on lightpollutionmap.info",
    });
    expect(pollution).toHaveAttribute(
      "href",
      "https://www.lightpollutionmap.info/#zoom=15&lat=59.91&lon=10.75&layers=B0FFFFFFTFFFFFFFFFF",
    );
    expect(pollution).toHaveAttribute("target", "_blank");
    expect(pollution).toHaveAttribute("rel", "noopener noreferrer");
    const cloud = screen.getByRole("link", {
      name: "See live cloud cover on weather-radar-live.com",
    });
    expect(cloud).toHaveAttribute(
      "href",
      "https://www.weather-radar-live.com/cloud-cover-map/#zoom=8&lat=59.91&lon=10.75",
    );
    expect(cloud).toHaveAttribute("target", "_blank");
    expect(cloud).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("updates both daylight and external links when the geocoded place is picked", async () => {
    atNoon("2026-06-21T12:00:00Z");
    // start from the default (Östersund) then pick Kiruna
    mockFetch.mockResolvedValue(jsonResponse(kirunaFixture));
    const user = userEvent.setup();
    renderPage();
    await openModal(user);
    await user.type(
      screen.getByRole("searchbox", { name: "Search for a place" }),
      "Kiruna",
    );
    await user.click(screen.getByRole("button", { name: "Search" }));
    await user.click(
      screen.getByRole("radio", {
        name: "Kiruna, Kiruna kommun, Norrbottens län, 981 30, Sverige",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Apply and close" }));
    // Daylight recomputes: midnight sun for the new place (only Today now)
    expect(screen.getAllByText("Sun does not set today")).toHaveLength(1);
    // Links re-bake with the new lat/lon
    const pollution = screen.getByRole("link", {
      name: "See light pollution at this spot on lightpollutionmap.info",
    });
    expect(pollution.getAttribute("href")).toContain("67.8496111");
    expect(pollution.getAttribute("href")).toContain("20.30625");
    const cloud = screen.getByRole("link", {
      name: "See live cloud cover on weather-radar-live.com",
    });
    expect(cloud.getAttribute("href")).toContain("67.8496111");
  });

  it("keeps the 24 hour strip horizontally scrollable and the 3-day row at three cards alongside the new composition", async () => {
    atNoon("2026-09-01T12:00:00Z");
    seedKiruna();
    mockFetch.mockResolvedValue(jsonResponse(openMeteoKirunaFixture));
    renderPage();
    const strip = await screen.findByRole("list", { name: "24-hour hourly strip" });
    expect(within(strip).getAllByRole("listitem")).toHaveLength(24);
    const table = await screen.findByRole("table");
    expect(table.querySelector("caption")?.textContent).toMatch(
      /3-day weather forecast/,
    );
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled();
    expect(
      await screen.findByText(
        (_, el) =>
          el?.classList.contains("weather-block__fetched") === true &&
          (el?.textContent ?? "").includes(
            "Updated at 14:00, near Kiruna, Norrbotten County",
          ),
      ),
    ).toBeInTheDocument();
  });

  it("does not render any map widget or Bortle number", () => {
    atNoon("2026-09-01T12:00:00Z");
    mockFetch.mockResolvedValue(jsonResponse(openMeteoKirunaFixture));
    renderPage();
    expect(screen.queryByText(/Bortle/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/SQM/i)).not.toBeInTheDocument();
    expect(document.querySelector("iframe")).toBeNull();
    expect(document.querySelector("canvas")).toBeNull();
  });
});
