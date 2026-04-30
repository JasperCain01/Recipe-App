import { styles, smBtn } from "../lib/styles";
import type { Source } from "../lib/types";

interface EnrichProgress {
  done: number;
  total: number;
}

interface SourcesTabProps {
  sources: Source[];
  selectedSources: string[];
  newSourceName: string;
  newSourceUrl: string;
  sourceError: string;
  sourceSuccess: string;
  indexing: string | null;
  enriching: string | null;
  enrichProgress: EnrichProgress;
  onNameChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  onAdd: () => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onReindex: (id: string) => void;
  onEnrich: (id: string) => void;
}

export default function SourcesTab({
  sources,
  selectedSources,
  newSourceName,
  newSourceUrl,
  sourceError,
  sourceSuccess,
  indexing,
  enriching,
  enrichProgress,
  onNameChange,
  onUrlChange,
  onAdd,
  onToggle,
  onRemove,
  onReindex,
  onEnrich,
}: SourcesTabProps) {
  return (
    <div>
      <h2 style={{ ...styles.label, marginBottom: "0.3rem" }}>Recipe Sources</h2>
      <p style={{ color: "#757575", fontSize: "0.8rem", marginBottom: "1.5rem" }}>
        Add any recipe website. Indexing builds a URL list; enriching fetches ingredients so you can search by what you have.
      </p>

      {/* Add form */}
      <div style={{ ...styles.card, marginBottom: "1.5rem" }}>
        <p style={{ ...styles.label, marginBottom: "1rem" }}>Add New Source</p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.4fr auto",
            gap: "0.6rem",
            alignItems: "center",
          }}
        >
          <input
            value={newSourceName}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAdd()}
            placeholder="Website name"
            style={styles.input}
          />
          <input
            value={newSourceUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAdd()}
            placeholder="https://example.com"
            style={styles.input}
          />
          <button onClick={onAdd} style={{ ...smBtn("primary"), padding: "0.65rem 1rem" }}>
            Add
          </button>
        </div>
        {sourceError && (
          <p style={{ color: "#B00020", fontSize: "0.75rem", marginTop: "0.6rem", marginBottom: 0 }}>
            ⚠ {sourceError}
          </p>
        )}
        {sourceSuccess && (
          <p style={{ color: "#2E7D32", fontSize: "0.75rem", marginTop: "0.6rem", marginBottom: 0 }}>
            {sourceSuccess}
          </p>
        )}
        <p style={{ color: "#9E9E9E", fontSize: "0.7rem", marginTop: "0.75rem", marginBottom: 0 }}>
          An emoji is auto-assigned based on the site name. URLs are normalised to root domain.
        </p>
      </div>

      {/* Source list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {sources.map((src) => {
          const isIndexing = indexing === src.id;
          const isEnriching = enriching === src.id;
          const hasIndex = src.indexCount > 0;
          const hasEnriched = src.enrichedCount > 0;
          const isActive = selectedSources.includes(src.id);

          return (
            <div
              key={src.id}
              style={{
                background: "#FFFFFF",
                border: "1px solid #E0E0E0",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
              }}
            >
              {/* Title row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{src.emoji}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "#212121", fontSize: "0.88rem", marginBottom: "0.1rem" }}>{src.name}</div>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#9E9E9E",
                        fontSize: "0.72rem",
                        textDecoration: "none",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "block",
                      }}
                    >
                      {src.url}
                    </a>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                  <button
                    onClick={() => onToggle(src.id)}
                    style={{ ...smBtn(isActive ? "primary" : "default"), minWidth: "72px", textAlign: "center" }}
                  >
                    {isActive ? "✓ Active" : "Enable"}
                  </button>
                  <button
                    onClick={() => onRemove(src.id)}
                    title="Remove source"
                    style={{
                      background: "none",
                      border: "1px solid #E0E0E0",
                      color: "#757575",
                      borderRadius: "6px",
                      cursor: "pointer",
                      padding: "0.35rem 0.6rem",
                      fontSize: "0.9rem",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Status rows */}
              <div
                style={{
                  marginTop: "0.6rem",
                  paddingTop: "0.6rem",
                  borderTop: "1px solid #E0E0E0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.45rem",
                }}
              >
                {/* Index status */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.7rem" }}>
                    {isIndexing && <span style={{ color: "#FF8F00" }}>⏳ Indexing recipes…</span>}
                    {!isIndexing && hasIndex && (
                      <span style={{ color: "#2E7D32" }}>
                        ✓ {src.indexCount} recipes indexed
                        {src.indexedAt && ` · ${new Date(src.indexedAt).toLocaleDateString()}`}
                      </span>
                    )}
                    {!isIndexing && !hasIndex && (
                      <span style={{ color: "#9E9E9E" }}>No index yet</span>
                    )}
                  </span>
                  {!isIndexing && (
                    <button
                      onClick={() => onReindex(src.id)}
                      style={{ ...smBtn("default"), fontSize: "0.68rem", padding: "0.3rem 0.6rem" }}
                    >
                      {hasIndex ? "Re-index" : "Index now"}
                    </button>
                  )}
                </div>

                {/* Enrichment status */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.7rem" }}>
                    {isEnriching && (
                      <span style={{ color: "#FF8F00" }}>
                        ⏳ Enriching {enrichProgress.done}/{enrichProgress.total} recipes…
                      </span>
                    )}
                    {!isEnriching && hasEnriched && (
                      <span style={{ color: "#2E7D32" }}>
                        ✓ {src.enrichedCount}/{src.indexCount} recipes enriched
                        {src.enrichedAt && ` · ${new Date(src.enrichedAt).toLocaleDateString()}`}
                      </span>
                    )}
                    {!isEnriching && !hasEnriched && hasIndex && (
                      <span style={{ color: "#757575" }}>Not enriched — ingredient search unavailable</span>
                    )}
                    {!isEnriching && !hasIndex && (
                      <span style={{ color: "#9E9E9E" }}>Index first to enable enrichment</span>
                    )}
                  </span>
                  {!isEnriching && hasIndex && (
                    <button
                      onClick={() => onEnrich(src.id)}
                      style={{
                        ...smBtn("default"),
                        fontSize: "0.68rem",
                        padding: "0.3rem 0.6rem",
                        borderColor: hasEnriched ? "#E0E0E0" : "#00796B",
                        color: hasEnriched ? "#757575" : "#00796B",
                      }}
                    >
                      {hasEnriched ? "Re-enrich" : "Enrich now"}
                    </button>
                  )}
                </div>

                {/* Enrichment progress bar */}
                {isEnriching && enrichProgress.total > 0 && (
                  <div
                    style={{
                      height: "3px",
                      background: "#E0E0E0",
                      borderRadius: "2px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(enrichProgress.done / enrichProgress.total) * 100}%`,
                        background: "#00796B",
                        borderRadius: "2px",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {sources.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "2.5rem 1rem",
              border: "1px dashed #E0E0E0",
              borderRadius: "8px",
            }}
          >
            <p style={{ color: "#757575", fontSize: "0.85rem", margin: "0 0 0.4rem" }}>No sources added yet.</p>
            <p style={{ color: "#9E9E9E", fontSize: "0.75rem", margin: 0 }}>
              Add a website above to get started — try RecipeTin Eats or BBC Good Food.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
