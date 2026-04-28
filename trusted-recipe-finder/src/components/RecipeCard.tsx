import type { ReactNode } from "react";
import { styles } from "../lib/styles";
import { scoreColor } from "../lib/utils";
import type { Recipe, Source } from "../lib/types";

interface RecipeCardProps {
  recipe: Recipe;
  source: Source | undefined;
  isVerifying: boolean;
}

/**
 * The expanded recipe card shown when a recipe tab is selected.
 */
export default function RecipeCard({ recipe: r, source: src, isVerifying }: RecipeCardProps) {
  return (
    <div style={styles.card}>
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
          {/* Title + verification badges */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.2rem",
              flexWrap: "wrap",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#e8d5b0" }}>{r.title}</h3>
            {r.verified && (
              <span
                title="Ingredients fetched directly from source"
                style={{
                  fontSize: "0.62rem",
                  color: "#4ade80",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "0.15rem 0.45rem",
                  border: "1px solid rgba(74,222,128,0.3)",
                  borderRadius: "4px",
                }}
              >
                ✓ Verified
              </span>
            )}
            {r.verifyFailed && (
              <span
                title="Could not fetch source page — showing AI-generated ingredients"
                style={{
                  fontSize: "0.62rem",
                  color: "#facc15",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "0.15rem 0.45rem",
                  border: "1px solid rgba(250,204,21,0.3)",
                  borderRadius: "4px",
                }}
              >
                ~ AI-only
              </span>
            )}
            {isVerifying && (
              <span
                style={{
                  fontSize: "0.62rem",
                  color: "#c4a96e",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                ⏳ Verifying...
              </span>
            )}
          </div>
          <p style={{ margin: "0 0 0.65rem", color: "#666", fontSize: "0.8rem" }}>{r.description}</p>
          <div style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap" }}>
            {r.sourceUrl && (
              <a
                href={r.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#c4a96e", fontSize: "0.75rem", textDecoration: "none" }}
              >
                {src?.emoji} {r.source} ↗
              </a>
            )}
            {r.totalTime && <Meta>⏱ {r.totalTime}</Meta>}
            {r.servings && <Meta>🍴 {r.servings}</Meta>}
            {r.difficulty && <Meta>📊 {r.difficulty}</Meta>}
            {r.cuisine && <Meta>🌍 {r.cuisine}</Meta>}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
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

      {r.missingIngredients && r.missingIngredients.length > 0 && (
        <div
          style={{
            background: "rgba(248,113,113,0.07)",
            border: "1px solid rgba(248,113,113,0.18)",
            borderRadius: "5px",
            padding: "0.6rem 0.875rem",
            marginBottom: "1.25rem",
          }}
        >
          <span
            style={{
              fontSize: "0.68rem",
              color: "#f87171",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            You'll need:{" "}
          </span>
          <span style={{ fontSize: "0.8rem", color: "#bbb" }}>{r.missingIngredients.join(", ")}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: "1.5rem" }}>
        <div>
          <p style={styles.label}>Ingredients</p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {r.ingredientsRaw
              ? r.ingredientsRaw.map((line, i) => (
                  <li
                    key={i}
                    style={{
                      padding: "0.35rem 0",
                      borderBottom: "1px solid #1a1a1a",
                      fontSize: "0.8rem",
                      color: "#ccc",
                      lineHeight: "1.5",
                    }}
                  >
                    {line}
                  </li>
                ))
              : r.ingredients?.map((ing, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.35rem 0",
                      borderBottom: "1px solid #1a1a1a",
                      fontSize: "0.8rem",
                    }}
                  >
                    <span style={{ color: "#ccc" }}>{ing.name}</span>
                    <span style={{ color: "#666", marginLeft: "0.75rem" }}>{ing.amount}</span>
                  </li>
                ))}
          </ul>
        </div>
        <div>
          <p style={styles.label}>Method</p>
          <ol style={{ margin: 0, padding: "0 0 0 1.1rem" }}>
            {r.instructions?.map((step, i) => (
              <li
                key={i}
                style={{ marginBottom: "0.6rem", fontSize: "0.82rem", lineHeight: "1.6", color: "#bbb" }}
              >
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function Meta({ children }: { children: ReactNode }) {
  return <span style={{ color: "#555", fontSize: "0.75rem" }}>{children}</span>;
}
