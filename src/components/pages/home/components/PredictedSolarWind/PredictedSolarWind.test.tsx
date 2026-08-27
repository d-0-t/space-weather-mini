import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import PredictedSolarWind from "./PredictedSolarWind";

const renderPanel = () =>
  render(
    <MemoryRouter>
      <PredictedSolarWind />
    </MemoryRouter>,
  );

describe("PredictedSolarWind", () => {
  it("renders the ENLIL video panel with native controls", () => {
    renderPanel();
    expect(
      screen.getByRole("heading", { name: /Predicted solar wind/i }),
    ).toBeInTheDocument();
    const video = document.querySelector("video")!;
    expect(video).toBeInTheDocument();
    expect(video.getAttribute("src")).toBe(
      "https://spaceweather.irf.se/data/swpc_enlil.mp4",
    );
    expect(video.hasAttribute("controls")).toBe(true);
    expect(video.getAttribute("preload")).toBe("metadata");
  });

  it("explains the video in a visible caption pointing to the forecast panels", () => {
    renderPanel();
    // Visible description of what the video visualizes – no audio needed
    expect(
      screen.getByText(/Visualization of the predicted solar wind speed/i),
    ).toBeInTheDocument();
    // Links to the numeric forecast panels that back the video
    const outlookLinks = screen.getAllByRole("link", {
      name: /27-day outlook/i,
    });
    expect(outlookLinks.length).toBeGreaterThan(0);
    expect(outlookLinks[0]!.getAttribute("href")).toBe("/forecasts/27days");
    const threeDayLinks = screen.getAllByRole("link", {
      name: /3-day forecast/i,
    });
    expect(threeDayLinks.length).toBeGreaterThan(0);
    expect(threeDayLinks[0]!.getAttribute("href")).toBe("/forecasts/3days");
  });

  it("links the IRF source with the ENLIL forecast page", () => {
    renderPanel();
    const source = screen.getByRole("link", { name: /^IRF$/ });
    expect(source.getAttribute("href")).toBe(
      "https://spaceweather.irf.se/forecast/enlil/",
    );
    expect(source.getAttribute("target")).toBe("_blank");
  });
});