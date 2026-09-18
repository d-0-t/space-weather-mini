// The strip's As-of line renders in the device time zone in Local mode, so
// the suite pins one (Sweden, UTC+2) to keep every expectation deterministic.
process.env.TZ = "Europe/Stockholm";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import scalesFixture from "../../../../../products/fixtures/noaa-scales.json?raw";
import { ALERTS_URL } from "../../../../../products/alerts";
import Alerts from "./Alerts";
import { AlertsProvider } from "./AlertsContext";
import { DisplayTimezoneProvider } from "../../../../DisplayTimezone/DisplayTimezoneContext";
import { saveDisplayTimezone } from "../../../../../products/display-timezone";

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const nowIso = (offsetHours: number) =>
  new Date(Date.now() + offsetHours * 3600 * 1000)
    .toISOString()
    .slice(0, 19);

/** Crafted feed with known times and matches: 15:00 K6 warning, 14:00 G2 watch,
 * 13:00 K5 warning, 12:00 K5 alert match; 10:00 K4 warning and 11:00 X-ray
 * summary do not. Literals taken from the live SWPC feed shapes. */
const alertsCraftFeed = JSON.stringify([
  {
    product_id: "K04W",
    issue_datetime: "2026-08-28 10:00:00.000",
    message:
      "Space Weather Message Code: WARK04\r\nSerial Number: 1\r\nIssue Time: 2026 Aug 28 1000 UTC\r\n\r\nWARNING: Geomagnetic K-index of 4 expected \r\nComment: \r\n",
  },
  {
    product_id: "A30F",
    issue_datetime: "2026-08-28 14:00:00.000",
    message:
      "Space Weather Message Code: WATA30\r\nSerial Number: 280\r\nIssue Time: 2026 Aug 28 1400 UTC\r\n\r\nWATCH: Geomagnetic Storm Category G2 Predicted \r\nHighest Storm Level Predicted by Day:\r\nAug 29: G2 (Moderate)\r\nComment: CMEs.\r\n",
  },
  {
    product_id: "K05W",
    issue_datetime: "2026-08-28 13:00:00.000",
    message:
      "Space Weather Message Code: WARK05\r\nSerial Number: 2\r\nIssue Time: 2026 Aug 28 1300 UTC\r\n\r\nWARNING: Geomagnetic K-index of 5 expected \r\nNoaa Scale: G1 - Minor\r\nComment: \r\n",
  },
  {
    product_id: "K05A",
    issue_datetime: "2026-08-28 12:00:00.000",
    message:
      "Space Weather Message Code: ALTK05\r\nSerial Number: 3\r\nIssue Time: 2026 Aug 28 1200 UTC\r\n\r\nALERT: Geomagnetic K-index of 5 \r\nComment: \r\n",
  },
  {
    product_id: "XM5S",
    issue_datetime: "2026-08-28 11:00:00.000",
    message:
      "Space Weather Message Code: SUMXM5\r\nSerial Number: 4\r\nIssue Time: 2026 Aug 28 1100 UTC\r\n\r\nSUMMARY: X-ray Event exceeded M5 \r\nComment: \r\n",
  },
  {
    product_id: "K06W",
    issue_datetime: "2026-08-28 15:00:00.000",
    message:
      "Space Weather Message Code: WARK06\r\nSerial Number: 5\r\nIssue Time: 2026 Aug 28 1500 UTC\r\n\r\nWARNING: Geomagnetic K-index of 6 expected \r\nNoaa Scale: G2 - Moderate\r\nComment: \r\n",
  },
]);

const forecastCraftFeed = JSON.stringify([
  { time_tag: nowIso(-6), kp: 3, observed: "observed", noaa_scale: null },
  { time_tag: nowIso(6), kp: 6, observed: "predicted", noaa_scale: null },
  { time_tag: nowIso(30), kp: 7, observed: "predicted", noaa_scale: null },
]);

/** Forecast feed with predicted points at +hours offsets, for the
 * edge-trigger tests (each call re-bases the slots on the current time). */
const forecastPoints = (shifts: Array<[number, number]>) =>
  JSON.stringify(
    shifts.map(([hours, kp]) => ({
      time_tag: new Date(Date.now() + hours * 3600 * 1000)
        .toISOString()
        .slice(0, 19),
      kp,
      observed: "predicted",
      noaa_scale: null,
    })),
  );

class MockNotification {
  static permission: NotificationPermission = "default";
  static requestPermission = vi.fn(async () => "granted" as NotificationPermission);
  static instances: Array<{ title: string; options?: NotificationOptions }> = [];
  title: string;
  options?: NotificationOptions;

  constructor(title: string, options?: NotificationOptions) {
    this.title = title;
    this.options = options;
    MockNotification.instances.push({ title, options });
  }
}

const mockFetch = vi.fn();

beforeEach(() => {
  localStorage.clear();
  MockNotification.permission = "default";
  MockNotification.instances = [];
  MockNotification.requestPermission.mockReset();
  MockNotification.requestPermission.mockResolvedValue("granted");
  mockFetch.mockReset();
  mockFetch.mockImplementation((url: string) => {
    const u = typeof url === "string" ? url : "";
    if (u.includes("alerts.json")) {
      return Promise.resolve({ ok: true, text: async () => alertsCraftFeed });
    }
    if (u.includes("noaa-scales.json")) {
      return Promise.resolve({ ok: true, text: async () => scalesFixture });
    }
    if (u.includes("noaa-planetary-k-index-forecast.json")) {
      return Promise.resolve({ ok: true, text: async () => "" });
    }
    return Promise.resolve({ ok: true, text: async () => "" });
  });
  vi.stubGlobal("fetch", mockFetch);
  vi.stubGlobal("Notification", MockNotification);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const renderAlerts = (client = queryClient()) =>
  render(
    <QueryClientProvider client={client}>
      <DisplayTimezoneProvider>
        <AlertsProvider>
          <Alerts />
        </AlertsProvider>
      </DisplayTimezoneProvider>
    </QueryClientProvider>,
  );

describe("Alerts (ticket 02)", () => {
  it("keeps polling and notifying while the strip is unmounted (panel closed)", async () => {
    MockNotification.permission = "granted";
    const client = queryClient();
    render(
      <QueryClientProvider client={client}>
        <AlertsProvider>
          <div />
        </AlertsProvider>
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect(MockNotification.instances.length).toBeGreaterThan(0),
    );
    expect(MockNotification.instances[0].title).toBe(
      "Geomagnetic K-index of 6 expected",
    );
    const query = client.getQueryCache().find({ queryKey: ["alerts", "live"] });
    expect(query?.observers[0]?.options.refetchInterval).toBe(5 * 60 * 1000);
  });

  it("renders the threshold slider defaulting to Kp 5 (G1)", async () => {
    renderAlerts();
    const slider = screen.getByRole("slider", { name: /Kp alert threshold/i });
    expect(slider).toHaveValue("5");
    expect(slider).toHaveAttribute("aria-valuetext", "Kp 5 (G1)");
  });

  it("persists a slider change as the versioned threshold and updates the label", async () => {
    const user = userEvent.setup();
    renderAlerts();
    const slider = screen.getByRole("slider", { name: /Kp alert threshold/i });
    fireEvent.change(slider, { target: { value: "7" } });
    expect(localStorage.getItem("sw:thresholds:v1")).toBe(
      JSON.stringify({ kp: 7, v: 1 }),
    );
    expect(slider).toHaveAttribute("aria-valuetext", "Kp 7 (G3)");
  });

  it("hydrates the slider from a stored threshold", async () => {
    localStorage.setItem("sw:thresholds:v1", JSON.stringify({ kp: 8, v: 1 }));
    renderAlerts();
    expect(
      screen.getByRole("slider", { name: /Kp alert threshold/i }),
    ).toHaveValue("8");
  });

  it("shows the single newest matching alert with a Kp-colored dot", async () => {
    const { container } = renderAlerts();
    await waitFor(() =>
      expect(
        screen.getByText(/WARNING: Geomagnetic K-index of 6 expected/),
      ).toBeInTheDocument(),
    );
    const dot = container.querySelector(".alerts__strip__color");
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass("kp67");
    expect(container.querySelectorAll(".alerts__strip")).toHaveLength(1);
    // Local mode (the default): 15:00 UTC is 17:00 in Sweden, same day –
    // bare device clock, no zone suffix.
    expect(
      screen.getByText(/As of 17:00. Updated/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Category G2 Predicted/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Geomagnetic K-index of 5 expected/),
    ).not.toBeInTheDocument();
  });

  it("shows the strip's As-of line with the ' UTC' suffix in UTC mode", async () => {
    saveDisplayTimezone(localStorage, "utc");
    renderAlerts();
    await waitFor(() =>
      expect(
        screen.getByText(/WARNING: Geomagnetic K-index of 6 expected/),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/As of Aug 28 15:00 UTC. Updated/),
    ).toBeInTheDocument();
  });

  it("shows the honest empty state when no alerts match", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("alerts.json")) {
        return Promise.resolve({ ok: true, text: async () => "[]" });
      }
      if (typeof url === "string" && url.includes("noaa-scales.json")) {
        return Promise.resolve({ ok: true, text: async () => scalesFixture });
      }
      return Promise.resolve({ ok: true, text: async () => "" });
    });
    renderAlerts();
    await waitFor(() =>
      expect(screen.getByText(/No alerts at Kp 5 or higher/)).toBeInTheDocument(),
    );
    expect(document.querySelector(".alerts__strip")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Notifications can appear while this tab is open/),
    ).toBeInTheDocument();
  });

  it("lists a next-24h Kp forecast breach as a match", async () => {
    mockFetch.mockImplementation((url: string) => {
      const u = typeof url === "string" ? url : "";
      if (u.includes("alerts.json"))
        return Promise.resolve({ ok: true, text: async () => alertsCraftFeed });
      if (u.includes("noaa-scales.json"))
        return Promise.resolve({ ok: true, text: async () => scalesFixture });
      if (u.includes("noaa-planetary-k-index-forecast.json"))
        return Promise.resolve({ ok: true, text: async () => forecastCraftFeed });
      return Promise.resolve({ ok: true, text: async () => "" });
    });
    renderAlerts();
    await waitFor(() =>
      expect(screen.getByText(/Kp 6 predicted within 24h/)).toBeInTheDocument(),
    );
  });

  it("polls the alerts feed every 5 minutes with background refresh", async () => {
    const client = queryClient();
    renderAlerts(client);
    await waitFor(() =>
      expect(document.querySelector(".alerts__strip")).toBeInTheDocument(),
    );
    const query = client.getQueryCache().find({ queryKey: ["alerts", "live"] });
    const options = query?.observers[0]?.options;
    expect(options?.refetchInterval).toBe(5 * 60 * 1000);
    expect(options?.refetchIntervalInBackground).toBe(true);
  });

  it("asks for permission on tap and notifies for unseen matches", async () => {
    const user = userEvent.setup();
    renderAlerts();
    const enable = await screen.findByRole("button", {
      name: "Enable browser alerts",
    });
    expect(MockNotification.instances).toHaveLength(0);
    await user.click(enable);
    expect(MockNotification.requestPermission).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(MockNotification.instances.length).toBeGreaterThan(0),
    );
    const titles = MockNotification.instances.map((n) => n.title);
    expect(titles).toContain("Geomagnetic K-index of 6 expected");
    expect(
      screen.getByText("Browser alerts enabled."),
    ).toBeInTheDocument();
    expect(screen.getByText("Browser alerts enabled.")).toHaveFocus();
  });

  it("notifies a live match via the Notification API when no worker is registered (dev servers register none)", async () => {
    MockNotification.permission = "granted";
    // Dev servers register no worker: .ready pends forever, so the code
    // must resolve through getRegistration instead of waiting on .ready.
    Object.defineProperty(window.navigator, "serviceWorker", {
      value: {
        getRegistration: vi.fn(async () => undefined),
        ready: new Promise(() => {}),
      },
      configurable: true,
    });
    try {
      renderAlerts();
      await waitFor(() =>
        expect(
          MockNotification.instances.map((n) => n.title),
        ).toContain("Geomagnetic K-index of 6 expected"),
      );
    } finally {
      Reflect.deleteProperty(window.navigator, "serviceWorker");
    }
  });

  it("prefers the service worker when one is registered (preview/PWA)", async () => {
    MockNotification.permission = "granted";
    const showNotification = vi.fn();
    Object.defineProperty(window.navigator, "serviceWorker", {
      value: { getRegistration: async () => ({ showNotification }) },
      configurable: true,
    });
    try {
      renderAlerts();
      await waitFor(() =>
        expect(showNotification).toHaveBeenCalledWith(
          "Geomagnetic K-index of 6 expected",
          { body: expect.stringContaining("WARNING") },
        ),
      );
      expect(MockNotification.instances).toHaveLength(0);
    } finally {
      Reflect.deleteProperty(window.navigator, "serviceWorker");
    }
  });

  it("pings a new 24h forecast breach once, then stays silent on same-Kp refreshes", async () => {
    const serveForecast = (body: string) =>
      mockFetch.mockImplementation((url: string) => {
        const u = typeof url === "string" ? url : "";
        if (u.includes("alerts.json"))
          return Promise.resolve({ ok: true, text: async () => "[]" });
        if (u.includes("noaa-scales.json"))
          return Promise.resolve({ ok: true, text: async () => scalesFixture });
        if (u.includes("noaa-planetary-k-index-forecast.json"))
          return Promise.resolve({ ok: true, text: async () => body });
        return Promise.resolve({ ok: true, text: async () => "" });
      });
    MockNotification.permission = "granted";
    const client = queryClient();
    serveForecast(forecastPoints([[6, 6]]));
    renderAlerts(client);
    await waitFor(() =>
      expect(
        MockNotification.instances.map((n) => n.title),
      ).toContain("Kp 6 predicted within 24h"),
    );
    // Same Kp in a slid window (a new dedup key): the strip moves on, but no
    // second ping fires.
    serveForecast(forecastPoints([[7, 6]]));
    await client.refetchQueries({
      queryKey: ["planetary-k-index-forecast", "live"],
    });
    await act(async () => {});
    expect(MockNotification.instances).toHaveLength(1);
  });

  it("pings again when the forecast Kp rises", async () => {
    const serveForecast = (body: string) =>
      mockFetch.mockImplementation((url: string) => {
        const u = typeof url === "string" ? url : "";
        if (u.includes("alerts.json"))
          return Promise.resolve({ ok: true, text: async () => "[]" });
        if (u.includes("noaa-scales.json"))
          return Promise.resolve({ ok: true, text: async () => scalesFixture });
        if (u.includes("noaa-planetary-k-index-forecast.json"))
          return Promise.resolve({ ok: true, text: async () => body });
        return Promise.resolve({ ok: true, text: async () => "" });
      });
    MockNotification.permission = "granted";
    const client = queryClient();
    serveForecast(forecastPoints([[6, 6]]));
    renderAlerts(client);
    await waitFor(() =>
      expect(
        MockNotification.instances.map((n) => n.title),
      ).toContain("Kp 6 predicted within 24h"),
    );
    serveForecast(
      forecastPoints([
        [6, 6],
        [7, 7],
      ]),
    );
    await client.refetchQueries({
      queryKey: ["planetary-k-index-forecast", "live"],
    });
    await waitFor(() =>
      expect(
        MockNotification.instances.map((n) => n.title),
      ).toContain("Kp 7 predicted within 24h"),
    );
    expect(MockNotification.instances).toHaveLength(2);
  });

  it("does not re-notify for matches already seen", async () => {
    localStorage.setItem(
      "sw:alerts:seen:v1",
      JSON.stringify([
        "K06W|2026-08-28 15:00:00.000",
        "A30F|2026-08-28 14:00:00.000",
        "K05W|2026-08-28 13:00:00.000",
      ]),
    );
    MockNotification.permission = "granted";
    renderAlerts();
    await waitFor(() =>
      expect(document.querySelector(".alerts__strip")).toBeInTheDocument(),
    );
    expect(MockNotification.instances).toHaveLength(0);
  });

  it("offers Try again with a warning after denial, picking up a re-allowed permission", async () => {
    MockNotification.requestPermission.mockResolvedValueOnce("denied");
    const user = userEvent.setup();
    renderAlerts();
    await user.click(
      await screen.findByRole("button", { name: "Enable browser alerts" }),
    );
    const retry = await screen.findByRole("button", { name: "Try again" });
    const warning = screen
      .getByText(/blocked for this site/)
      .closest("p");
    expect(warning).toHaveClass("alerts__warning");
    expect(retry.getAttribute("aria-describedby")).toBe(
      warning!.getAttribute("id"),
    );
    expect(retry).toHaveFocus();
    expect(MockNotification.instances).toHaveLength(0);
    // The chaser re-allows notifications in the browser's site settings;
    // Try again picks the granted permission up without a new prompt.
    await user.click(retry);
    await waitFor(() =>
      expect(screen.getByText("Browser alerts enabled.")).toBeInTheDocument(),
    );
    expect(screen.getByText("Browser alerts enabled.")).toHaveFocus();
    expect(
      MockNotification.instances.map((n) => n.title),
    ).toContain("Geomagnetic K-index of 6 expected");
  });

  it("hides the enable button when the Notification API is absent", async () => {
    vi.stubGlobal("Notification", undefined);
    renderAlerts();
    await waitFor(() =>
      expect(screen.getByText(/Notifications can appear while this tab is open/)).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /Enable browser alerts/ }),
    ).not.toBeInTheDocument();
  });

  it("keeps the cached banner and warns when the alerts feed fails", async () => {
    const client = queryClient();
    renderAlerts(client);
    await waitFor(() =>
      expect(document.querySelector(".alerts__strip")).toBeInTheDocument(),
    );
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes(ALERTS_URL)) {
        return Promise.resolve({
          ok: false,
          status: 500,
          text: async () => "",
        } as Response);
      }
      return Promise.resolve({ ok: true, text: async () => "" });
    });
    await client.refetchQueries({ queryKey: ["alerts", "live"] });
    await waitFor(() =>
      expect(screen.getByText(/Live data unavailable/)).toBeInTheDocument(),
    );
    const warning = screen.getByText(/Live data unavailable/);
    expect(warning).toHaveAttribute("aria-live", "polite");
    expect(document.querySelector(".alerts__strip")).toBeInTheDocument();
  });

  it("shows a plain error when the feed never loaded", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("alerts.json")) {
        return Promise.resolve({
          ok: false,
          status: 500,
          text: async () => "",
        } as Response);
      }
      return Promise.resolve({ ok: true, text: async () => "" });
    });
    renderAlerts();
    await waitFor(() =>
      expect(screen.getByText(/Couldn't load alerts\. Please check back later\./)).toBeInTheDocument(),
    );
  });
});

describe("background alerts (push foundation, ticket 02)", () => {
  /** The fake Web Push subscription the service worker's pushManager returns. */
  const fakeSubscription = () => ({
    endpoint: "https://push.example/subscriptions/a",
    getKey: (name: string) =>
      name === "p256dh"
        ? new Uint8Array([1, 2, 3, 4]).buffer
        : new Uint8Array([251, 255, 190]).buffer,
    unsubscribe: vi.fn(async () => true),
  });

  /** The subscribe options the context must pass (userVisibleOnly + key). */
  type SubscribeFn = (options: {
    userVisibleOnly: boolean;
    applicationServerKey: unknown;
  }) => Promise<ReturnType<typeof fakeSubscription>>;

  const installWorker = () => {
    const registration = {
      pushManager: {
        subscribe: vi.fn<SubscribeFn>(async () => fakeSubscription()),
        getSubscription: vi.fn(async () => fakeSubscription()),
      },
    };
    Object.defineProperty(window.navigator, "serviceWorker", {
      value: { getRegistration: vi.fn(async () => registration) },
      configurable: true,
    });
    return registration;
  };

  const senderCalls = (urlFragment: string) =>
    mockFetch.mock.calls.filter(
      (call) => typeof call[0] === "string" && call[0].includes(urlFragment),
    );

  afterEach(() => {
    Reflect.deleteProperty(window.navigator, "serviceWorker");
    vi.unstubAllEnvs();
  });

  it("enabling requests permission, subscribes with the app-server key and stores the settings object", async () => {
    vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "AQIDBA");
    const user = userEvent.setup();
    const registration = installWorker();
    renderAlerts();
    await user.click(
      await screen.findByRole("button", { name: "Enable browser alerts" }),
    );
    await waitFor(() =>
      expect(senderCalls("/.netlify/functions/subscribe")).toHaveLength(1),
    );
    const subscribeCall = registration.pushManager.subscribe.mock.calls[0];
    expect(subscribeCall).toBeDefined();
    expect(subscribeCall[0].userVisibleOnly).toBe(true);
    expect([...(subscribeCall[0].applicationServerKey as Uint8Array)]).toEqual([
      1, 2, 3, 4,
    ]);
    const postCall = senderCalls("/.netlify/functions/subscribe")[0];
    expect(postCall[1].method).toBe("POST");
    const body = JSON.parse(postCall[1].body);
    expect(body.subscription.endpoint).toBe(
      "https://push.example/subscriptions/a",
    );
    expect(body.alertThreshold).toBe(5);
    expect(screen.getByText("Background alerts on.")).toBeInTheDocument();
  });

  it("shows the test control and disable when the browser already holds a subscription", async () => {
    vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "AQIDBA");
    installWorker();
    renderAlerts();
    expect(await screen.findByText("Background alerts on.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send test poke" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Disable background alerts" }),
    ).toBeInTheDocument();
  });

  it("the test control fires one canned poke at the sender", async () => {
    vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "AQIDBA");
    installWorker();
    const user = userEvent.setup();
    renderAlerts();
    await user.click(
      await screen.findByRole("button", { name: "Send test poke" }),
    );
    await waitFor(() =>
      expect(screen.getByText("Test poke sent.")).toBeInTheDocument(),
    );
    const calls = senderCalls("/.netlify/functions/send-test");
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe(
      "/.netlify/functions/send-test?endpoint=" +
        encodeURIComponent("https://push.example/subscriptions/a"),
    );
  });

  it("a failed test poke says so instead of staying silent", async () => {
    vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "AQIDBA");
    installWorker();
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("send-test")) {
        return Promise.resolve({ ok: false, status: 503, text: async () => "" });
      }
      return Promise.resolve({ ok: true, text: async () => "" });
    });
    const user = userEvent.setup();
    renderAlerts();
    await user.click(
      await screen.findByRole("button", { name: "Send test poke" }),
    );
    await waitFor(() =>
      expect(screen.getByText(/Test poke failed/)).toBeInTheDocument(),
    );
  });

  it("disabling deletes the subscription and unsubscribes the browser", async () => {
    vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "AQIDBA");
    const user = userEvent.setup();
    installWorker();
    renderAlerts();
    await user.click(
      await screen.findByRole("button", {
        name: "Disable background alerts",
      }),
    );
    await waitFor(() =>
      expect(senderCalls("/.netlify/functions/unsubscribe")).toHaveLength(1),
    );
    const call = senderCalls("/.netlify/functions/unsubscribe")[0];
    expect(call[1].method).toBe("DELETE");
    expect(call[0]).toBe(
      "/.netlify/functions/unsubscribe?endpoint=" +
        encodeURIComponent("https://push.example/subscriptions/a"),
    );
    expect(
      await screen.findByRole("button", { name: "Enable browser alerts" }),
    ).toBeInTheDocument();
  });

  it("a threshold change re-sends and overwrites the stored settings", async () => {
    vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "AQIDBA");
    installWorker();
    const user = userEvent.setup();
    renderAlerts();
    await screen.findByText("Background alerts on.");
    fireEvent.change(
      screen.getByRole("slider", { name: /Kp alert threshold/i }),
      { target: { value: "7" } },
    );
    await waitFor(() =>
      expect(senderCalls("/.netlify/functions/subscribe")).toHaveLength(1),
    );
    const postCalls = senderCalls("/.netlify/functions/subscribe");
    expect(JSON.parse(postCalls[0][1].body).alertThreshold).toBe(7);
  });
});