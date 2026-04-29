import { useState, useRef, useEffect } from "react";

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

const panelStyle = (alignRight: boolean): React.CSSProperties => ({
  position: "absolute",
  top: "calc(100% + 2px)",
  ...(alignRight ? { right: 0 } : { left: 0 }),
  zIndex: 200,
  background: "#ffffff",
  border: "1px solid #cfc7bc",
  borderRadius: "4px",
  minWidth: "160px",
  maxHeight: "220px",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
});

export default function FilterDropdown({ options, selected, onChange, alignRight = false }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

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

  const triggerStyle: React.CSSProperties = {
    background: "#faf7f2",
    border: `1px solid ${active ? "#6b4c1e" : "#cfc7bc"}`,
    color: active ? "#6b4c1e" : "#8c8278",
    borderRadius: "4px",
    padding: "0.2rem 0.3rem",
    fontSize: "0.65rem",
    fontFamily: "inherit",
    cursor: "pointer",
    outline: "none",
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
      <button onClick={() => setOpen((o) => !o)} style={triggerStyle}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {summary}
        </span>
        <span style={{ opacity: 0.4, flexShrink: 0, fontSize: "0.55rem" }}>▾</span>
      </button>

      {open && (
        <div style={panelStyle(alignRight)}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            autoFocus
            style={{
              background: "transparent",
              border: "none",
              borderBottom: "1px solid #ece7de",
              color: "#9c9288",
              padding: "0.3rem 0.5rem",
              fontSize: "0.68rem",
              fontFamily: "inherit",
              outline: "none",
              flexShrink: 0,
              width: "100%",
              boxSizing: "border-box",
            }}
          />
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length === 0 && (
              <div style={{ padding: "0.4rem 0.5rem", color: "#b0a898", fontSize: "0.68rem" }}>
                No matches
              </div>
            )}
            {filtered.map((o) => (
              <button
                key={o.value}
                onClick={() => toggle(o.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  width: "100%",
                  padding: "0.3rem 0.5rem",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "0.72rem",
                  color: selected.has(o.value) ? "#6b4c1e" : "#6c6258",
                  textAlign: "left",
                }}
              >
                <span style={{ width: "0.7rem", flexShrink: 0, color: "#6b4c1e" }}>
                  {selected.has(o.value) ? "✓" : ""}
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
