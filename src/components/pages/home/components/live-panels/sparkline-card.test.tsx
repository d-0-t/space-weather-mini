import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SparklineCard } from "./live-panels";
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

describe("SparklineCard offline honesty", () => {
  it("renders the freshness line as 'As of {time} • Updated {age}'", () => {
    render(<SparklineCard {...baseProps} />);
    expect(
      screen.getByText("As of Aug 26 16:36 UTC • Updated 5m ago"),
    ).toBeInTheDocument();
  });

  it("renders the aria-live stale notice when showing stale data", () => {
    render(<SparklineCard {...baseProps} state="stale" />);
    const notice = screen.getByText(STALE_DATA_NOTICE);
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveAttribute("aria-live", "polite");
  });

  it("renders the never-cached error in place of the value", () => {
    render(<SparklineCard {...baseProps} state="never-loaded" />);
    expect(screen.getByText(COULDNT_LOAD_COPY)).toBeInTheDocument();
    expect(screen.queryByText("450")).not.toBeInTheDocument();
  });

  it("shows neither notice when data is fresh and online", () => {
    render(<SparklineCard {...baseProps} />);
    expect(screen.queryByText(STALE_DATA_NOTICE)).not.toBeInTheDocument();
    expect(screen.queryByText(COULDNT_LOAD_COPY)).not.toBeInTheDocument();
  });
});