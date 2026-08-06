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
  surfaceElevated: string;
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
  shadowSoft: string;
  headerBg: string;
  onHeader: string;
  onHeaderMuted: string;
  navActiveBorder: string;
  navInactiveBorder: string;
  navActiveBg: string;
  highlightBg: string;
}

export const lightTokens: ThemeTokens = {
  background: "#FAF5EE",
  surface: "#FFFDF9",
  surfaceAlt: "#F3ECE2",
  surfaceElevated: "#FFFFFF",
  border: "#E7DDD0",
  borderStrong: "#CFC2B0",
  text: "#2E2620",
  textMuted: "#6B5D4F",
  textFaint: "#79695A",
  accent: "#B4512A",
  accentSolid: "#B4512A",
  accentTint: "rgba(180,81,42,0.10)",
  accentBorder: "rgba(180,81,42,0.35)",
  onAccent: "#FFFFFF",
  secondaryAccent: "#A16207",
  danger: "#B3341F",
  dangerBg: "rgba(179,52,31,0.07)",
  dangerBorder: "rgba(179,52,31,0.25)",
  success: "#4E6B44",
  scoreMid: "#A16207",
  scoreLow: "#6B5D4F",
  shadow: "rgba(62,48,35,0.16)",
  shadowSoft: "0 2px 8px rgba(62,48,35,0.08)",
  headerBg: "#FFFDF9",
  onHeader: "#2E2620",
  onHeaderMuted: "#6B5D4F",
  navActiveBorder: "#B4512A",
  navInactiveBorder: "#E7DDD0",
  navActiveBg: "rgba(180,81,42,0.10)",
  highlightBg: "rgba(180,81,42,0.05)",
};

export const darkTokens: ThemeTokens = {
  background: "#191512",
  surface: "#221D18",
  surfaceAlt: "#2C2620",
  surfaceElevated: "#322B24",
  border: "#3A322A",
  borderStrong: "#52463A",
  text: "#EFE7DC",
  textMuted: "#B5A897",
  textFaint: "#978A7A",
  accent: "#E08B60",
  accentSolid: "#B4512A",
  accentTint: "rgba(224,139,96,0.14)",
  accentBorder: "rgba(224,139,96,0.35)",
  onAccent: "#FFFFFF",
  secondaryAccent: "#E8A33D",
  danger: "#E57357",
  dangerBg: "rgba(229,115,87,0.12)",
  dangerBorder: "rgba(229,115,87,0.30)",
  success: "#9CB287",
  scoreMid: "#E8A33D",
  scoreLow: "#B5A897",
  shadow: "rgba(0,0,0,0.40)",
  shadowSoft: "0 2px 8px rgba(0,0,0,0.35)",
  headerBg: "#221D18",
  onHeader: "#EFE7DC",
  onHeaderMuted: "#B5A897",
  navActiveBorder: "#E08B60",
  navInactiveBorder: "#3A322A",
  navActiveBg: "rgba(224,139,96,0.14)",
  highlightBg: "rgba(224,139,96,0.07)",
};

// ─── Typography ──────────────────────────────────────────────────────────
// Body/UI: humanist sans, self-hosted via @fontsource-variable (imported once
// in main.tsx). Display serif (Fraunces) is reserved for the header h1 and
// recipe titles only — see RecipeCard.tsx / ResultRow.tsx.
export const bodyFontFamily = "'Nunito Sans Variable', system-ui, -apple-system, 'Segoe UI', sans-serif";
export const displayFontFamily = "'Fraunces Variable', Georgia, serif";

// ─── Shared style objects, built from the active theme's tokens ────────────

export const getStyles = (t: ThemeTokens) =>
  ({
    app: {
      minHeight: "100vh",
      background: t.background,
      color: t.text,
      fontFamily: bodyFontFamily,
      fontSize: "16px",
    },
    header: {
      background: t.headerBg,
      borderBottom: `1px solid ${t.border}`,
      padding: "1.25rem 1.5rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "0.75rem",
    },
    h1: {
      margin: 0,
      fontFamily: displayFontFamily,
      fontSize: "1.375rem",
      color: t.onHeader,
    },
    main: {
      // 4.8: widened from 820px so the results grid/table can breathe on
      // desktop instead of fighting for space in a form-width column.
      maxWidth: "1100px",
      margin: "0 auto",
      padding: "1.5rem",
      // Phones get a bottom tab bar (see Header.tsx) — keep the last bit of
      // content clear of it.
      paddingBottom: "calc(1.5rem + var(--trf-bottom-nav-space, 0px))",
    },
    label: {
      fontSize: "0.84rem",
      fontWeight: 600,
      letterSpacing: "0.01em",
      color: t.textMuted,
      display: "block",
      marginBottom: "0.6rem",
    },
    section: { marginBottom: "1.25rem" },
    card: {
      background: t.surface,
      border: `1px solid ${t.borderStrong}`,
      borderRadius: "12px",
      padding: "1.5rem",
    },
    textarea: {
      width: "100%",
      background: t.surface,
      border: `1px solid ${t.border}`,
      color: t.text,
      padding: "0.875rem",
      borderRadius: "8px",
      fontFamily: "inherit",
      fontSize: "16px",
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
      borderRadius: "8px",
      fontFamily: "inherit",
      fontSize: "16px",
    },
    errorBanner: {
      background: t.dangerBg,
      border: `1px solid ${t.dangerBorder}`,
      borderRadius: "8px",
      padding: "0.65rem 0.875rem",
      marginBottom: "0.875rem",
      fontSize: "0.84rem",
      color: t.danger,
    },
  }) satisfies Record<string, CSSProperties>;

// Helpers that accept arguments
export const chipStyle = (t: ThemeTokens, active: boolean, accent?: string): CSSProperties => ({
  padding: "0.35rem 0.85rem",
  border: "1px solid",
  borderRadius: "999px",
  borderColor: active ? (accent || t.accent) : t.border,
  background: active ? t.accentTint : t.surface,
  color: active ? (accent || t.accent) : t.textFaint,
  cursor: "pointer",
  fontSize: "0.75rem",
  fontFamily: "inherit",
  transition: "all 0.15s",
});

export const primaryBtn = (t: ThemeTokens, disabled: boolean): CSSProperties => ({
  width: "100%",
  padding: "0.875rem",
  background: disabled ? t.border : t.accentSolid,
  color: disabled ? t.textFaint : t.onAccent,
  border: "none",
  borderRadius: "8px",
  fontSize: "0.94rem",
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
  borderRadius: "8px",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "0.75rem",
  whiteSpace: "nowrap",
  transition: "all 0.15s",
});

/** A 40px-target, icon-only button (theme toggle, star, remove, overflow menu…). */
export const iconBtn = (t: ThemeTokens, active = false, activeColor?: string): CSSProperties => ({
  background: "none",
  border: "none",
  minWidth: "40px",
  minHeight: "40px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: active ? (activeColor ?? t.accent) : t.textMuted,
  cursor: "pointer",
  borderRadius: "8px",
  transition: "background 0.15s ease, color 0.15s ease",
});

/** A compact select-style control (sort dropdown, quantised threshold…). */
export const selectStyle = (t: ThemeTokens): CSSProperties => ({
  background: t.surface,
  border: `1px solid ${t.border}`,
  color: t.text,
  borderRadius: "8px",
  padding: "0.4rem 0.6rem",
  fontFamily: "inherit",
  fontSize: "0.84rem",
  cursor: "pointer",
  minHeight: "40px",
});

// U10: a11y — visible keyboard-focus outline. Rendered once via a <style> tag
// (see App.tsx) since inline `style` props can't express the :focus-visible
// pseudo-class; the `input`/`textarea` styles above no longer set
// `outline: "none"` so this isn't overridden by a competing inline style.
//
// The same limitation applies to the soft-depth hover treatment (A.3) and the
// motion system (4.7) below — :hover, :active and @keyframes can't be
// expressed as plain inline style props, so they live in this one <style> tag.
export const globalCss = (t: ThemeTokens): string => `
  :focus-visible {
    outline: 2px solid ${t.accent};
    outline-offset: 2px;
  }
  .trf-hoverable {
    transition: background 0.15s ease, box-shadow 0.15s ease;
  }
  .trf-hoverable:hover {
    background: ${t.surfaceElevated};
    box-shadow: 0 4px 14px ${t.shadow};
  }

  /* 4.7 motion — consistent press-down + transition on every button/link */
  .trf-app button, .trf-app a {
    transition: background 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
  }
  .trf-app button:not(:disabled):active {
    transform: translateY(1px);
  }

  /* Star favourite toggle "pop" */
  @keyframes trf-pop {
    0% { transform: scale(1); }
    45% { transform: scale(1.35); }
    100% { transform: scale(1); }
  }
  .trf-pop { animation: trf-pop 0.2s ease; }

  /* Result card/row entrance — staggered via an inline animation-delay */
  @keyframes trf-fade-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .trf-fade-in { animation: trf-fade-in 0.25s ease both; }

  /* Row expand/collapse height animation (grid-rows trick — no JS measuring) */
  .trf-collapse {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.2s ease-out;
  }
  .trf-collapse.trf-collapse-open { grid-template-rows: 1fr; }
  .trf-collapse > div { overflow: hidden; min-height: 0; }

  /* Loading spinner (used with lucide's Loader2) */
  @keyframes trf-spin { to { transform: rotate(360deg); } }
  .trf-spin { animation: trf-spin 1s linear infinite; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* 4.6/4.8: bottom tab bar reserves space on phones so content can't hide behind it */
  @media (max-width: 640px) {
    :root { --trf-bottom-nav-space: 64px; }
  }
`;
