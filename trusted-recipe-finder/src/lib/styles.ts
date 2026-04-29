import type { CSSProperties } from "react";

export const styles = {
  app: {
    minHeight: "100vh",
    background: "#faf7f2",
    color: "#1c1714",
    fontFamily: "Georgia, serif",
    fontSize: "14px",
  },
  header: {
    borderBottom: "1px solid #ece7de",
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
    color: "#7c5c28",
    letterSpacing: "0.04em",
  },
  sub: {
    margin: "0.2rem 0 0",
    fontSize: "0.65rem",
    color: "#b0a898",
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
    color: "#8c8278",
    display: "block",
    marginBottom: "0.6rem",
  },
  section: { marginBottom: "1.25rem" },
  card: {
    background: "#ffffff",
    border: "1px solid #ece7de",
    borderRadius: "8px",
    padding: "1.5rem",
  },
  textarea: {
    width: "100%",
    background: "#f5f1ea",
    border: "1px solid #ddd5c8",
    color: "#1c1714",
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
    background: "#faf7f2",
    border: "1px solid #ddd5c8",
    color: "#1c1714",
    padding: "0.65rem 0.875rem",
    borderRadius: "6px",
    fontFamily: "inherit",
    fontSize: "0.85rem",
    outline: "none",
  },
  errorBanner: {
    background: "rgba(220,38,38,0.06)",
    border: "1px solid rgba(220,38,38,0.2)",
    borderRadius: "6px",
    padding: "0.65rem 0.875rem",
    marginBottom: "0.875rem",
    fontSize: "0.8rem",
    color: "#dc2626",
  },
} satisfies Record<string, CSSProperties>;

// Helpers that accept arguments
export const chipStyle = (active: boolean, accent?: string): CSSProperties => ({
  padding: "0.35rem 0.85rem",
  border: "1px solid",
  borderRadius: "20px",
  borderColor: active ? (accent || "#7c5c28") : "#ddd5c8",
  background: active
    ? `rgba(${accent ? "124,92,40" : "124,92,40"},0.1)`
    : "#ffffff",
  color: active ? (accent || "#7c5c28") : "#9c9288",
  cursor: "pointer",
  fontSize: "0.78rem",
  fontFamily: "inherit",
  transition: "all 0.15s",
});

export const primaryBtn = (disabled: boolean): CSSProperties => ({
  width: "100%",
  padding: "0.875rem",
  background: disabled ? "#f0ebe2" : "#7c5c28",
  color: disabled ? "#b0a898" : "#ffffff",
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
  borderColor: variant === "primary" ? "#7c5c28" : "#cfc7bc",
  background: variant === "primary" ? "#7c5c28" : "transparent",
  color: variant === "primary" ? "#ffffff" : "#6c6258",
  borderRadius: "6px",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "0.75rem",
  whiteSpace: "nowrap",
  transition: "all 0.15s",
});
