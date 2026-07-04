import type { CSSProperties } from "react";

// MD2 color roles:
//   Primary     #00796B  (Teal 700)    — app bar, buttons, active states
//   On Primary  #FFFFFF               — text/icons on primary surfaces
//   Secondary   #FF8F00  (Amber 800)  — accents, in-progress indicators
//   Surface     #FFFFFF               — cards, sheets, dropdowns
//   Background  #FAFAFA               — page background
//   Error       #B00020               — error states, missing ingredients
//   On Surface text: 87% (#212121) / 60% (#757575) / 38% (#9E9E9E)
//   Dividers:   #E0E0E0

export const styles = {
  app: {
    minHeight: "100vh",
    background: "#FAFAFA",
    color: "#212121",
    fontFamily: "Georgia, serif",
    fontSize: "14px",
  },
  header: {
    background: "#00796B",
    boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
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
    color: "#FFFFFF",
    letterSpacing: "0.04em",
  },
  sub: {
    margin: "0.2rem 0 0",
    fontSize: "0.7rem",
    color: "rgba(255,255,255,0.9)",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  main: {
    maxWidth: "820px",
    margin: "0 auto",
    padding: "1.5rem",
  },
  label: {
    fontSize: "0.7rem",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "#757575",
    display: "block",
    marginBottom: "0.6rem",
  },
  section: { marginBottom: "1.25rem" },
  card: {
    background: "#FFFFFF",
    border: "1px solid #E0E0E0",
    borderRadius: "8px",
    padding: "1.5rem",
  },
  textarea: {
    width: "100%",
    background: "#FFFFFF",
    border: "1px solid #E0E0E0",
    color: "#212121",
    padding: "0.875rem",
    borderRadius: "6px",
    fontFamily: "inherit",
    fontSize: "0.88rem",
    resize: "vertical",
    boxSizing: "border-box",
    lineHeight: "1.6",
  },
  input: {
    flex: 1,
    background: "#FFFFFF",
    border: "1px solid #E0E0E0",
    color: "#212121",
    padding: "0.65rem 0.875rem",
    borderRadius: "6px",
    fontFamily: "inherit",
    fontSize: "0.85rem",
  },
  errorBanner: {
    background: "rgba(176,0,32,0.06)",
    border: "1px solid rgba(176,0,32,0.2)",
    borderRadius: "6px",
    padding: "0.65rem 0.875rem",
    marginBottom: "0.875rem",
    fontSize: "0.8rem",
    color: "#B00020",
  },
} satisfies Record<string, CSSProperties>;

// Helpers that accept arguments
export const chipStyle = (active: boolean, accent?: string): CSSProperties => ({
  padding: "0.35rem 0.85rem",
  border: "1px solid",
  borderRadius: "20px",
  borderColor: active ? (accent || "#00796B") : "#E0E0E0",
  background: active ? "rgba(0,121,107,0.1)" : "#FFFFFF",
  color: active ? (accent || "#00796B") : "#616161",
  cursor: "pointer",
  fontSize: "0.78rem",
  fontFamily: "inherit",
  transition: "all 0.15s",
});

export const primaryBtn = (disabled: boolean): CSSProperties => ({
  width: "100%",
  padding: "0.875rem",
  background: disabled ? "#E0E0E0" : "#00796B",
  color: disabled ? "#9E9E9E" : "#FFFFFF",
  border: "none",
  borderRadius: "6px",
  fontSize: "0.9rem",
  fontFamily: "inherit",
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: "600",
  letterSpacing: "0.03em",
  transition: "all 0.2s",
});

// U10: a11y — visible keyboard-focus outline. Rendered once via a <style> tag
// (see App.tsx) since inline `style` props can't express the :focus-visible
// pseudo-class; the `input`/`textarea` styles above no longer set
// `outline: "none"` so this isn't overridden by a competing inline style.
export const GLOBAL_CSS = `
  :focus-visible {
    outline: 2px solid #00796B;
    outline-offset: 2px;
  }
`;

export type ButtonVariant = "primary" | "default";

export const smBtn = (variant: ButtonVariant): CSSProperties => ({
  padding: "0.45rem 0.9rem",
  border: "1px solid",
  borderColor: variant === "primary" ? "#00796B" : "#E0E0E0",
  background: variant === "primary" ? "#00796B" : "transparent",
  color: variant === "primary" ? "#FFFFFF" : "#757575",
  borderRadius: "6px",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "0.75rem",
  whiteSpace: "nowrap",
  transition: "all 0.15s",
});
