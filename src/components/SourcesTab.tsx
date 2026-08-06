import { useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, AlertTriangle, Loader2, MoreVertical, Trash2, EyeOff, ListChecks, Sparkles, X } from "lucide-react";
import { getStyles, smBtn, iconBtn, type ThemeTokens } from "../lib/styles";
import { useTheme } from "../lib/ThemeContext";
import { friendlyDomain } from "../lib/utils";
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

/** "⋯" overflow menu for the Index/Re-index/Enrich/Re-enrich recovery actions
 *  (4.5) — the normal add flow auto-chains index -> enrich, so these are only
 *  needed to recover a source that got stuck partway. */
function SourceActionsMenu({
  hasIndex,
  hasEnriched,
  onReindex,
  onEnrich,
  t,
}: {
  hasIndex: boolean;
  hasEnriched: boolean;
  onReindex: () => void;
  onEnrich: () => void;
  t: ThemeTokens;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        title="More actions"
        style={iconBtn(t)}
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 2px)",
            right: 0,
            zIndex: 200,
            minWidth: "170px",
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: "8px",
            boxShadow: `0 4px 12px ${t.shadow}`,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <button role="menuitem" onClick={() => { onReindex(); setOpen(false); }} style={menuItemStyle(t)}>
            <ListChecks size={14} /> {hasIndex ? "Re-index this site" : "Index this site"}
          </button>
          {hasIndex && (
            <button role="menuitem" onClick={() => { onEnrich(); setOpen(false); }} style={menuItemStyle(t)}>
              <Sparkles size={14} /> {hasEnriched ? "Re-prepare recipes" : "Prepare recipes"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function menuItemStyle(t: ThemeTokens): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    width: "100%",
    minHeight: "40px",
    padding: "0.4rem 0.75rem",
    background: "none",
    border: "none",
    color: t.text,
    fontFamily: "inherit",
    fontSize: "0.84rem",
    textAlign: "left",
    cursor: "pointer",
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
      <h2 style={{ ...styles.label, marginBottom: "0.3rem" }}>My Recipe Sites</h2>
      <p style={{ color: t.textMuted, fontSize: "0.84rem", marginBottom: "1.5rem" }}>
        Add any recipe website — we'll find its recipes and get them ready so you can search by what you have.
      </p>

      {/* Add form */}
      <div style={{ ...styles.card, marginBottom: "1.5rem" }}>
        <p style={{ ...styles.label, marginBottom: "1rem" }}>Add a site</p>
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
          <p style={{ color: t.danger, fontSize: "0.75rem", marginTop: "0.6rem", marginBottom: 0, display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <AlertTriangle size={13} /> {sourceError}
          </p>
        )}
        {sourceSuccess && (
          <p style={{ color: t.success, fontSize: "0.75rem", marginTop: "0.6rem", marginBottom: 0, display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <CheckCircle2 size={13} /> {sourceSuccess}
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
          const isBusy = isIndexing || isEnriching;
          // U7: a brand-new source chains index -> enrich automatically (App.tsx addSource);
          // show one combined progress line for that first pass instead of two separate ones.
          const isFirstPass = !isBuiltin && !src.enrichedAt && isBusy;

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
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
                  <button
                    onClick={() => onToggle(src.id)}
                    style={{ ...smBtn(t, isActive ? "primary" : "default"), minWidth: "72px", textAlign: "center", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}
                  >
                    {isActive && <Check size={12} />} {isActive ? "Active" : "Enable"}
                  </button>
                  {isBuiltin ? (
                    <button
                      onClick={() => onHide(src.id)}
                      title="Hide this built-in source — its data stays on your device and it can come back on the next update"
                      aria-label={`Hide ${src.name}`}
                      style={iconBtn(t)}
                    >
                      <EyeOff size={16} />
                    </button>
                  ) : (
                    <>
                      {!isBusy && (
                        <SourceActionsMenu
                          hasIndex={hasIndex}
                          hasEnriched={hasEnriched}
                          onReindex={() => onReindex(src.id)}
                          onEnrich={() => onEnrich(src.id)}
                          t={t}
                        />
                      )}
                      <button
                        onClick={() => onRemove(src.id)}
                        title="Remove source"
                        aria-label={`Remove ${src.name}`}
                        style={iconBtn(t)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Status row — a single friendly sentence + progress bar (4.5) */}
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
                    <StatusLine icon={<CheckCircle2 size={14} />} color={t.success}>
                      Ready to search — {src.enrichedCount} recipes
                    </StatusLine>
                  ) : (
                    <StatusLine icon={<AlertTriangle size={14} />} color={t.secondaryAccent}>
                      No recipes in the latest update — we'll try again next week
                    </StatusLine>
                  )
                ) : isFirstPass ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <StatusLine icon={<Loader2 size={14} className="trf-spin" />} color={t.secondaryAccent}>
                        {isIndexing
                          ? `Finding recipes on ${friendlyDomain(src.url)}…`
                          : `Getting recipes ready… ${enrichProgress.done} of ${enrichProgress.total}`}
                      </StatusLine>
                      {isEnriching && (
                        <button onClick={onCancelEnrich} style={cancelBtnStyle(t)}>
                          <X size={13} /> Cancel
                        </button>
                      )}
                    </div>
                    {isEnriching && enrichProgress.total > 0 && (
                      <div style={progressBarStyle(t)}>
                        <div style={progressFillStyle(t, (enrichProgress.done / enrichProgress.total) * 100)} />
                      </div>
                    )}
                  </>
                ) : isIndexing ? (
                  <StatusLine icon={<Loader2 size={14} className="trf-spin" />} color={t.secondaryAccent}>
                    Finding recipes on {friendlyDomain(src.url)}…
                  </StatusLine>
                ) : isEnriching ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <StatusLine icon={<Loader2 size={14} className="trf-spin" />} color={t.secondaryAccent}>
                        Getting recipes ready… {enrichProgress.done} of {enrichProgress.total}
                      </StatusLine>
                      <button onClick={onCancelEnrich} style={cancelBtnStyle(t)}>
                        <X size={13} /> Cancel
                      </button>
                    </div>
                    {enrichProgress.total > 0 && (
                      <div style={progressBarStyle(t)}>
                        <div style={progressFillStyle(t, (enrichProgress.done / enrichProgress.total) * 100)} />
                      </div>
                    )}
                  </>
                ) : hasEnriched ? (
                  <StatusLine icon={<CheckCircle2 size={14} />} color={t.success}>
                    Ready to search — {src.enrichedCount} of {src.indexCount} recipes
                    {src.enrichedAt && `, updated ${new Date(src.enrichedAt).toLocaleDateString()}`}
                  </StatusLine>
                ) : hasIndex ? (
                  <StatusLine icon={<AlertTriangle size={14} />} color={t.textMuted}>
                    One more step — prepare these recipes for searching
                  </StatusLine>
                ) : (
                  <StatusLine icon={<AlertTriangle size={14} />} color={t.textFaint}>
                    Not set up yet — use the ⋯ menu above to find its recipes
                  </StatusLine>
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
            <p style={{ color: t.textMuted, fontSize: "0.94rem", margin: "0 0 0.4rem" }}>No sites yet.</p>
            <p style={{ color: t.textFaint, fontSize: "0.84rem", margin: 0 }}>
              Built-in defaults couldn't be loaded (offline?) — add a website above to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusLine({ icon, color, children }: { icon: React.ReactNode; color: string; children: React.ReactNode }) {
  return (
    <span style={{ fontSize: "0.75rem", color, display: "flex", alignItems: "center", gap: "0.4rem" }}>
      {icon}
      {children}
    </span>
  );
}

function cancelBtnStyle(t: ThemeTokens): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
    padding: "0.3rem 0.6rem",
    border: `1px solid ${t.border}`,
    background: "transparent",
    color: t.danger,
    borderRadius: "8px",
    fontFamily: "inherit",
    fontSize: "0.75rem",
    cursor: "pointer",
  };
}
