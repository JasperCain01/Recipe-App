import { getStyles } from "../lib/styles";
import { useTheme } from "../lib/ThemeContext";
import { TABS } from "../lib/constants";
import type { Tab } from "../lib/types";
import type { ThemeName } from "../lib/ThemeContext";

interface HeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  theme: ThemeName;
  onToggleTheme: () => void;
}

export default function Header({ activeTab, onTabChange, theme, onToggleTheme }: HeaderProps) {
  const { tokens } = useTheme();
  const styles = getStyles(tokens);

  return (
    <header style={styles.header}>
      <div>
        <h1 style={styles.h1}>🍽 Trusted Recipe Finder</h1>
        <p style={styles.sub}>Recipe Finder</p>
      </div>
      <nav style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", alignItems: "center" }}>
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              style={{
                padding: "0.4rem 0.875rem",
                minHeight: "40px",
                border: "1px solid",
                borderColor: active ? tokens.navActiveBorder : tokens.navInactiveBorder,
                background: active ? tokens.navActiveBg : "transparent",
                color: active ? tokens.onHeader : tokens.onHeaderMuted,
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
        <button
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          style={{
            padding: "0.4rem 0.6rem",
            minWidth: "40px",
            minHeight: "40px",
            border: "1px solid",
            borderColor: tokens.navInactiveBorder,
            background: "transparent",
            color: tokens.onHeader,
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </nav>
    </header>
  );
}
