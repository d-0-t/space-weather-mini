import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import magFixture from "../../../../../products/fixtures/solar-wind-mag-field.json?raw";
import speedFixture from "../../../../../products/fixtures/solar-wind-speed.json?raw";
import hemiFixture from "../../../../../products/fixtures/hemi-power.txt?raw";
import dstFixture from "../../../../../products/fixtures/kyoto-dst.json?raw";
import LiveBanner from "./LiveBanner";

const queryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockImplementation((url: string) => {
    const u = typeof url === "string" ? url : "";
    if (u.includes("solar-wind-mag-field.json")) return Promise.resolve({ ok: true, text: async () => magFixture });
    if (u.includes("solar-wind-speed.json")) return Promise.resolve({ ok: true, text: async () => speedFixture });
    if (u.includes("aurora-nowcast-hemi-power.txt")) return Promise.resolve({ ok: true, text: async () => hemiFixture });
    if (u.includes("kyoto-dst.json")) return Promise.resolve({ ok: true, text: async () => dstFixture });
    return Promise.resolve({ ok: true, text: async () => "" });
  });
  vi.stubGlobal("fetch", mockFetch);
});

const renderBanner = () =>
  render(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter>
        <LiveBanner />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("LiveBanner", () => {
  it("renders Live Solar Wind heading and pills", async () => {
    renderBanner();
    await waitFor(() => expect(screen.getAllByText(/Bz/).length).toBeGreaterThan(0));
    expect(screen.getByRole("heading", { name: /Live Solar Wind/i })).toBeInTheDocument();
    expect(screen.getByText(/Hemispheric power/)).toBeInTheDocument();
  });
});
