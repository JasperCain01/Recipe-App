import { getStyles, smBtn } from "../lib/styles";
import { useTheme } from "../lib/ThemeContext";
import type { SourceMeta } from "../lib/types";

interface EnrichProgress {
  done: number;
  total: number;
}

interface SourcesTabProps {
  sources: SourceMeta[];
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
  onCancelEnrich: () => void;
  onHide: (id: string) => void;
}

function progressBarStyle(t: { border: string }): React.CSSProperties {
  return { height: "6px", background: t.border, borderRadius: "999px", overflow: "hidden" };
}

function progressFillStyle(t: { accentSolid: string }, pct: number): React.CSSProperties {
  return {
    height: "100%",
    width: `${pct}%`,
    background: t.accentSolid,
    borderRadius: "999px",
    transition: "width 0.3s ease",
  };
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
  onCancelEnrich,
  onHide,
}: SourcesTabProps) {
  const { tokens: t } = useTheme();
  const styles = getStyles(t);

  return (
    <div>
      <h2 style={{ ...styles.label, marginBottom: "0.3rem" }}>Recipe Sources</h2>
      <p style={{ color: t.textMuted, fontSize: "0.84rem", marginBottom: "1.5rem" }}>
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
          <button onClick={onAdd} style={{ ...smBtn(t, "primary"), padding: "0.65rem 1rem" }}>
            Add
          </button>
        </div>
        {sourceError && (
          <p style={{ color: t.danger, fontSize: "0.75rem", marginTop: "0.6rem", marginBottom: 0 }}>
            ⚠ {sourceError}
          </p>
        )}
        {sourceSuccess && (
          <p style={{ color: t.success, fontSize: "0.75rem", marginTop: "0.6rem", marginBottom: 0 }}>
            {sourceSuccess}
          </p>
        )}
        <p style={{ color: t.textFaint, fontSize: "0.75rem", marginTop: "0.75rem", marginBottom: 0 }}>
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
          const isBuiltin = !!src.builtin;
          // U7: a brand-new source chains index -> enrich automatically (App.tsx addSource);
          // show one combined progress line for that first pass instead of two separate ones.
          const isFirstPass = !isBuiltin && !src.enrichedAt && (isIndexing || isEnriching);

          return (
            <div
              key={src.id}
              className="trf-hoverable"
              style={{
                background: t.surface,
                boxShadow: t.shadowSoft,
                borderRadius: "12px",
                padding: "0.75rem 1rem",
              }}
            >
              {/* Title row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "1.375rem", flexShrink: 0 }}>{src.emoji}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.1rem" }}>
                      <span style={{ color: t.text, fontSize: "0.84rem" }}>{src.name}</span>
                      {isBuiltin && (
                        <span
                          title="Ships with the app, kept up to date automatically — no indexing or enriching needed"
                          style={{
                            fontSize: "0.75rem",
                            color: t.accent,
                            background: t.accentTint,
                            border: `1px solid ${t.accentBorder}`,
                            borderRadius: "8px",
                            padding: "0.05rem 0.4rem",
                          }}
                        >
                          Built-in{src.enrichedAt && ` · updated ${new Date(src.enrichedAt).toLocaleDateString()}`}
                        </span>
                      )}
                    </div>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: t.textFaint,
                        fontSize: "0.75rem",
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
                    style={{ ...smBtn(t, isActive ? "primary" : "default"), minWidth: "72px", textAlign: "center" }}
                  >
                    {isActive ? "✓ Active" : "Enable"}
                  </button>
                  {isBuiltin ? (
                    <button
                      onClick={() => onHide(src.id)}
                      title="Hide this built-in source — its data stays on your device and it can come back on the next update"
                      style={{
                        background: "none",
                        border: `1px solid ${t.border}`,
                        color: t.textMuted,
                        borderRadius: "8px",
                        cursor: "pointer",
                        padding: "0.35rem 0.6rem",
                        fontSize: "0.75rem",
                        lineHeight: 1,
                      }}
                    >
                      Hide
                    </button>
                  ) : (
                    <button
                      onClick={() => onRemove(src.id)}
                      title="Remove source"
                      aria-label={`Remove ${src.name}`}
                      style={{
                        background: "none",
                        border: `1px solid ${t.border}`,
                        color: t.textMuted,
                        borderRadius: "8px",
                        cursor: "pointer",
                        padding: "0.35rem 0.6rem",
                        fontSize: "0.94rem",
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Status rows */}
              <div
                style={{
                  marginTop: "0.6rem",
                  paddingTop: "0.6rem",
                  borderTop: `1px solid ${t.border}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.45rem",
                }}
              >
                {isBuiltin ? (
                  hasEnriched ? (
                    <span style={{ fontSize: "0.75rem", color: t.success }}>
                      ✓ {src.enrichedCount} recipes ready to search — no indexing or enriching needed
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: t.danger }}>
                      ⚠ No recipes in the latest update for this source — it will be retried on the next weekly refresh
                    </span>
                  )
                ) : isFirstPass ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.75rem", color: t.secondaryAccent }}>
                        ⏳ Adding {src.name}…{" "}
                        {isIndexing
                          ? "finding recipes…"
                          : `${enrichProgress.done}/${enrichProgress.total} recipes ready — searchable now`}
                      </span>
                      {isEnriching && (
                        <button
                          onClick={onCancelEnrich}
                          style={{
                            ...smBtn(t, "default"),
                            fontSize: "0.75rem",
                            padding: "0.3rem 0.6rem",
                            borderColor: t.danger,
                            color: t.danger,
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                    {isEnriching && enrichProgress.total > 0 && (
                      <div style={progressBarStyle(t)}>
                        <div style={progressFillStyle(t, (enrichProgress.done / enrichProgress.total) * 100)} />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Index status */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.75rem" }}>
                        {isIndexing && <span style={{ color: t.secondaryAccent }}>⏳ Indexing recipes…</span>}
                        {!isIndexing && hasIndex && (
                          <span style={{ color: t.success }}>
                            ✓ {src.indexCount} recipes indexed
                            {src.indexedAt && ` · ${new Date(src.indexedAt).toLocaleDateString()}`}
                          </span>
                        )}
                        {!isIndexing && !hasIndex && (
                          <span style={{ color: t.textFaint }}>No index yet</span>
                        )}
                      </span>
                      {!isIndexing && (
                        <button
                          onClick={() => onReindex(src.id)}
                          style={{ ...smBtn(t, "default"), fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                        >
                          {hasIndex ? "Re-index" : "Index now"}
                        </button>
                      )}
                    </div>

                    {/* Enrichment status */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.75rem" }}>
                        {isEnriching && (
                          <span style={{ color: t.secondaryAccent }}>
                            ⏳ Enriching {enrichProgress.done}/{enrichProgress.total} recipes…
                          </span>
                        )}
                        {!isEnriching && hasEnriched && (
                          <span style={{ color: t.success }}>
                            ✓ {src.enrichedCount}/{src.indexCount} recipes enriched
                            {src.enrichedAt && ` · ${new Date(src.enrichedAt).toLocaleDateString()}`}
                          </span>
                        )}
                        {!isEnriching && !hasEnriched && hasIndex && (
                          <span style={{ color: t.textMuted }}>Not enriched — ingredient search unavailable</span>
                        )}
                        {!isEnriching && !hasIndex && (
                          <span style={{ color: t.textFaint }}>Index first to enable enrichment</span>
                        )}
                      </span>
                      {!isEnriching && hasIndex && (
                        <button
                          onClick={() => onEnrich(src.id)}
                          style={{
                            ...smBtn(t, "default"),
                            fontSize: "0.75rem",
                            padding: "0.3rem 0.6rem",
                            borderColor: hasEnriched ? t.border : t.accentSolid,
                            color: hasEnriched ? t.textMuted : t.accent,
                          }}
                        >
                          {hasEnriched ? "Re-enrich" : "Enrich now"}
                        </button>
                      )}
                      {isEnriching && (
                        <button
                          onClick={onCancelEnrich}
                          style={{
                            ...smBtn(t, "default"),
                            fontSize: "0.75rem",
                            padding: "0.3rem 0.6rem",
                            borderColor: t.danger,
                            color: t.danger,
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    {/* Enrichment progress bar */}
                    {isEnriching && enrichProgress.total > 0 && (
                      <div style={progressBarStyle(t)}>
                        <div style={progressFillStyle(t, (enrichProgress.done / enrichProgress.total) * 100)} />
                      </div>
                    )}
                  </>
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
              border: `1px dashed ${t.border}`,
              borderRadius: "12px",
            }}
          >
            <p style={{ color: t.textMuted, fontSize: "0.94rem", margin: "0 0 0.4rem" }}>No sources yet.</p>
            <p style={{ color: t.textFaint, fontSize: "0.84rem", margin: 0 }}>
              Built-in defaults couldn't be loaded (offline?) — add a website above to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
