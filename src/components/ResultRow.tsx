import { memo } from "react";
import { Check } from "lucide-react";
import { useTheme } from "../lib/ThemeContext";
import { displayFontFamily, type ThemeTokens } from "../lib/styles";
import FavouriteStar from "./FavouriteStar";
import MatchPill from "./MatchPill";
import RecipeCard from "./RecipeCard";
import type { SearchResult } from "../lib/types";

interface ResultRowProps {
  result: SearchResult;
  expanded: boolean;
  onToggleExpand: () => void;
  isFavourite: boolean;
  onToggleFavourite: () => void;
}

function Thumbnail({ image, emoji, t }: { image: string | null; emoji: string; t: ThemeTokens }) {
  const shared: React.CSSProperties = { width: 40, height: 40, borderRadius: "8px", flexShrink: 0 };
  if (image) {
    return <img src={image} alt="" loading="lazy" style={{ ...shared, objectFit: "cover", background: t.surfaceAlt }} />;
  }
  return (
    <div style={{ ...shared, background: t.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.375rem" }}>
      {emoji}
    </div>
  );
}

function handleActivateKey(e: React.KeyboardEvent, onActivate: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    onActivate();
  }
}

/** Dense single-column list row — the desktop "power user" alternate to the
 *  ResultCard grid (4.4/4.8). No more Meal/Cuisine/Time/Steps/Missing
 *  columns: everything collapses into one quiet meta line under the title. */
function ResultRow({ result: r, expanded, onToggleExpand, isFavourite, onToggleFavourite }: ResultRowProps) {
  const { tokens: t } = useTheme();
  const total = r.ingredientsRaw.length;
  const have = total - r.missingIngredients.length;
  const metaLine = [r.mealType, r.cuisine, r.totalTime, r.instructionCount > 0 ? `${r.instructionCount} steps` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleExpand}
        onKeyDown={(e) => handleActivateKey(e, onToggleExpand)}
        aria-expanded={expanded}
        className={`trf-fade-in${expanded ? "" : " trf-hoverable"}`}
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
          <div style={{ color: t.textFaint, fontSize: "0.75rem", marginTop: "0.1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r.source}{metaLine && ` · ${metaLine}`}
          </div>
        </div>

        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: r.missingIngredients.length === 0 ? t.success : t.textMuted, flexShrink: 0, whiteSpace: "nowrap" }}>
          {r.missingIngredients.length === 0 ? (<><Check size={13} /> have all</>) : `${have} of ${total}`}
        </span>

        <MatchPill score={r.matchScore} size="sm" />

        <FavouriteStar
          isFavourite={isFavourite}
          onToggle={onToggleFavourite}
          title={isFavourite ? `Remove ${r.title} from favourites` : `Add ${r.title} to favourites`}
        />
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

export default memo(ResultRow);
