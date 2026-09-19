// The dialog drives its drafts from the provider's stored settings, which
// the suite pins to the Sweden timezone for deterministic rendering.
process.env.TZ = "Europe/Stockholm";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AlertsDialog from "./AlertsDialog";
import { AlertsProvider } from "./AlertsContext";
import { DisplayTimezoneProvider } from "../../../../DisplayTimezone/DisplayTimezoneContext";

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockFetch = vi.fn();

beforeEach(() => {
  localStorage.clear();
  mockFetch.mockReset();
  mockFetch.mockImplementation(() =>
    Promise.resolve({ ok: true, text: async () => "" }),
  );
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window.navigator, "serviceWorker");
});

/** The fake Web Push subscription the service worker's pushManager returns. */
const fakeSubscription = () => ({
  endpoint: "https://push.example/subscriptions/a",
  getKey: (name: string) =>
    name === "p256dh"
      ? new Uint8Array([1, 2, 3, 4]).buffer
      : new Uint8Array([251, 255, 190]).buffer,
  unsubscribe: vi.fn(async () => true),
});

const installWorker = () => {
  const registration = {
    pushManager: {
      subscribe: vi.fn(async () => fakeSubscription()),
      getSubscription: vi.fn(async () => fakeSubscription()),
    },
  };
  Object.defineProperty(window.navigator, "serviceWorker", {
    value: { getRegistration: vi.fn(async () => registration) },
    configurable: true,
  });
  return registration;
};

/** The dialog host the way Home composes it: trigger + mounted-while-open. */
const Host: React.FC = () => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" ref={triggerRef} onClick={() => setOpen(true)}>
        Alerts
      </button>
      {open ? (
        <AlertsDialog triggerRef={triggerRef} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
};

const renderDialog = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient()}>
        <DisplayTimezoneProvider>
          <AlertsProvider>
            <Host />
          </AlertsProvider>
        </DisplayTimezoneProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );

const openDialog = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Alerts" }));
  const dialog = document.querySelector("dialog.alerts-dialog");
  if (!(dialog instanceof HTMLDialogElement)) throw new Error("no dialog");
  return dialog;
};

const storedPlace = JSON.stringify({
  v: 1,
  place: {
    displayName: "Luleå, Norrbotten County, Sweden",
    shortName: "Luleå",
    latitude: 65.5848,
    longitude: 22.1546,
    fetchedAt: "2026-09-18T10:00:00.000Z",
    country: "Sweden",
    countryCode: "se",
  },
});

describe("AlertsDialog drafts (ticket 06)", () => {
  beforeEach(() => {
    localStorage.setItem("sw:local-conditions:place:v1", storedPlace);
  });

  it("Apply persists the threshold, the type toggles and the gates as one change", async () => {
    vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "AQIDBA");
    installWorker();
    const user = userEvent.setup();
    renderDialog();
    const dialog = await openDialog(user);
    await screen.findByText("Background alerts on.");
    // Draft a threshold move, one type toggle off and one gates change.
    fireEvent.change(
      screen.getByRole("slider", { name: /Kp alert threshold/i }),
      { target: { value: "7" } },
    );
    await user.click(
      screen.getByRole("checkbox", { name: "Daily outlook alert" }),
    );
    // Unticking the rain checkbox tightens the precipitation gate.
    await user.click(
      screen.getByRole("checkbox", {
        name: "Show aurora alerts when it's raining or snowing",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(JSON.parse(localStorage.getItem("sw:thresholds:v1") ?? "")).toEqual({
      kp: 7,
      v: 1,
    });
    expect(
      JSON.parse(localStorage.getItem("sw:alert-settings:v1") ?? ""),
    ).toEqual({
      v: 1,
      settings: {
        alertTypes: { daily: false, kp: true, live: true },
        gates: {
          cloudMaxPercent: 100,
          noPrecipitation: true,
          darknessBand: "any",
        },
      },
    });
    // One settings change: the sender receives exactly one overwrite POST.
    const posts = mockFetch.mock.calls.filter(
      (call) => typeof call[0] === "string" && call[0].includes("subscribe"),
    );
    expect(posts).toHaveLength(1);
    expect(dialog.open).toBe(false);
  });

  it("Cancel discards the drafts without persisting anything", async () => {
    installWorker();
    const user = userEvent.setup();
    renderDialog();
    await openDialog(user);
    await screen.findByText("Background alerts on.");
    fireEvent.change(
      screen.getByRole("slider", { name: /Kp alert threshold/i }),
      { target: { value: "9" } },
    );
    await user.click(screen.getByRole("checkbox", { name: "Live alert" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(localStorage.getItem("sw:thresholds:v1")).toBeNull();
    expect(localStorage.getItem("sw:alert-settings:v1")).toBeNull();
  });
});
