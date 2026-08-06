import { memo } from "react";
import { Check } from "lucide-react";
import { useTheme } from "../lib/ThemeContext";
import { displayFontFamily, type ThemeTokens } from "../lib/styles";
import FavouriteStar from "./FavouriteStar";
import MatchPill from "./MatchPill";
import ResultMetaChips from "./ResultMetaChips";
import RecipeCard from "./RecipeCard";
import type { SearchResult } from "../lib/types";

interface ResultCardProps {
  result: SearchResult;
  expanded: boolean;
  onToggleExpand: () => void;
  isFavourite: boolean;
  onToggleFavourite: () => void;
  animationDelay?: string;
}

function handleActivateKey(e: React.KeyboardEvent, onActivate: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    onActivate();
  }
}

/** Image-topped result card — the default "menu, not spreadsheet" results
 *  view (4.4). Used at every breakpoint inside a responsive CSS grid, so one
 *  component gives phones a single column, tablets ~2, and desktop ~3+. */
function ResultCard({ result: r, expanded, onToggleExpand, isFavourite, onToggleFavourite, animationDelay }: ResultCardProps) {
  const { tokens: t } = useTheme();
  const total = r.ingredientsRaw.length;
  const have = total - r.missingIngredients.length;

  return (
    <div style={{ gridColumn: expanded ? "1 / -1" : undefined }}>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleExpand}
        onKeyDown={(e) => handleActivateKey(e, onToggleExpand)}
        aria-expanded={expanded}
        className={`trf-fade-in${expanded ? "" : " trf-hoverable"}`}
        style={{
          ...(animationDelay ? { animationDelay } : {}),
          display: "flex",
          flexDirection: "column",
          background: expanded ? t.highlightBg : t.surface,
          border: expanded ? `1px solid ${t.borderStrong}` : "none",
          boxShadow: expanded ? "none" : t.shadowSoft,
          borderRadius: expanded ? "12px 12px 0 0" : "12px",
          overflow: "hidden",
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
        }}
      >
        <CardImage image={r.image} emoji={r.sourceEmoji} t={t} />
        <div style={{ padding: "0.75rem 0.9rem 0.9rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: t.text,
                  fontFamily: displayFontFamily,
                  fontSize: "0.94rem",
                  lineHeight: "1.3",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {r.title}
              </div>
              <div style={{ color: t.textFaint, fontSize: "0.75rem", marginTop: "0.15rem" }}>
                {r.sourceEmoji} {r.source}
              </div>
            </div>
            <FavouriteStar
              isFavourite={isFavourite}
              onToggle={onToggleFavourite}
              title={isFavourite ? `Remove ${r.title} from favourites` : `Add ${r.title} to favourites`}
            />
          </div>

          <ResultMetaChips result={r} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginTop: "0.1rem" }}>
            <MatchPill score={r.matchScore} size="sm" />
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: r.missingIngredients.length === 0 ? t.success : t.textMuted }}>
              {r.missingIngredients.length === 0 ? (<><Check size={13} /> have everything</>) : `have ${have} of ${total}`}
            </span>
          </div>
        </div>
      </div>

      <div className={`trf-collapse${expanded ? " trf-collapse-open" : ""}`}>
        <div>
          {expanded && (
            <div style={{ border: `1px solid ${t.borderStrong}`, borderTop: "none", borderRadius: "0 0 12px 12px" }}>
              <RecipeCard result={r} isFavourite={isFavourite} onToggleFavourite={onToggleFavourite} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CardImage({ image, emoji, t }: { image: string | null; emoji: string; t: ThemeTokens }) {
  const shared: React.CSSProperties = { width: "100%", height: "150px", flexShrink: 0 };
  if (image) {
    return <img src={image} alt="" loading="lazy" style={{ ...shared, objectFit: "cover", background: t.surfaceAlt }} />;
  }
  return (
    <div
      style={{
        ...shared,
        background: t.surfaceAlt,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "2.5rem",
      }}
    >
      {emoji}
    </div>
  );
}

export default memo(ResultCard);
