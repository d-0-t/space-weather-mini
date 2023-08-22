import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./components/App";
import Nav from "./components/navigation/Nav";
import Footer from "./components/footer/Footer";
import reportWebVitals from "./reportWebVitals";

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <Nav />
      <center>
        <App />
        <Footer />
      </center>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById("root")
);

reportWebVitals(console.log);
