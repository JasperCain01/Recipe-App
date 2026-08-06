import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { getStyles } from "../lib/styles";
import { useTheme } from "../lib/ThemeContext";
import { QUICK_ADD_INGREDIENTS } from "../lib/constants";
import type { IngredientEntry } from "../lib/types";

interface IngredientEntryBoxProps {
  entries: IngredientEntry[];
  onAdd: (text: string) => void;
  onToggleRequired: (index: number) => void;
  onRemove: (index: number) => void;
  /** Ranked ingredient vocabulary built from enriched recipe data (see App.tsx buildVocabulary). */
  vocabulary: string[];
}

const MAX_SUGGESTIONS = 6;

export default function IngredientEntryBox({ entries, onAdd, onToggleRequired, onRemove, vocabulary }: IngredientEntryBoxProps) {
  const { tokens: t } = useTheme();
  const styles = getStyles(t);
  const [draft, setDraft] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const enteredLower = useMemo(() => new Set(entries.map((e) => e.text.toLowerCase())), [entries]);

  const suggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    if (!q) return [];
    return vocabulary.filter((w) => w.startsWith(q) && !enteredLower.has(w)).slice(0, MAX_SUGGESTIONS);
  }, [draft, vocabulary, enteredLower]);

  const quickAdd = useMemo(
    () => QUICK_ADD_INGREDIENTS.filter((w) => !enteredLower.has(w)),
    [enteredLower],
  );

  const commit = (text: string) => {
    onAdd(text);
    setDraft("");
    setHighlightIndex(-1);
    setSuggestionsOpen(false);
  };

  const commitDraft = () => {
    const text = highlightIndex >= 0 && suggestions[highlightIndex] ? suggestions[highlightIndex] : draft;
    if (text.trim()) commit(text);
  };

  const handleDraftChange = (value: string) => {
    if (value.includes(",")) {
      const parts = value.split(",");
      for (const part of parts.slice(0, -1)) {
        if (part.trim()) onAdd(part.trim());
      }
      setDraft(parts[parts.length - 1]);
    } else {
      setDraft(value);
    }
    setHighlightIndex(-1);
    setSuggestionsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && draft === "" && entries.length > 0) {
      onRemove(entries.length - 1);
    } else if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setSuggestionsOpen(false);
      setHighlightIndex(-1);
    }
  };

  return (
    <div>
      {/* Chips */}
      {entries.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              style={{
                display: "inline-flex",
                alignItems: "stretch",
                border: "1px solid",
                borderColor: entry.required ? t.accent : t.border,
                background: entry.required ? t.accentTint : t.surfaceAlt,
                borderRadius: "999px",
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => onToggleRequired(i)}
                title={entry.required ? "Required — click to make optional" : "Optional — click to require it"}
                style={{
                  background: "none",
                  border: "none",
                  padding: "0.3rem 0.4rem 0.3rem 0.85rem",
                  minHeight: "40px",
                  color: entry.required ? t.accent : t.textMuted,
                  fontFamily: "inherit",
                  fontSize: "0.84rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {entry.text}
                <span style={{ marginLeft: "0.4rem", fontSize: "0.75rem", opacity: 0.75 }}>
                  {entry.required ? "REQUIRED" : "optional"}
                </span>
              </button>
              <button
                onClick={() => onRemove(i)}
                title={`Remove ${entry.text}`}
                aria-label={`Remove ${entry.text}`}
                style={{
                  background: "none",
                  border: "none",
                  borderLeft: `1px solid ${t.border}`,
                  minWidth: "40px",
                  minHeight: "40px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: t.textFaint,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input + autocomplete */}
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={suggestionsOpen && suggestions.length > 0}
          aria-autocomplete="list"
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setSuggestionsOpen(true)}
          onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
          placeholder="Type an ingredient, press Enter or comma…"
          style={styles.input}
        />
        {suggestionsOpen && suggestions.length > 0 && (
          <div
            role="listbox"
            style={{
              position: "absolute",
              top: "calc(100% + 2px)",
              left: 0,
              right: 0,
              zIndex: 200,
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: "8px",
              boxShadow: `0 4px 12px ${t.shadow}`,
              overflow: "hidden",
            }}
          >
            {suggestions.map((s, i) => (
              <button
                key={s}
                role="option"
                aria-selected={i === highlightIndex}
                // onMouseDown (not onClick) fires before the input's onBlur closes the list
                onMouseDown={(e) => { e.preventDefault(); commit(s); }}
                style={{
                  display: "block",
                  width: "100%",
                  minHeight: "40px",
                  padding: "0.5rem 0.85rem",
                  border: "none",
                  background: i === highlightIndex ? t.accentTint : "none",
                  color: t.text,
                  fontFamily: "inherit",
                  fontSize: "0.84rem",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick-add staples */}
      {quickAdd.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.6rem" }}>
          {quickAdd.map((staple) => (
            <button
              key={staple}
              onClick={() => onAdd(staple)}
              style={{
                minHeight: "40px",
                padding: "0.3rem 0.7rem",
                border: `1px solid ${t.border}`,
                background: t.surface,
                color: t.textMuted,
                borderRadius: "999px",
                fontFamily: "inherit",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              + {staple}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
