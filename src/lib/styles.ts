import type { CSSProperties } from "react";

// ─── Theme tokens (U12: dark mode) ──────────────────────────────────────────
// Every color used anywhere in the app should come from these tokens rather
// than a literal hex/rgba value, so the light/dark palettes stay the single
// source of truth. (Exception: ErrorBoundary.tsx intentionally keeps its own
// fixed dark palette — it must render correctly even if theme context itself
// is what's broken.)

export interface ThemeTokens {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentSolid: string;
  accentTint: string;
  accentBorder: string;
  onAccent: string;
  secondaryAccent: string;
  danger: string;
  dangerBg: string;
  dangerBorder: string;
  success: string;
  scoreMid: string;
  scoreLow: string;
  shadow: string;
  headerBg: string;
  onHeader: string;
  onHeaderMuted: string;
  navActiveBorder: string;
  navInactiveBorder: string;
  navActiveBg: string;
  highlightBg: string;
}

export const lightTokens: ThemeTokens = {
  background: "#FAFAFA",
  surface: "#FFFFFF",
  surfaceAlt: "#F5F5F5",
  border: "#E0E0E0",
  borderStrong: "#BDBDBD",
  text: "#212121",
  textMuted: "#757575",
  textFaint: "#616161",
  accent: "#00796B",
  accentSolid: "#00796B",
  accentTint: "rgba(0,121,107,0.1)",
  accentBorder: "rgba(0,121,107,0.3)",
  onAccent: "#FFFFFF",
  secondaryAccent: "#FF8F00",
  danger: "#B00020",
  dangerBg: "rgba(176,0,32,0.06)",
  dangerBorder: "rgba(176,0,32,0.2)",
  success: "#2E7D32",
  scoreMid: "#E65100",
  scoreLow: "#C62828",
  shadow: "rgba(0,0,0,0.15)",
  headerBg: "#00796B",
  onHeader: "#FFFFFF",
  onHeaderMuted: "rgba(255,255,255,0.9)",
  navActiveBorder: "#FFFFFF",
  navInactiveBorder: "rgba(255,255,255,0.35)",
  navActiveBg: "rgba(255,255,255,0.18)",
  highlightBg: "rgba(93,64,55,0.04)",
};

export const darkTokens: ThemeTokens = {
  background: "#121212",
  surface: "#1E1E1E",
  surfaceAlt: "#2A2A2A",
  border: "#383838",
  borderStrong: "#4A4A4A",
  text: "#E8E8E8",
  textMuted: "#AAAAAA",
  textFaint: "#8A8A8A",
  accent: "#4DB6AC",
  accentSolid: "#00796B",
  accentTint: "rgba(77,182,172,0.15)",
  accentBorder: "rgba(77,182,172,0.35)",
  onAccent: "#FFFFFF",
  secondaryAccent: "#FFB74D",
  danger: "#EF5350",
  dangerBg: "rgba(239,83,80,0.12)",
  dangerBorder: "rgba(239,83,80,0.3)",
  success: "#66BB6A",
  scoreMid: "#FFA726",
  scoreLow: "#EF5350",
  shadow: "rgba(0,0,0,0.5)",
  headerBg: "#00695C",
  onHeader: "#FFFFFF",
  onHeaderMuted: "rgba(255,255,255,0.9)",
  navActiveBorder: "#FFFFFF",
  navInactiveBorder: "rgba(255,255,255,0.35)",
  navActiveBg: "rgba(255,255,255,0.18)",
  highlightBg: "rgba(255,255,255,0.06)",
};

// ─── Shared style objects, built from the active theme's tokens ────────────

export const getStyles = (t: ThemeTokens) =>
  ({
    app: {
      minHeight: "100vh",
      background: t.background,
      color: t.text,
      fontFamily: "Georgia, serif",
      fontSize: "14px",
    },
    header: {
      background: t.headerBg,
      boxShadow: `0 2px 4px ${t.shadow}`,
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
      color: t.onHeader,
      letterSpacing: "0.04em",
    },
    sub: {
      margin: "0.2rem 0 0",
      fontSize: "0.7rem",
      color: t.onHeaderMuted,
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
      color: t.textMuted,
      display: "block",
      marginBottom: "0.6rem",
    },
    section: { marginBottom: "1.25rem" },
    card: {
      background: t.surface,
      border: `1px solid ${t.border}`,
      borderRadius: "8px",
      padding: "1.5rem",
    },
    textarea: {
      width: "100%",
      background: t.surface,
      border: `1px solid ${t.border}`,
      color: t.text,
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
      background: t.surface,
      border: `1px solid ${t.border}`,
      color: t.text,
      padding: "0.65rem 0.875rem",
      borderRadius: "6px",
      fontFamily: "inherit",
      fontSize: "0.85rem",
    },
    errorBanner: {
      background: t.dangerBg,
      border: `1px solid ${t.dangerBorder}`,
      borderRadius: "6px",
      padding: "0.65rem 0.875rem",
      marginBottom: "0.875rem",
      fontSize: "0.8rem",
      color: t.danger,
    },
  }) satisfies Record<string, CSSProperties>;

// Helpers that accept arguments
export const chipStyle = (t: ThemeTokens, active: boolean, accent?: string): CSSProperties => ({
  padding: "0.35rem 0.85rem",
  border: "1px solid",
  borderRadius: "20px",
  borderColor: active ? (accent || t.accent) : t.border,
  background: active ? t.accentTint : t.surface,
  color: active ? (accent || t.accent) : t.textFaint,
  cursor: "pointer",
  fontSize: "0.78rem",
  fontFamily: "inherit",
  transition: "all 0.15s",
});

export const primaryBtn = (t: ThemeTokens, disabled: boolean): CSSProperties => ({
  width: "100%",
  padding: "0.875rem",
  background: disabled ? t.border : t.accentSolid,
  color: disabled ? t.textFaint : t.onAccent,
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

export const smBtn = (t: ThemeTokens, variant: ButtonVariant): CSSProperties => ({
  padding: "0.45rem 0.9rem",
  border: "1px solid",
  borderColor: variant === "primary" ? t.accentSolid : t.border,
  background: variant === "primary" ? t.accentSolid : "transparent",
  color: variant === "primary" ? t.onAccent : t.textMuted,
  borderRadius: "6px",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "0.75rem",
  whiteSpace: "nowrap",
  transition: "all 0.15s",
});

// U10: a11y — visible keyboard-focus outline. Rendered once via a <style> tag
// (see App.tsx) since inline `style` props can't express the :focus-visible
// pseudo-class; the `input`/`textarea` styles above no longer set
// `outline: "none"` so this isn't overridden by a competing inline style.
export const globalCss = (t: ThemeTokens): string => `
  :focus-visible {
    outline: 2px solid ${t.accent};
    outline-offset: 2px;
  }
`;
