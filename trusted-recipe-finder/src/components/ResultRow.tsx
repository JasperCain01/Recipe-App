import { memo } from "react";
import { scoreColor } from "../lib/utils";
import RecipeCard from "./RecipeCard";
import type { SearchResult } from "../lib/types";

interface ResultRowProps {
  result: SearchResult;
  expanded: boolean;
  onToggleExpand: () => void;
  narrow: boolean;
}

const colStyle = (width: number | string): React.CSSProperties => ({
  width: typeof width === "number" ? `${width}px` : width,
  flexShrink: 0,
});

function Thumbnail({ image, emoji, size = 40 }: { image: string | null; emoji: string; size?: number }) {
  const shared: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "6px",
    flexShrink: 0,
  };
  if (image) {
    return (
      <img
        src={image}
        alt=""
        loading="lazy"
        style={{ ...shared, objectFit: "cover", background: "#EEEEEE" }}
      />
    );
  }
  return (
    <div
      style={{
        ...shared,
        background: "#EEEEEE",
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

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: "0.7rem",
        color: "#757575",
        background: "#F5F5F5",
        borderRadius: "10px",
        padding: "0.15rem 0.55rem",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function ResultRow({ result: r, expanded, onToggleExpand, narrow }: ResultRowProps) {
  return (
    <div>
      {narrow ? (
        <button
          onClick={onToggleExpand}
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            padding: "0.75rem",
            minHeight: "40px",
            background: expanded ? "rgba(93,64,55,0.04)" : "#FFFFFF",
            border: "1px solid",
            borderColor: expanded ? "#BDBDBD" : "#E0E0E0",
            borderRadius: expanded ? "8px 8px 0 0" : "8px",
            cursor: "pointer",
            fontFamily: "inherit",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <Thumbnail image={r.image} emoji={r.sourceEmoji} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: "#212121",
                  fontSize: "0.9rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  lineHeight: "1.3",
                }}
              >
                {r.title}
              </div>
              <div style={{ color: "#9E9E9E", fontSize: "0.7rem", marginTop: "0.15rem" }}>
                {r.sourceEmoji} {r.source}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "1rem", fontWeight: "bold", color: scoreColor(r.matchScore) }}>
                {r.matchScore}%
              </div>
              {r.missingIngredients.length > 0 ? (
                <div style={{ fontSize: "0.68rem", color: "#B00020" }}>{r.missingIngredients.length} missing</div>
              ) : (
                <div style={{ fontSize: "0.68rem", color: "#2E7D32" }}>✓ have all</div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
            <MetaChip>{r.mealType ?? "Unknown meal"}</MetaChip>
            <MetaChip>{r.cuisine ?? "Unknown cuisine"}</MetaChip>
            <MetaChip>{r.totalTime ?? "Unknown time"}</MetaChip>
            <MetaChip>{r.instructionCount > 0 ? `${r.instructionCount} steps` : "Unknown steps"}</MetaChip>
          </div>
        </button>
      ) : (
        <button
          onClick={onToggleExpand}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.65rem 1rem",
            minHeight: "40px",
            background: expanded ? "rgba(93,64,55,0.04)" : "#FFFFFF",
            border: "1px solid",
            borderColor: expanded ? "#BDBDBD" : "#E0E0E0",
            borderRadius: expanded ? "6px 6px 0 0" : "6px",
            cursor: "pointer",
            fontFamily: "inherit",
            textAlign: "left",
          }}
        >
          <Thumbnail image={r.image} emoji={r.sourceEmoji} />

          {/* Recipe + source */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: "#212121",
                fontSize: "0.85rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                lineHeight: "1.3",
              }}
            >
              {r.title}
            </div>
            <div style={{ color: "#9E9E9E", fontSize: "0.68rem", marginTop: "0.1rem" }}>
              {r.sourceEmoji} {r.source}
            </div>
          </div>

          {/* Match % */}
          <div style={{ ...colStyle(52), textAlign: "right", flexShrink: 0 }}>
            <span style={{ fontSize: "0.92rem", fontWeight: "bold", color: scoreColor(r.matchScore) }}>
              {r.matchScore}%
            </span>
          </div>

          {/* Meal type */}
          <div style={{ ...colStyle(96), flexShrink: 0 }}>
            <span style={{ fontSize: "0.75rem", color: r.mealType ? "#757575" : "#BDBDBD" }}>
              {r.mealType ?? "Unknown"}
            </span>
          </div>

          {/* Cuisine */}
          <div style={{ ...colStyle(104), flexShrink: 0 }}>
            <span style={{ fontSize: "0.75rem", color: r.cuisine ? "#757575" : "#BDBDBD" }}>
              {r.cuisine ?? "Unknown"}
            </span>
          </div>

          {/* Time */}
          <div style={{ ...colStyle(88), flexShrink: 0 }}>
            <span style={{ fontSize: "0.75rem", color: r.totalTime ? "#757575" : "#BDBDBD" }}>
              {r.totalTime ?? "Unknown"}
            </span>
          </div>

          {/* Steps */}
          <div style={{ ...colStyle(96), flexShrink: 0 }}>
            <span style={{ fontSize: "0.75rem", color: r.instructionCount > 0 ? "#757575" : "#BDBDBD" }}>
              {r.instructionCount > 0 ? `${r.instructionCount} steps` : "Unknown"}
            </span>
          </div>

          {/* Missing count */}
          <div style={{ ...colStyle(60), flexShrink: 0, textAlign: "right" }}>
            {r.missingIngredients.length > 0 ? (
              <span style={{ fontSize: "0.75rem", color: "#B00020" }}>{r.missingIngredients.length}</span>
            ) : (
              <span style={{ fontSize: "0.75rem", color: "#2E7D32" }}>✓</span>
            )}
          </div>
        </button>
      )}

      {expanded && (
        <div
          style={{
            border: "1px solid #BDBDBD",
            borderTop: "none",
            borderRadius: "0 0 6px 6px",
          }}
        >
          <RecipeCard result={r} />
        </div>
      )}
    </div>
  );
}

export default memo(ResultRow);
