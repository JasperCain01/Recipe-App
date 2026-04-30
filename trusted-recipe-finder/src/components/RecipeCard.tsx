import { styles } from "../lib/styles";
import { scoreColor } from "../lib/utils";
import type { SearchResult } from "../lib/types";

interface RecipeCardProps {
  result: SearchResult;
}

export default function RecipeCard({ result: r }: RecipeCardProps) {
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
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: scoreColor(r.matchScore) }}>
            {r.matchScore}%
          </div>
          <div
            style={{
              fontSize: "0.6rem",
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
          <span
            style={{
              fontSize: "0.68rem",
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

function Meta({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "#757575", fontSize: "0.75rem" }}>{children}</span>;
}
