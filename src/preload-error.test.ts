import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The chunk-load crash guard: a long-lived tab across a deploy can request a
 * lazily imported route chunk the server no longer serves (the Service
 * Worker updated the precache out from under it). Vite surfaces that as a
 * `vite:preloadError` event on window; the guard answers it with one
 * session-scoped reload so the tab lands on the new shell instead of dying
 * on a white screen. The reload itself is the browser navigation boundary,
 * injected so tests observe the decision, not jsdom's un-navigable location.
 */

const RELOAD_FLAG = "sw:chunk-reload:v1";

const preloadError = (): void => {
  window.dispatchEvent(new Event("vite:preloadError"));
};

describe("chunk-load crash guard (vite:preloadError)", () => {
  const reload = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    sessionStorage.clear();
    reload.mockClear();
  });

  const install = async (): Promise<void> => {
    const mod = await import("./preload-error");
    mod.installPreloadErrorReload(reload);
  };

  it("reloads once when the first preload error arrives", async () => {
    await install();
    preloadError();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(RELOAD_FLAG)).toBe("1");
  });

  it("is idempotent – a second install must not stack listeners", async () => {
    await install();
    await install();
    preloadError();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("never reloads twice in the same session", async () => {
    const mod = await import("./preload-error");
    mod.installPreloadErrorReload(reload);
    preloadError();
    preloadError();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("stays silent after the reload it caused (no loop)", async () => {
    sessionStorage.setItem(RELOAD_FLAG, "1");
    await install();
    preloadError();
    expect(reload).not.toHaveBeenCalled();
  });

  it("ignores other window events", async () => {
    await install();
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
    expect(reload).not.toHaveBeenCalled();
  });
});
