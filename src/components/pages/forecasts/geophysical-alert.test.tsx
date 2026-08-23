import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../../../products/fixtures/geophysical-alert.txt?raw";
import GeophysicalAlert from "./geophysical-alert";

const queryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true, text: async () => fixture });
  vi.stubGlobal("fetch", mockFetch);
});

const renderPage = () =>
  render(
    <QueryClientProvider client={queryClient()}>
      <GeophysicalAlert />
    </QueryClientProvider>,
  );

describe("GeophysicalAlert page", () => {
  it("fetches the product and renders the Geophysical Observations and Predictions heading and section headings", async () => {
    renderPage();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("wwv.txt"));
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Geophysical Observations and Predictions",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Observations" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Predictions" }),
    ).toBeInTheDocument();
  });

  it("renders the solar indices message and the observed/predicted prose", async () => {
    renderPage();
    expect(
      await screen.findByText(/Solar-terrestrial indices for 23 August follow/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Solar flux 128 and estimated planetary A-index 6/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /No space weather storms were observed for the past 24 hours/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /No space weather storms are predicted for the next 24 hours/,
      ),
    ).toBeInTheDocument();
  });

  it("shows the issued details (UTC, local, author) without a refresh control", async () => {
    renderPage();
    expect(await screen.findByText(/2026 Aug 23 2105 UTC/)).toBeInTheDocument();
    expect(screen.getByText("Issued (UTC):")).toBeInTheDocument();
    expect(screen.getByText("Issued (local):")).toBeInTheDocument();
    expect(
      screen.getByText(/Prepared by the US Dept\. of Commerce/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a plain error message when the fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));
    renderPage();
    expect(
      await screen.findByText(/couldn't load the geophysical alert/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
