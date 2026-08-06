import { useTheme } from "../lib/ThemeContext";
import { scoreColor } from "../lib/utils";

/** Soft match-score pill — warm-green/honey/neutral, never red (4.4). */
export default function MatchPill({ score, size = "md" }: { score: number; size?: "sm" | "md" }) {
  const { tokens: t } = useTheme();
  const color = scoreColor(score, t);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: t.surfaceAlt,
        color,
        fontWeight: 700,
        borderRadius: "999px",
        padding: size === "sm" ? "0.1rem 0.55rem" : "0.2rem 0.7rem",
        fontSize: size === "sm" ? "0.75rem" : "0.84rem",
        whiteSpace: "nowrap",
      }}
    >
      {score}% match
    </span>
  );
}
