import { useState } from "react";
import { styles } from "../lib/styles";
import { scoreColor } from "../lib/utils";
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

export default function RecipeCard({ result: r, isFavourite, onToggleFavourite }: RecipeCardProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

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
          <h3 style={{ margin: "0 0 0.3rem", fontSize: "1.1rem", color: "#212121" }}>
            <a
              href={r.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#00796B", textDecoration: "none" }}
            >
              {r.title} ↗
            </a>
          </h3>
          <div style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap" }}>
            <span style={{ color: "#555", fontSize: "0.75rem" }}>
              {r.sourceEmoji} {r.source}
            </span>
            {r.totalTime && <Meta>⏱ {r.totalTime}</Meta>}
            {r.servings && <Meta>🍴 {r.servings}</Meta>}
            {r.cuisine && <Meta>🌍 {r.cuisine}</Meta>}
          </div>
        </div>
        <button
          onClick={onToggleFavourite}
          aria-pressed={isFavourite}
          aria-label={isFavourite ? `Remove ${r.title} from favourites` : `Add ${r.title} to favourites`}
          title={isFavourite ? "Remove from favourites" : "Add to favourites"}
          style={{
            background: "none",
            border: "none",
            minWidth: "40px",
            minHeight: "40px",
            color: isFavourite ? "#FF8F00" : "#616161",
            fontSize: "1.3rem",
            cursor: "pointer",
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {isFavourite ? "★" : "☆"}
        </button>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: scoreColor(r.matchScore) }}>
            {r.matchScore}%
          </div>
          <div
            style={{
              fontSize: "0.7rem",
              color: "#444",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            match
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
            borderRadius: "5px",
            marginBottom: "1rem",
          }}
        />
      )}

      {/* Missing ingredients banner */}
      {r.missingIngredients.length > 0 && (
        <div
          style={{
            background: "rgba(176,0,32,0.06)",
            border: "1px solid rgba(176,0,32,0.2)",
            borderRadius: "5px",
            padding: "0.6rem 0.875rem",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ marginBottom: "0.5rem" }}>
            <span
              style={{
                fontSize: "0.7rem",
                color: "#B00020",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              You'll need:{" "}
            </span>
            <span style={{ fontSize: "0.8rem", color: "#212121" }}>
              {r.missingIngredients.join(" · ")}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <button onClick={handleCopy} style={shoppingListBtnStyle}>
              {copyStatus === "copied" ? "✓ Copied" : copyStatus === "failed" ? "Copy failed" : "📋 Copy missing ingredients"}
            </button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button onClick={handleShare} style={shoppingListBtnStyle}>
                📤 Share
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
                padding: "0.3rem 0",
                borderBottom: "1px solid #E0E0E0",
                fontSize: "0.8rem",
                color: isMissing ? "#B00020" : "#212121",
                lineHeight: "1.5",
              }}
            >
              {isMissing ? "✗ " : "✓ "}
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
          display: "inline-block",
          padding: "0.55rem 1.1rem",
          background: "#00796B",
          color: "#FFFFFF",
          borderRadius: "6px",
          fontSize: "0.8rem",
          fontWeight: "600",
          textDecoration: "none",
          fontFamily: "inherit",
        }}
      >
        View full recipe on {r.source} ↗
      </a>
    </div>
  );
}

const shoppingListBtnStyle: React.CSSProperties = {
  minHeight: "40px",
  padding: "0.4rem 0.75rem",
  border: "1px solid rgba(176,0,32,0.3)",
  background: "#FFFFFF",
  color: "#B00020",
  borderRadius: "6px",
  fontFamily: "inherit",
  fontSize: "0.75rem",
  cursor: "pointer",
};

function Meta({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "#757575", fontSize: "0.75rem" }}>{children}</span>;
}
