import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  it("renders the ENLIL video preview that opens a full-size modal", async () => {
    const user = userEvent.setup();
    renderPanel();
    expect(
      screen.getByRole("heading", { name: /Predicted solar wind/i }),
    ).toBeInTheDocument();
    // One muted preview (tile) plus one controlled copy (modal)
    const videos = document.querySelectorAll("video");
    expect(videos.length).toBe(2);
    const [tile, modal] = Array.from(videos);
    expect(tile!.getAttribute("src")).toBe(
      "https://spaceweather.irf.se/data/swpc_enlil.mp4",
    );
    expect(tile!.hasAttribute("controls")).toBe(false);
    expect(modal!.getAttribute("src")).toBe(
      "https://spaceweather.irf.se/data/swpc_enlil.mp4",
    );
    expect(modal!.hasAttribute("controls")).toBe(true);
    // Clicking the preview opens the modal; Escape closes it
    const dialog = document.querySelector(
      "dialog.image-modal",
    ) as HTMLDialogElement;
    expect(dialog.open).toBe(false);
    await user.click(
      screen.getByRole("button", {
        name: /predicted solar wind video, full size/i,
      }),
    );
    expect(dialog.open).toBe(true);
    await user.keyboard("{Escape}");
    expect(dialog.open).toBe(false);
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

  it("closes the modal with the X button carrying a Close label", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(
      screen.getByRole("button", {
        name: /predicted solar wind video, full size/i,
      }),
    );
    const close = screen.getByRole("button", { name: /^Close$/ });
    expect(close.querySelector("span[aria-hidden]")?.textContent).toBe("×");
    expect(close.querySelector(".sr-only")?.textContent).toBe("Close");
    expect(close.getAttribute("title")).toBe("Close");
    await user.click(close);
    const dialog = document.querySelector(
      "dialog.image-modal",
    ) as HTMLDialogElement;
    expect(dialog.open).toBe(false);
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