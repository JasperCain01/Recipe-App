import { useMemo, useRef, useState } from "react";
import { styles } from "../lib/styles";
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
                borderColor: entry.required ? "#00796B" : "#E0E0E0",
                background: entry.required ? "rgba(0,121,107,0.1)" : "#F5F5F5",
                borderRadius: "20px",
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
                  color: entry.required ? "#00796B" : "#757575",
                  fontFamily: "inherit",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {entry.text}
                <span style={{ marginLeft: "0.4rem", fontSize: "0.6rem", opacity: 0.75 }}>
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
                  borderLeft: "1px solid rgba(0,0,0,0.08)",
                  minWidth: "40px",
                  minHeight: "40px",
                  color: "#9E9E9E",
                  fontFamily: "inherit",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ×
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
              background: "#FFFFFF",
              border: "1px solid #E0E0E0",
              borderRadius: "6px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
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
                  background: i === highlightIndex ? "rgba(0,121,107,0.1)" : "none",
                  color: "#212121",
                  fontFamily: "inherit",
                  fontSize: "0.85rem",
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
                border: "1px solid #E0E0E0",
                background: "#FFFFFF",
                color: "#757575",
                borderRadius: "20px",
                fontFamily: "inherit",
                fontSize: "0.72rem",
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
