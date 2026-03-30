import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Auto-reload on stale chunk errors after deployment
window.addEventListener("vite:preloadError", () => {
  window.location.reload();
});

// Catch dynamic import failures (stale cached chunks)
window.addEventListener("error", (e) => {
  if (
    e.message?.includes("Failed to fetch dynamically imported module") ||
    e.message?.includes("Importing a module script failed")
  ) {
    window.location.reload();
  }
});

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
