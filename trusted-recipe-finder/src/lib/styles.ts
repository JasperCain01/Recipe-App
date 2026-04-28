// Centralised style tokens and shared style functions.
// Inline styles are kept for a few reasons:
// 1. No build-step dependency on CSS modules / Tailwind
// 2. Components remain fully self-contained
// 3. Dynamic styling (chip active states, score colours) is easy
//
// Trade-off: no hover states, no media queries beyond JS-driven flexbox.
// These can be added later via a real CSS file if needed.

import type { CSSProperties } from "react";

export const styles = {
  app: {
    minHeight: "100vh",
    background: "#0f0f0f",
    color: "#f5f0e8",
    fontFamily: "Georgia, serif",
    fontSize: "14px",
  },
  header: {
    borderBottom: "1px solid #1e1e1e",
    padding: "1.25rem 1.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  h1: {
    margin: 0,
    fontSize: "1.35rem",
    color: "#e8d5b0",
    letterSpacing: "0.04em",
  },
  sub: {
    margin: "0.2rem 0 0",
    fontSize: "0.65rem",
    color: "#444",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  main: {
    maxWidth: "820px",
    margin: "0 auto",
    padding: "1.5rem",
  },
  label: {
    fontSize: "0.65rem",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "#666",
    display: "block",
    marginBottom: "0.6rem",
  },
  section: { marginBottom: "1.25rem" },
  card: {
    background: "#141414",
    border: "1px solid #1e1e1e",
    borderRadius: "8px",
    padding: "1.5rem",
  },
  textarea: {
    width: "100%",
    background: "#141414",
    border: "1px solid #222",
    color: "#f5f0e8",
    padding: "0.875rem",
    borderRadius: "6px",
    fontFamily: "inherit",
    fontSize: "0.88rem",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
    lineHeight: "1.6",
  },
  input: {
    flex: 1,
    background: "#0f0f0f",
    border: "1px solid #222",
    color: "#f5f0e8",
    padding: "0.65rem 0.875rem",
    borderRadius: "6px",
    fontFamily: "inherit",
    fontSize: "0.85rem",
    outline: "none",
  },
  errorBanner: {
    background: "rgba(248,113,113,0.08)",
    border: "1px solid rgba(248,113,113,0.25)",
    borderRadius: "6px",
    padding: "0.65rem 0.875rem",
    marginBottom: "0.875rem",
    fontSize: "0.8rem",
    color: "#f87171",
  },
} satisfies Record<string, CSSProperties>;

// Helpers that accept arguments
export const chipStyle = (active: boolean, accent?: string): CSSProperties => ({
  padding: "0.35rem 0.85rem",
  border: "1px solid",
  borderRadius: "20px",
  borderColor: active ? (accent || "#e8d5b0") : "#222",
  background: active
    ? `rgba(${accent ? "196,169,110" : "232,213,176"},0.12)`
    : "#141414",
  color: active ? (accent || "#e8d5b0") : "#444",
  cursor: "pointer",
  fontSize: "0.78rem",
  fontFamily: "inherit",
  transition: "all 0.15s",
});

export const primaryBtn = (disabled: boolean): CSSProperties => ({
  width: "100%",
  padding: "0.875rem",
  background: disabled ? "#1a1a1a" : "#e8d5b0",
  color: disabled ? "#444" : "#0f0f0f",
  border: "none",
  borderRadius: "6px",
  fontSize: "0.9rem",
  fontFamily: "inherit",
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: "600",
  letterSpacing: "0.03em",
  transition: "all 0.2s",
});

export type ButtonVariant = "primary" | "default";

export const smBtn = (variant: ButtonVariant): CSSProperties => ({
  padding: "0.45rem 0.9rem",
  border: "1px solid",
  borderColor: variant === "primary" ? "#e8d5b0" : "#2a2a2a",
  background: variant === "primary" ? "#e8d5b0" : "transparent",
  color: variant === "primary" ? "#0f0f0f" : "#555",
  borderRadius: "6px",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "0.75rem",
  whiteSpace: "nowrap",
  transition: "all 0.15s",
});
