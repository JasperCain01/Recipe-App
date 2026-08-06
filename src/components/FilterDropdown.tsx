import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useTheme } from "../lib/ThemeContext";
import type { ThemeTokens } from "../lib/styles";

export interface FilterOption {
  value: string;
  label: string;
}

interface Props {
  options: FilterOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  alignRight?: boolean;
}

const panelStyle = (t: ThemeTokens, alignRight: boolean): React.CSSProperties => ({
  position: "absolute",
  top: "calc(100% + 2px)",
  ...(alignRight ? { right: 0 } : { left: 0 }),
  zIndex: 200,
  background: t.surface,
  border: `1px solid ${t.border}`,
  borderRadius: "8px",
  minWidth: "160px",
  maxHeight: "220px",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  boxShadow: `0 4px 12px ${t.shadow}`,
});

export default function FilterDropdown({ options, selected, onChange, alignRight = false }: Props) {
  const { tokens: t } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
        setHighlightIndex(-1);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) searchInputRef.current?.focus();
  }, [open]);

  const closePanel = (returnFocus: boolean) => {
    setOpen(false);
    setQuery("");
    setHighlightIndex(-1);
    if (returnFocus) triggerRef.current?.focus();
  };

  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  };

  const active = selected.size > 0;
  const singleLabel = active && selected.size === 1
    ? (options.find((o) => o.value === [...selected][0])?.label ?? [...selected][0])
    : null;
  const summary = active
    ? (selected.size === 1 ? singleLabel! : `${selected.size} selected`)
    : "Any";

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  // U10: Escape closes (returning focus to the trigger), arrow keys move the
  // highlighted option, Enter toggles it, and Tab is trapped within the
  // panel while it's open.
  const handlePanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closePanel(true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightIndex >= 0 && filtered[highlightIndex]) {
      e.preventDefault();
      toggle(filtered[highlightIndex].value);
    } else if (e.key === "Tab") {
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>("input, button:not([disabled])");
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const triggerStyle: React.CSSProperties = {
    background: t.background,
    border: `1px solid ${active ? t.accent : t.border}`,
    color: active ? t.accent : t.textFaint,
    borderRadius: "8px",
    padding: "0.2rem 0.3rem",
    fontSize: "0.75rem",
    fontFamily: "inherit",
    cursor: "pointer",
    width: "100%",
    marginTop: "0.3rem",
    textAlign: "left",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.2rem",
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={triggerStyle}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {summary}
        </span>
        <ChevronDown aria-hidden="true" size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
      </button>

      {open && (
        <div ref={panelRef} style={panelStyle(t, alignRight)} onKeyDown={handlePanelKeyDown}>
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setHighlightIndex(-1); }}
            placeholder="Search…"
            aria-label="Filter options"
            style={{
              background: "transparent",
              border: "none",
              borderBottom: `1px solid ${t.border}`,
              color: t.textMuted,
              padding: "0.3rem 0.5rem",
              fontSize: "16px",
              fontFamily: "inherit",
              flexShrink: 0,
              width: "100%",
              boxSizing: "border-box",
            }}
          />
          <div role="listbox" style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length === 0 && (
              <div style={{ padding: "0.4rem 0.5rem", color: t.textFaint, fontSize: "0.75rem" }}>
                No matches
              </div>
            )}
            {filtered.map((o, i) => (
              <button
                key={o.value}
                role="option"
                aria-selected={selected.has(o.value)}
                onClick={() => toggle(o.value)}
                onMouseEnter={() => setHighlightIndex(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  width: "100%",
                  minHeight: "40px",
                  padding: "0.3rem 0.5rem",
                  background: i === highlightIndex ? t.accentTint : "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "0.75rem",
                  color: selected.has(o.value) ? t.accent : t.textMuted,
                  textAlign: "left",
                }}
              >
                <span aria-hidden="true" style={{ width: "0.9rem", flexShrink: 0, color: t.accent, display: "inline-flex" }}>
                  {selected.has(o.value) && <Check size={13} />}
                </span>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
