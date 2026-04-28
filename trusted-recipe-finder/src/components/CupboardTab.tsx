import { useState } from "react";
import { styles } from "../lib/styles";
import { DEFAULT_CUPBOARD } from "../lib/constants";

interface CupboardTabProps {
  cupboard: string[];
  onSave: (items: string[]) => void;
}

export default function CupboardTab({ cupboard, onSave }: CupboardTabProps) {
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
      <h2 style={{ ...styles.label, marginBottom: "0.3rem" }}>Store Cupboard</h2>
      <p style={{ color: "#444", fontSize: "0.8rem", marginBottom: "1.25rem" }}>
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
            background: "#e8d5b0",
            color: "#0f0f0f",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "0.8rem",
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
              background: "#141414",
              border: "1px solid #1e1e1e",
              borderRadius: "20px",
              padding: "0.3rem 0.6rem 0.3rem 0.875rem",
              fontSize: "0.8rem",
            }}
          >
            <span style={{ color: "#bbb" }}>{item}</span>
            <button
              onClick={() => onSave(cupboard.filter((i) => i !== item))}
              style={{
                background: "none",
                border: "none",
                color: "#444",
                cursor: "pointer",
                padding: "0",
                fontSize: "0.9rem",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => onSave(DEFAULT_CUPBOARD)}
        style={{
          marginTop: "1.5rem",
          padding: "0.5rem 1rem",
          background: "transparent",
          border: "1px solid #222",
          color: "#555",
          borderRadius: "6px",
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
