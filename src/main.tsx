import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/nunito-sans";
import "@fontsource-variable/fraunces";
import App from "./App";
import ErrorBoundary from "./ErrorBoundary";
import { ThemeProvider } from "./lib/ThemeContext";

const container = document.getElementById("root");
if (!container) throw new Error("Root element #root not found in index.html");

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
