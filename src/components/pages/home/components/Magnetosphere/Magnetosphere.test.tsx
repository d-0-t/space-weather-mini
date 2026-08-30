import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import hemiFixture from "../../../../../products/fixtures/hemi-power.txt?raw";
import dstFixture from "../../../../../products/fixtures/kyoto-dst.json?raw";
import boulderFixture from "../../../../../products/fixtures/boulder-k-index-1m.json?raw";
import Magnetosphere from "./Magnetosphere";

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockImplementation((url: string) => {
    const u = typeof url === "string" ? url : "";
    if (u.includes("aurora-nowcast-hemi-power.txt"))
      return Promise.resolve({ ok: true, text: async () => hemiFixture });
    if (u.includes("kyoto-dst.json"))
      return Promise.resolve({ ok: true, text: async () => dstFixture });
    if (u.includes("boulder_k_index_1m.json"))
      return Promise.resolve({ ok: true, text: async () => boulderFixture });
    return Promise.resolve({ ok: true, text: async () => "" });
  });
  vi.stubGlobal("fetch", mockFetch);
});

const renderMagnetosphere = () =>
  render(
    <QueryClientProvider client={queryClient()}>
      <Magnetosphere />
    </QueryClientProvider>,
  );

describe("Magnetosphere", () => {
  it("renders the mini chart cards with latest values", async () => {
    renderMagnetosphere();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /Magnetosphere/ }),
      ).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.getByText("Hemispheric power")).toBeInTheDocument(),
    );
    for (const title of [
      "Hemispheric power",
      "Disturbance Storm Time index",
      "Kiruna magnetometer",
      "NOAA magnetometer (Boulder)",
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getAllByText(/nT/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/GW/).length).toBeGreaterThan(0);
  });

  it("labels every chart with a descriptive accessible name", async () => {
    renderMagnetosphere();
    await waitFor(() =>
      expect(
        screen.getByRole("img", { name: /boulder magnetometer k index, last 3 hours/i }),
      ).toBeInTheDocument(),
    );
    for (const label of [
      /hemispheric power, north and south mirrored around zero, all available data/i,
      /disturbance storm index, last 24 hours/i,
      /boulder magnetometer k index, last 3 hours/i,
    ]) {
      expect(screen.getByRole("img", { name: label })).toBeInTheDocument();
    }
  });

  it("explains every chart in a native collapsible help toggle", async () => {
    renderMagnetosphere();
    await waitFor(() =>
      expect(screen.getByText("Hemispheric power")).toBeInTheDocument(),
    );
    // One "?" help per card – 4 cards, all collapsible via native <details>
    const helps = document.querySelectorAll(".live-panel__help");
    expect(helps.length).toBeGreaterThanOrEqual(4);
    expect(screen.getAllByText("?").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("About hemispheric power")).toBeInTheDocument();
    expect(screen.getByText("About Dst")).toBeInTheDocument();
    expect(screen.getByText("About the Kiruna magnetogram")).toBeInTheDocument();
    expect(screen.getByText("About the NOAA magnetometer")).toBeInTheDocument();
    for (const details of Array.from(helps)) {
      expect(details).toHaveProperty("open", false);
    }
  });

  it("shows north and south hemispheric power together", async () => {
    renderMagnetosphere();
    // Wait for the hemi data to arrive so the mirrored chart renders
    await waitFor(() =>
      expect(
        screen.getByRole("img", {
          name: /hemispheric power, north and south mirrored around zero/i,
        }),
      ).toBeInTheDocument(),
    );
    const hemiCard = screen.getByText("Hemispheric power").closest("section")!;
    // The chart is described as a mirror around zero covering all data
    expect(
      hemiCard.querySelector(".live-panel__chart .sr-only")!.textContent,
    ).toMatch(/north and south mirrored around zero, all available data/i);
    // Headline: one large number per hemisphere, spread across the card
    const hemi = hemiCard.querySelector(".live-panel__hemi")!;
    const sides = hemi.querySelectorAll(".live-panel__hemi__side");
    expect(sides).toHaveLength(2);
    expect(sides[0]!.textContent).toMatch(/^\d+GWNorth$/);
    expect(sides[1]!.textContent).toMatch(/^\d+GWSouth$/);
  });

  it("stacks the Boulder help list and description in one popover", async () => {
    const user = userEvent.setup();
    renderMagnetosphere();
    await waitFor(() =>
      expect(
        screen.getByText("NOAA magnetometer (Boulder)"),
      ).toBeInTheDocument(),
    );
    const boulderHelp = screen
      .getByText("NOAA magnetometer (Boulder)")
      .closest("section")!
      .querySelector(".live-panel__help")! as HTMLDetailsElement;
    await user.click(boulderHelp.querySelector("summary")!);
    const popover = boulderHelp.querySelector(".live-panel__popover")!;
    // Both the scale list and the description render, stacked, not overlapped
    expect(popover.querySelectorAll("li").length).toBeGreaterThan(3);
    expect(popover.querySelector("li b")?.textContent).toBe("0-2");
    expect(popover.querySelector("p")?.textContent).toMatch(
      /simple local gauge of how disturbed the magnetic field/,
    );
    // The list paints above (before) the description in DOM order
    expect(
      popover
        .querySelector("ul")!
        .compareDocumentPosition(popover.querySelector("p")!),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    // A click outside the popover closes it; a click inside keeps it open
    fireEvent.pointerDown(boulderHelp, { clientX: 0, clientY: 0 });
    expect(boulderHelp.open).toBe(true);
    fireEvent.pointerDown(document, { clientX: 0, clientY: 0 });
    expect(boulderHelp.open).toBe(false);
  });

  it("shows the Kiruna magnetogram image and the NOAA Boulder chart as separate cards", async () => {
    renderMagnetosphere();
    await waitFor(() =>
      expect(screen.getByText("Kiruna magnetometer")).toBeInTheDocument(),
    );
    const images = screen.getAllByRole("img", {
      name: /kiruna magnetogram, x y and z components/i,
    });
    expect(images.length).toBeGreaterThanOrEqual(1);
    expect(images[0]!.getAttribute("src")).toContain("spaceweather.irf.se");
    // The trigger tile is named by sr-only text; the modal also carries the
    // full-size image
    expect(
      screen.getByRole("button", { name: /Kiruna magnetogram, full size/i }),
    ).toBeInTheDocument();
    const dialog = document.querySelector("dialog.image-modal")!;
    expect(dialog.querySelector("img")?.getAttribute("src")).toContain(
      "spaceweather.irf.se",
    );
    expect(
      screen.getByRole("heading", { name: /NOAA magnetometer \(Boulder\)/ }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("img", { name: /boulder magnetometer k index, last 3 hours/i }),
      ).toBeInTheDocument(),
    );
  });

  it("opens the Kiruna magnetogram in a modal closeable by X and Escape", async () => {
    const user = userEvent.setup();
    renderMagnetosphere();
    await waitFor(() =>
      expect(screen.getByText("Kiruna magnetometer")).toBeInTheDocument(),
    );
    const dialog = document.querySelector(
      "dialog.image-modal",
    ) as HTMLDialogElement;
    expect(dialog.open).toBe(false);
    const tile = screen.getByRole("button", { name: /kiruna magnetogram/i });
    await user.click(tile);
    expect(dialog.open).toBe(true);
    // Close button: visible × with an sr-only "Close" label and tooltip
    const close = screen.getByRole("button", { name: /^Close$/ });
    expect(close.querySelector("span[aria-hidden]")?.textContent).toBe("×");
    expect(close.querySelector(".sr-only")?.textContent).toBe("Close");
    expect(close.getAttribute("title")).toBe("Close");
    await user.click(close);
    expect(dialog.open).toBe(false);
    // Escape closes it again
    await user.click(tile);
    expect(dialog.open).toBe(true);
    await user.keyboard("{Escape}");
    expect(dialog.open).toBe(false);
  });

  it("attributes each card to its own data source", async () => {
    renderMagnetosphere();
    await waitFor(() =>
      expect(screen.getByText("Hemispheric power")).toBeInTheDocument(),
    );
    // Mixed sources: NOAA/SWPC (hemi, Boulder), Kyoto (Dst), IRF (Kiruna)
    const noaaLinks = screen.getAllByRole("link", { name: "NOAA/SWPC" });
    expect(noaaLinks.length).toBe(2);
    for (const link of noaaLinks) {
      expect(link).toHaveAttribute("href", "https://www.swpc.noaa.gov/");
    }
    expect(
      screen.getByRole("link", { name: "WDC for Geomagnetism, Kyoto" }),
    ).toHaveAttribute("href", "https://wdc.kugi.kyoto-u.ac.jp/");
    expect(screen.getByRole("link", { name: "IRF" })).toHaveAttribute(
      "href",
      "https://spaceweather.irf.se/",
    );
    // Each source line sits inside its own card
    const dstCard = screen
      .getByText("Disturbance Storm Time index")
      .closest("section")!;
    expect(dstCard.textContent).toMatch(/Source: WDC for Geomagnetism, Kyoto/);
    const kirunaCard = screen.getByText("Kiruna magnetometer").closest("section")!;
    expect(kirunaCard.textContent).toMatch(/Source: IRF/);
  });
});