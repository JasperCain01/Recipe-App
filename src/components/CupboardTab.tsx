import { useState } from "react";
import { X } from "lucide-react";
import { getStyles } from "../lib/styles";
import { useTheme } from "../lib/ThemeContext";
import { DEFAULT_CUPBOARD } from "../lib/constants";

interface CupboardTabProps {
  cupboard: string[];
  onSave: (items: string[]) => void;
}

export default function CupboardTab({ cupboard, onSave }: CupboardTabProps) {
  const { tokens } = useTheme();
  const styles = getStyles(tokens);
  const [newItem, setNewItem] = useState("");

  const addItem = () => {
    const trimmed = newItem.trim().toLowerCase();
    if (!trimmed) return;
    if (cupboard.includes(trimmed)) {
      setNewItem("");
      return;
    }
    onSave([...cupboard, trimmed]);
    setNewItem("");
  };

  return (
    <div>
      <h2 style={{ ...styles.label, marginBottom: "0.3rem" }}>My Staples</h2>
      <p style={{ color: tokens.textMuted, fontSize: "0.84rem", marginBottom: "1.25rem" }}>
        Always assumed present, even when not listed in your search.
      </p>

      <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1.25rem" }}>
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="Add ingredient and press Enter..."
          style={styles.input}
        />
        <button
          onClick={addItem}
          style={{
            padding: "0.65rem 1.1rem",
            minHeight: "40px",
            background: tokens.accentSolid,
            color: tokens.onAccent,
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "0.84rem",
          }}
        >
          Add
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
        {cupboard.map((item) => (
          <div
            key={item}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: tokens.surface,
              border: `1px solid ${tokens.border}`,
              borderRadius: "999px",
              padding: "0.3rem 0.6rem 0.3rem 0.875rem",
              fontSize: "0.84rem",
            }}
          >
            <span style={{ color: tokens.text }}>{item}</span>
            <button
              onClick={() => onSave(cupboard.filter((i) => i !== item))}
              aria-label={`Remove ${item} from cupboard`}
              style={{
                background: "none",
                border: "none",
                color: tokens.textFaint,
                cursor: "pointer",
                minWidth: "40px",
                minHeight: "40px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0",
                lineHeight: 1,
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => onSave(DEFAULT_CUPBOARD)}
        style={{
          marginTop: "1.5rem",
          padding: "0.5rem 1rem",
          minHeight: "40px",
          background: "transparent",
          border: `1px solid ${tokens.border}`,
          color: tokens.textMuted,
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "0.75rem",
          fontFamily: "inherit",
        }}
      >
        Reset to defaults
      </button>
    </div>
  );
}
