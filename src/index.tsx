import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./index.scss";
import App from "./components/App";
import Nav from "./components/navigation/Nav";
import reportWebVitals from "./reportWebVitals";

const container = document.getElementById("root");
const root = createRoot(container!);
// networkMode "always" keeps offline fetches honest: the Service Worker
// answers cached requests (stale data) and genuine misses reject so the
// "Couldn't load – connect to refresh" error shows. The default "online" mode
// would pause queries while offline, leaving live cards stuck on "Loading…".
const queryClient = new QueryClient({
  defaultOptions: { queries: { networkMode: "always" } },
});

root.render(
  // NOTE: React.StrictMode will render everything twice in development, but not in production
  // Comment out if you only want one render for dev
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Nav />
        <div className="app-shell">
          <main id="main-content" tabIndex={-1}>
            <App />
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

reportWebVitals(console.log);
