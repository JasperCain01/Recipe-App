import { useState } from "react";
import { Check, X, ExternalLink, Clipboard, Share2 } from "lucide-react";
import { getStyles, displayFontFamily, type ThemeTokens } from "../lib/styles";
import { useTheme } from "../lib/ThemeContext";
import { scoreColor, hexToRgba } from "../lib/utils";
import FavouriteStar from "./FavouriteStar";
import type { SearchResult } from "../lib/types";

interface RecipeCardProps {
  result: SearchResult;
  isFavourite: boolean;
  onToggleFavourite: () => void;
}

function shoppingListText(r: SearchResult): string {
  return `Shopping list for ${r.title}:\n${r.missingIngredients.map((m) => `- ${m}`).join("\n")}`;
}

/** Copies text to the clipboard, falling back to a hidden textarea + execCommand
 *  for browsers/contexts without the async Clipboard API. */
async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the textarea fallback
    }
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function shoppingListBtnStyle(t: ThemeTokens): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    minHeight: "40px",
    padding: "0.4rem 0.75rem",
    border: `1px solid ${hexToRgba(t.secondaryAccent, 0.35)}`,
    background: t.surface,
    color: t.secondaryAccent,
    borderRadius: "8px",
    fontFamily: "inherit",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
  };
}

export default function RecipeCard({ result: r, isFavourite, onToggleFavourite }: RecipeCardProps) {
  const { tokens: t } = useTheme();
  const styles = getStyles(t);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  const total = r.ingredientsRaw.length;
  const have = total - r.missingIngredients.length;

  const handleCopy = async () => {
    const ok = await copyToClipboard(shoppingListText(r));
    setCopyStatus(ok ? "copied" : "failed");
    setTimeout(() => setCopyStatus("idle"), 2000);
  };

  const handleShare = async () => {
    try {
      await navigator.share({ title: `Shopping list — ${r.title}`, text: shoppingListText(r) });
    } catch {
      // user cancelled the share sheet — nothing to do
    }
  };

  return (
    <div style={styles.card}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: "0 0 0.3rem", fontFamily: displayFontFamily, fontSize: "1.125rem", color: t.text }}>
            <a
              href={r.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: t.accent, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            >
              {r.title} <ExternalLink size={14} />
            </a>
          </h3>
          <div style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap" }}>
            <span style={{ color: t.textMuted, fontSize: "0.75rem" }}>
              {r.sourceEmoji} {r.source}
            </span>
            {r.totalTime && <Meta t={t}>⏱ {r.totalTime}</Meta>}
            {r.servings && <Meta t={t}>🍴 {r.servings}</Meta>}
            {r.cuisine && <Meta t={t}>🌍 {r.cuisine}</Meta>}
          </div>
        </div>
        <FavouriteStar
          isFavourite={isFavourite}
          onToggle={onToggleFavourite}
          title={isFavourite ? `Remove ${r.title} from favourites` : `Add ${r.title} to favourites`}
          size={22}
        />
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "1.375rem", fontWeight: "bold", color: scoreColor(r.matchScore, t) }}>
            {r.matchScore}%
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: t.textMuted }}>
            {r.missingIngredients.length === 0 ? (<><Check size={13} /> have everything</>) : `${have} of ${total} ingredients`}
          </div>
        </div>
      </div>

      {/* Recipe image */}
      {r.image && (
        <img
          src={r.image}
          alt={r.title}
          style={{
            width: "100%",
            height: "180px",
            objectFit: "cover",
            borderRadius: "8px",
            marginBottom: "1rem",
          }}
        />
      )}

      {/* Shopping list — friendly saffron framing, not a danger banner (4.4) */}
      {r.missingIngredients.length > 0 && (
        <div
          style={{
            background: hexToRgba(t.secondaryAccent, 0.1),
            border: `1px solid ${hexToRgba(t.secondaryAccent, 0.3)}`,
            borderRadius: "8px",
            padding: "0.6rem 0.875rem",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: t.secondaryAccent, fontWeight: 600 }}>
              Just need:{" "}
            </span>
            <span style={{ fontSize: "0.84rem", color: t.text }}>
              {r.missingIngredients.join(" · ")}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <button onClick={handleCopy} style={shoppingListBtnStyle(t)}>
              {copyStatus === "copied" ? <Check size={14} /> : <Clipboard size={14} />}
              {copyStatus === "copied" ? "Copied" : copyStatus === "failed" ? "Copy failed" : "Copy list"}
            </button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button onClick={handleShare} style={shoppingListBtnStyle(t)}>
                <Share2 size={14} /> Share
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ingredients list */}
      <p style={styles.label}>All ingredients</p>
      <ul style={{ margin: "0 0 1rem", padding: 0, listStyle: "none" }}>
        {r.ingredientsRaw.map((line, i) => {
          const isMissing = r.missingIngredients.includes(line);
          return (
            <li
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.3rem 0",
                borderBottom: `1px solid ${t.border}`,
                fontSize: "0.84rem",
                color: isMissing ? t.secondaryAccent : t.text,
                lineHeight: "1.5",
              }}
            >
              {isMissing ? <X size={14} style={{ flexShrink: 0 }} /> : <Check size={14} style={{ flexShrink: 0, color: t.success }} />}
              {line}
            </li>
          );
        })}
      </ul>

      <a
        href={r.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.55rem 1.1rem",
          background: t.accentSolid,
          color: t.onAccent,
          borderRadius: "8px",
          fontSize: "0.84rem",
          fontWeight: "600",
          textDecoration: "none",
          fontFamily: "inherit",
        }}
      >
        View full recipe on {r.source} <ExternalLink size={14} />
      </a>
    </div>
  );
}

function Meta({ children, t }: { children: React.ReactNode; t: ThemeTokens }) {
  return <span style={{ color: t.textMuted, fontSize: "0.75rem" }}>{children}</span>;
}
