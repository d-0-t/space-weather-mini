import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../../../products/fixtures/3-day-forecast.txt?raw";
import ThreeDayForecast from "./3-day-forecast";

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
      <ThreeDayForecast />
    </QueryClientProvider>
  );

describe("ThreeDayForecast page", () => {
  it("fetches the product and renders the three semantic tables", async () => {
    renderPage();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("3-day-forecast.txt"));
    const tables = await screen.findAllByRole("table");
    expect(tables).toHaveLength(3);
  });

  it("renders the Kp breakdown table with all 8 rows and day columns", async () => {
    renderPage();
    const kpTable = (await screen.findAllByRole("table"))[0];
    expect(within(kpTable).getAllByRole("row")).toHaveLength(9);
    expect(within(kpTable).getByRole("columnheader", { name: "Aug 23" })).toBeInTheDocument();
    expect(within(kpTable).getByRole("columnheader", { name: "Aug 25" })).toBeInTheDocument();
  });

  it("renders the probability tables with percentages", async () => {
    renderPage();
    const tables = await screen.findAllByRole("table");
    const sTable = tables[1];
    const rTable = tables[2];
    expect(within(sTable).getByRole("row", { name: /S1 or greater/ })).toBeInTheDocument();
    const r1R2Row = within(rTable).getByRole("row", { name: /R1-R2/ });
    const r3Row = within(rTable).getByRole("row", { name: /R3 or greater/ });
    expect(within(r1R2Row).getAllByText("45%")).toHaveLength(3);
    expect(within(r3Row).getAllByText("10%")).toHaveLength(3);
  });

  it("shows the issued details (UTC, local, author) without a refresh control", async () => {
    renderPage();
    expect(await screen.findByText(/2026 Aug 23 1230 UTC/)).toBeInTheDocument();
    expect(screen.getByText("Issued (UTC):")).toBeInTheDocument();
    expect(screen.getByText("Issued (local):")).toBeInTheDocument();
    expect(
      screen.getByText(/Prepared by the U.S. Dept. of Commerce/)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the section headings with glossary vocabulary and the rationale prose", async () => {
    renderPage();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Geomagnetic activity" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Solar radiation storm" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Radio blackout" })).toBeInTheDocument();
    expect(
      screen.getByText(/No G1 \(Minor\) or greater geomagnetic storms are expected/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/regionale|regional text/i)).not.toBeInTheDocument();
  });

  it("renders the Kp forecast chart above the Kp breakdown table", async () => {
    renderPage();
    const tables = await screen.findAllByRole("table");
    const chart = screen.getByRole("img", {
      name: /kp index forecast by 3-hour interval/i,
    });
    expect(chart).toBeInTheDocument();
    expect(
      chart.compareDocumentPosition(tables[0]) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("shows a plain error message when the fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));
    renderPage();
    expect(await screen.findByText(/couldn't load the 3-day forecast/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});