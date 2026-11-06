import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app";
import "./index.css";

function mount() {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount, { once: true });
      return;
    }
    console.error("Root element #root not found!");
    return;
  }

  const root = createRoot(rootElement);
  root.render(<App />);
}

mount();
