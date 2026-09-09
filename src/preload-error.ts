/**
 * Chunk-load crash guard: an open tab that survives a deploy can lazily
 * import a route chunk the server no longer serves (the Service Worker's
 * autoUpdate already swapped the precache). Vite surfaces the failed
 * dynamic import as a `vite:preloadError` event on window; answering it
 * with a single session-scoped reload lands the tab on the new shell
 * instead of a white screen. The sessionStorage flag keeps a persistently
 * failing import from reload-looping forever.
 */

const RELOAD_FLAG = "sw:chunk-reload:v1";

let installed = false;

/** Installs the one-shot reload guard; `reload` is injectable for tests. */
export function installPreloadErrorReload(
  reload: () => void = () => window.location.reload(),
): void {
  if (installed) return;
  installed = true;
  const onPreloadError = (): void => {
    // Self-removing: one listener answers at most one error per session.
    window.removeEventListener("vite:preloadError", onPreloadError);
    if (sessionStorage.getItem(RELOAD_FLAG)) return;
    sessionStorage.setItem(RELOAD_FLAG, "1");
    reload();
  };
  window.addEventListener("vite:preloadError", onPreloadError);
}
