import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./index.scss";
import App from "./components/App";
import Nav from "./components/navigation/Nav";
import Footer from "./components/footer/Footer";
import reportWebVitals from "./reportWebVitals";

const container = document.getElementById("root");
const root = createRoot(container!);
const queryClient = new QueryClient();

root.render(
  // NOTE: React.StrictMode will render everything twice in development, but not in production
  // Comment out if you only want one render for dev
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Nav />
        <center>
          <App />
          <Footer />
        </center>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);

reportWebVitals(console.log);
