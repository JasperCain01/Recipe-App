import { styles } from "../lib/styles";
import { TABS } from "../lib/constants";
import type { Tab } from "../lib/types";

interface HeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header style={styles.header}>
      <div>
        <h1 style={styles.h1}>🍽 Trusted Recipe Finder</h1>
        <p style={styles.sub}>Recipe Finder</p>
      </div>
      <nav style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              style={{
                padding: "0.4rem 0.875rem",
                border: "1px solid",
                borderColor: active ? "#FFFFFF" : "rgba(255,255,255,0.35)",
                background: active ? "rgba(255,255,255,0.18)" : "transparent",
                color: active ? "#FFFFFF" : "rgba(255,255,255,0.9)",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.72rem",
                textTransform: "capitalize",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {tab}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
