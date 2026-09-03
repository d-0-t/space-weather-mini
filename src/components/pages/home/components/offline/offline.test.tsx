import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  COULDNT_LOAD_COPY,
  FreshnessLine,
  liveDataState,
  STALE_DATA_NOTICE,
  StaleDataNotice,
  useIsOffline,
} from "./offline";

const OnlineProbe: React.FC = () => {
  const offline = useIsOffline();
  return <p>{offline ? "offline" : "online"}</p>;
};

describe("offline copy", () => {
  it("uses the honest stale-data and never-cached notices", () => {
    expect(STALE_DATA_NOTICE).toBe(
      "⚠ Showing saved data – couldn't reach NOAA",
    );
    expect(COULDNT_LOAD_COPY).toBe("Couldn't load – connect to refresh");
  });
});

describe("useIsOffline", () => {
  it("starts online and flips on the offline/online events", () => {
    render(<OnlineProbe />);
    expect(screen.getByText("online")).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByText("offline")).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.getByText("online")).toBeInTheDocument();
  });

  it("starts offline when the browser reports no connection", () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => false,
    });
    render(<OnlineProbe />);
    expect(screen.getByText("offline")).toBeInTheDocument();
  });
});

describe("liveDataState", () => {
  it("is fresh when online with data and no error", () => {
    expect(liveDataState({ isError: false, data: {} }, false)).toBeNull();
  });

  it("is stale when offline with cached data (the Service Worker served it)", () => {
    expect(liveDataState({ isError: false, data: {} }, true)).toBe("stale");
    expect(liveDataState({ isError: true, data: {} }, false)).toBe("stale");
  });

  it("is never-loaded only when the query really failed with no data", () => {
    expect(liveDataState({ isError: true, data: undefined }, false)).toBe(
      "never-loaded",
    );
  });

  it("stays fresh while a query is still loading its cached data offline", () => {
    // Must not flash "couldn't load" before the cached data arrives
    expect(liveDataState({ isError: false, data: undefined }, true)).toBeNull();
  });
});

describe("StaleDataNotice", () => {
  it("renders the honest saved-data warning with aria-live polite", () => {
    render(<StaleDataNotice />);
    const notice = screen.getByText(STALE_DATA_NOTICE);
    expect(notice).toHaveClass("live-panel__warning");
    expect(notice).toHaveAttribute("aria-live", "polite");
  });
});

describe("FreshnessLine", () => {
  it("renders 'As of {time} • Updated {age}' in UTC", () => {
    render(<FreshnessLine asOf="2026-08-26T16:36:00" updated="5m ago" />);
    expect(
      screen.getByText("As of Aug 26 16:36 UTC • Updated 5m ago"),
    ).toBeInTheDocument();
  });

  it("keeps the dash placeholder when there is no as-of time yet", () => {
    render(<FreshnessLine asOf="–" updated="–" />);
    expect(screen.getByText("As of – • Updated –")).toBeInTheDocument();
  });
});