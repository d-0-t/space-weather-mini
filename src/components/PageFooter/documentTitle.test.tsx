// TDD RED for ticket 02: shared Jump to top plus h1-derived document titles.
// Seams (approved): PageFooter overflow/activation + static route title map.
// External behavior only, via roles and document.title.
process.env.TZ = "Europe/Stockholm";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, useNavigate } from "react-router-dom";

import { routeToDocumentTitle, useDocumentTitle } from "./documentTitle";
import { DisplayTimezoneProvider } from "../DisplayTimezone/DisplayTimezoneContext";
import { saveDisplayTimezone } from "../../products/display-timezone";

function TitleHarness({ route }: { route: string }) {
  return (
    <MemoryRouter initialEntries={[route]}>
      <TitleProbe />
    </MemoryRouter>
  );
}

function TitleProbe() {
  useDocumentTitle();
  return null;
}

function NavigatingProbe() {
  useDocumentTitle();
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate("/about/guide")}>
        Go to guide
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        Go back
      </button>
      <button type="button" onClick={() => navigate(1)}>
        Go forward
      </button>
    </>
  );
}

describe("Document title static map (ticket 02)", () => {
  it("derives every route tab text from its h1 as `{H1} – Space Weather`", () => {
    expect(routeToDocumentTitle("/")).toBe("Dashboard – Space Weather");
    expect(routeToDocumentTitle("/home")).toBe("Dashboard – Space Weather");
    expect(routeToDocumentTitle("/webcams")).toBe("Webcams – Space Weather");
    expect(routeToDocumentTitle("/conditions")).toBe(
      "Local conditions – Space Weather",
    );
    expect(routeToDocumentTitle("/forecasts")).toBe(
      "Forecast Discussion – Space Weather",
    );
    expect(routeToDocumentTitle("/forecasts/discussion")).toBe(
      "Forecast Discussion – Space Weather",
    );
    expect(routeToDocumentTitle("/forecasts/daily")).toBe(
      "Daily Geomagnetic Indices – Space Weather",
    );
    expect(routeToDocumentTitle("/forecasts/weekly")).toBe(
      "Weekly Report – Space Weather",
    );
    expect(routeToDocumentTitle("/forecasts/3days")).toBe(
      "3-Day Forecast – Space Weather",
    );
    expect(routeToDocumentTitle("/forecasts/27days")).toBe(
      "27-Day Outlook – Space Weather",
    );
    expect(routeToDocumentTitle("/forecasts/geoalert")).toBe(
      "Geophysical Observations and Predictions – Space Weather",
    );
    expect(routeToDocumentTitle("/about")).toBe("This site – Space Weather");
    expect(routeToDocumentTitle("/about/sources")).toBe(
      "Sources – Space Weather",
    );
    expect(routeToDocumentTitle("/about/install-alerts")).toBe(
      "Install & Alerts – Space Weather",
    );
    expect(routeToDocumentTitle("/about/guide")).toBe(
      "Aurora guide – Space Weather",
    );
    expect(routeToDocumentTitle("/explainers")).toBe(
      "Explainers – Space Weather",
    );
  });

  it("updates the tab text on push, back and forward navigation", () => {
    document.title = "Space Weather";
    render(
      <MemoryRouter initialEntries={["/webcams"]}>
        <NavigatingProbe />
      </MemoryRouter>,
    );
    expect(document.title).toBe("Webcams – Space Weather");
    fireEvent.click(screen.getByRole("button", { name: "Go to guide" }));
    expect(document.title).toBe("Aurora guide – Space Weather");
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(document.title).toBe("Webcams – Space Weather");
    fireEvent.click(screen.getByRole("button", { name: "Go forward" }));
    expect(document.title).toBe("Aurora guide – Space Weather");
  });

  it("ignores Time and Astro state", () => {
    localStorage.clear();
    saveDisplayTimezone(localStorage, "utc");
    document.title = "Space Weather";
    render(
      <DisplayTimezoneProvider>
        <TitleHarness route="/" />
      </DisplayTimezoneProvider>,
    );
    expect(document.title).toBe("Dashboard – Space Weather");
  });

  it("carries no dynamic suffixes", () => {
    expect(routeToDocumentTitle("/")).not.toMatch(/Kp|G\d|S\d|R\d/i);
  });
});
