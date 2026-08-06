import { useTheme } from "../lib/ThemeContext";
import type { SearchResult } from "../lib/types";

/** The meta-chip line (meal/cuisine/time/steps) shared by ResultCard and
 *  ResultRow — 4.4 collapses these from table columns into one quiet line
 *  under the title, everywhere. */
export default function ResultMetaChips({ result: r }: { result: SearchResult }) {
  const { tokens: t } = useTheme();
  const chip: React.CSSProperties = {
    fontSize: "0.75rem",
    color: t.textMuted,
    background: t.surfaceAlt,
    borderRadius: "999px",
    padding: "0.15rem 0.55rem",
    whiteSpace: "nowrap",
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
      <span style={chip}>{r.mealType ?? "Unknown meal"}</span>
      <span style={chip}>{r.cuisine ?? "Unknown cuisine"}</span>
      <span style={chip}>{r.totalTime ?? "Unknown time"}</span>
      <span style={chip}>{r.instructionCount > 0 ? `${r.instructionCount} steps` : "Unknown steps"}</span>
    </div>
  );
}
