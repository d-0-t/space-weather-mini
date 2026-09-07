// The freshness line renders in the device time zone in Local mode, so the
// suite pins one (Sweden, UTC+2) to keep every expectation deterministic.
process.env.TZ = "Europe/Stockholm";

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { SparklineCard } from "./live-panels";
import { DisplayTimezoneProvider } from "../../../../DisplayTimezone/DisplayTimezoneContext";
import { DISPLAY_TIMEZONE_STORAGE_KEY } from "../../../../../products/display-timezone";
import {
  COULDNT_LOAD_COPY,
  STALE_DATA_NOTICE,
} from "../offline/offline";

const baseProps = {
  title: "Speed",
  value: "450",
  note: "km/s",
  asOf: "2026-08-26T16:36:00",
  updated: "5m ago",
  points: [],
  accent: "greenyellow",
  ariaLabel: "Solar wind speed, km/s",
  unit: "km/s",
  help: { label: "About solar wind" },
};

const renderCard = (state?: "stale" | "never-loaded") =>
  render(
    <DisplayTimezoneProvider>
      <SparklineCard {...baseProps} {...(state ? { state } : {})} />
    </DisplayTimezoneProvider>,
  );

describe("SparklineCard offline honesty (ticket 02)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the freshness line as 'As of {time}. Updated {age}.' in UTC mode", () => {
    localStorage.setItem(
      DISPLAY_TIMEZONE_STORAGE_KEY,
      JSON.stringify({ timezone: "utc", v: 1 }),
    );
    renderCard();
    expect(
      screen.getByText("As of Aug 26 16:36 UTC. Updated 5m ago."),
    ).toBeInTheDocument();
  });

  it("renders the freshness line with the device clock bare in Local mode – the default", () => {
    // 16:36 UTC is 18:36 in Sweden (UTC+2), same calendar day
    renderCard();
    expect(screen.getByText("As of 18:36. Updated 5m ago.")).toBeInTheDocument();
  });

  it("renders the aria-live stale notice when showing stale data", () => {
    renderCard("stale");
    const notice = screen.getByText(STALE_DATA_NOTICE);
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveAttribute("aria-live", "polite");
  });

  it("renders the never-cached error in place of the value", () => {
    renderCard("never-loaded");
    expect(screen.getByText(COULDNT_LOAD_COPY)).toBeInTheDocument();
    expect(screen.queryByText("450")).not.toBeInTheDocument();
  });

  it("shows neither notice when data is fresh and online", () => {
    renderCard();
    expect(screen.queryByText(STALE_DATA_NOTICE)).not.toBeInTheDocument();
    expect(screen.queryByText(COULDNT_LOAD_COPY)).not.toBeInTheDocument();
  });
});
