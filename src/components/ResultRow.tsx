import { memo } from "react";
import { scoreColor } from "../lib/utils";
import { useTheme } from "../lib/ThemeContext";
import { displayFontFamily, type ThemeTokens } from "../lib/styles";
import RecipeCard from "./RecipeCard";
import type { SearchResult } from "../lib/types";

interface ResultRowProps {
  result: SearchResult;
  expanded: boolean;
  onToggleExpand: () => void;
  narrow: boolean;
  isFavourite: boolean;
  onToggleFavourite: () => void;
}

const colStyle = (width: number | string): React.CSSProperties => ({
  width: typeof width === "number" ? `${width}px` : width,
  flexShrink: 0,
});

function Thumbnail({ image, emoji, size = 40, t }: { image: string | null; emoji: string; size?: number; t: ThemeTokens }) {
  const shared: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "8px",
    flexShrink: 0,
  };
  if (image) {
    return (
      <img
        src={image}
        alt=""
        loading="lazy"
        style={{ ...shared, objectFit: "cover", background: t.surfaceAlt }}
      />
    );
  }
  return (
    <div
      style={{
        ...shared,
        background: t.surfaceAlt,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: `${Math.round(size * 0.55)}px`,
      }}
    >
      {emoji}
    </div>
  );
}

function StarButton({ isFavourite, onToggle, title, t }: { isFavourite: boolean; onToggle: () => void; title: string; t: ThemeTokens }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      aria-pressed={isFavourite}
      aria-label={title}
      title={title}
      style={{
        background: "none",
        border: "none",
        minWidth: "40px",
        minHeight: "40px",
        color: isFavourite ? t.secondaryAccent : t.textFaint,
        fontSize: "1.125rem",
        cursor: "pointer",
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {isFavourite ? "★" : "☆"}
    </button>
  );
}

function MetaChip({ children, t }: { children: React.ReactNode; t: ThemeTokens }) {
  return (
    <span
      style={{
        fontSize: "0.75rem",
        color: t.textMuted,
        background: t.surfaceAlt,
        borderRadius: "999px",
        padding: "0.15rem 0.55rem",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function handleActivateKey(e: React.KeyboardEvent, onActivate: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    onActivate();
  }
}

function ResultRow({ result: r, expanded, onToggleExpand, narrow, isFavourite, onToggleFavourite }: ResultRowProps) {
  const { tokens: t } = useTheme();
  const favouriteTitle = isFavourite ? `Remove ${r.title} from favourites` : `Add ${r.title} to favourites`;

  return (
    <div>
      {narrow ? (
        <div
          role="button"
          tabIndex={0}
          onClick={onToggleExpand}
          onKeyDown={(e) => handleActivateKey(e, onToggleExpand)}
          aria-expanded={expanded}
          className={expanded ? undefined : "trf-hoverable"}
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            padding: "0.75rem",
            minHeight: "40px",
            background: expanded ? t.highlightBg : t.surface,
            border: expanded ? `1px solid ${t.borderStrong}` : "none",
            boxShadow: expanded ? "none" : t.shadowSoft,
            borderRadius: expanded ? "12px 12px 0 0" : "12px",
            cursor: "pointer",
            fontFamily: "inherit",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <Thumbnail image={r.image} emoji={r.sourceEmoji} t={t} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: t.text,
                  fontFamily: displayFontFamily,
                  fontSize: "0.94rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  lineHeight: "1.3",
                }}
              >
                {r.title}
              </div>
              <div style={{ color: t.textFaint, fontSize: "0.75rem", marginTop: "0.15rem" }}>
                {r.sourceEmoji} {r.source}
              </div>
            </div>
            <StarButton isFavourite={isFavourite} onToggle={onToggleFavourite} title={favouriteTitle} t={t} />
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "1rem", fontWeight: "bold", color: scoreColor(r.matchScore, t) }}>
                {r.matchScore}%
              </div>
              {r.missingIngredients.length > 0 ? (
                <div style={{ fontSize: "0.75rem", color: t.danger }}>{r.missingIngredients.length} missing</div>
              ) : (
                <div style={{ fontSize: "0.75rem", color: t.success }}>✓ have all</div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
            <MetaChip t={t}>{r.mealType ?? "Unknown meal"}</MetaChip>
            <MetaChip t={t}>{r.cuisine ?? "Unknown cuisine"}</MetaChip>
            <MetaChip t={t}>{r.totalTime ?? "Unknown time"}</MetaChip>
            <MetaChip t={t}>{r.instructionCount > 0 ? `${r.instructionCount} steps` : "Unknown steps"}</MetaChip>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={onToggleExpand}
          onKeyDown={(e) => handleActivateKey(e, onToggleExpand)}
          aria-expanded={expanded}
          className={expanded ? undefined : "trf-hoverable"}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.65rem 1rem",
            minHeight: "40px",
            background: expanded ? t.highlightBg : t.surface,
            border: expanded ? `1px solid ${t.borderStrong}` : "none",
            boxShadow: expanded ? "none" : t.shadowSoft,
            borderRadius: expanded ? "12px 12px 0 0" : "12px",
            cursor: "pointer",
            fontFamily: "inherit",
            textAlign: "left",
          }}
        >
          <Thumbnail image={r.image} emoji={r.sourceEmoji} t={t} />

          {/* Recipe + source */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: t.text,
                fontFamily: displayFontFamily,
                fontSize: "0.84rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                lineHeight: "1.3",
              }}
            >
              {r.title}
            </div>
            <div style={{ color: t.textFaint, fontSize: "0.75rem", marginTop: "0.1rem" }}>
              {r.sourceEmoji} {r.source}
            </div>
          </div>

          <StarButton isFavourite={isFavourite} onToggle={onToggleFavourite} title={favouriteTitle} t={t} />

          {/* Match % */}
          <div style={{ ...colStyle(52), textAlign: "right", flexShrink: 0 }}>
            <span style={{ fontSize: "0.94rem", fontWeight: "bold", color: scoreColor(r.matchScore, t) }}>
              {r.matchScore}%
            </span>
          </div>

          {/* Meal type */}
          <div style={{ ...colStyle(96), flexShrink: 0 }}>
            <span style={{ fontSize: "0.75rem", color: r.mealType ? t.textMuted : t.textFaint }}>
              {r.mealType ?? "Unknown"}
            </span>
          </div>

          {/* Cuisine */}
          <div style={{ ...colStyle(104), flexShrink: 0 }}>
            <span style={{ fontSize: "0.75rem", color: r.cuisine ? t.textMuted : t.textFaint }}>
              {r.cuisine ?? "Unknown"}
            </span>
          </div>

          {/* Time */}
          <div style={{ ...colStyle(88), flexShrink: 0 }}>
            <span style={{ fontSize: "0.75rem", color: r.totalTime ? t.textMuted : t.textFaint }}>
              {r.totalTime ?? "Unknown"}
            </span>
          </div>

          {/* Steps */}
          <div style={{ ...colStyle(96), flexShrink: 0 }}>
            <span style={{ fontSize: "0.75rem", color: r.instructionCount > 0 ? t.textMuted : t.textFaint }}>
              {r.instructionCount > 0 ? `${r.instructionCount} steps` : "Unknown"}
            </span>
          </div>

          {/* Missing count */}
          <div style={{ ...colStyle(60), flexShrink: 0, textAlign: "right" }}>
            {r.missingIngredients.length > 0 ? (
              <span style={{ fontSize: "0.75rem", color: t.danger }}>{r.missingIngredients.length}</span>
            ) : (
              <span style={{ fontSize: "0.75rem", color: t.success }}>✓</span>
            )}
          </div>
        </div>
      )}

      {expanded && (
        <div
          style={{
            border: `1px solid ${t.borderStrong}`,
            borderTop: "none",
            borderRadius: "0 0 12px 12px",
          }}
        >
          <RecipeCard result={r} isFavourite={isFavourite} onToggleFavourite={onToggleFavourite} />
        </div>
      )}
    </div>
  );
}

export default memo(ResultRow);
