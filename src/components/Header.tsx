import { Search, Globe, Archive, Sun, Moon } from "lucide-react";
import { getStyles } from "../lib/styles";
import { useTheme } from "../lib/ThemeContext";
import { useNarrowViewport } from "../lib/hooks";
import { TABS, TAB_LABELS } from "../lib/constants";
import Logo from "./Logo";
import type { Tab } from "../lib/types";
import type { ThemeTokens } from "../lib/styles";
import type { ThemeName } from "../lib/ThemeContext";

interface HeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  theme: ThemeName;
  onToggleTheme: () => void;
}

const NARROW_BREAKPOINT = 640;

const TAB_ICONS: Record<Tab, typeof Search> = {
  search: Search,
  sources: Globe,
  cupboard: Archive,
};

export default function Header({ activeTab, onTabChange, theme, onToggleTheme }: HeaderProps) {
  const { tokens } = useTheme();
  const styles = getStyles(tokens);
  const narrow = useNarrowViewport(NARROW_BREAKPOINT);

  return (
    <>
      <header style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ color: tokens.accent }}>
            <Logo size={26} />
          </span>
          <h1 style={styles.h1}>Trusted Recipe Finder</h1>
        </div>

        {/* Tabs live here (underline pattern) on tablet/desktop; phones get a
            bottom tab bar in the thumb zone instead (4.6/4.8). */}
        <nav style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          {!narrow &&
            TABS.map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => onTabChange(tab)}
                  aria-current={active ? "page" : undefined}
                  style={{
                    background: "none",
                    border: "none",
                    borderBottom: `2px solid ${active ? tokens.navActiveBorder : "transparent"}`,
                    color: active ? tokens.onHeader : tokens.onHeaderMuted,
                    padding: "0.4rem 0.1rem",
                    fontSize: "0.84rem",
                    fontWeight: active ? 600 : 400,
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >
                  {TAB_LABELS[tab]}
                </button>
              );
            })}
          <button
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            style={{
              background: "none",
              border: "none",
              minWidth: "40px",
              minHeight: "40px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: tokens.onHeader,
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </nav>
      </header>

      {narrow && <BottomNav activeTab={activeTab} onTabChange={onTabChange} t={tokens} />}
    </>
  );
}

function BottomNav({ activeTab, onTabChange, t }: { activeTab: Tab; onTabChange: (tab: Tab) => void; t: ThemeTokens }) {
  return (
    <nav
      aria-label="Primary"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        display: "flex",
        background: t.headerBg,
        borderTop: `1px solid ${t.border}`,
        boxShadow: `0 -2px 8px ${t.shadow}`,
      }}
    >
      {TABS.map((tab) => {
        const active = activeTab === tab;
        const Icon = TAB_ICONS[tab];
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            aria-current={active ? "page" : undefined}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.2rem",
              padding: "0.5rem 0 0.6rem",
              minHeight: "64px",
              background: "none",
              border: "none",
              color: active ? t.accent : t.textFaint,
              fontFamily: "inherit",
              fontSize: "0.75rem",
              fontWeight: active ? 600 : 400,
              cursor: "pointer",
            }}
          >
            <Icon size={20} />
            {TAB_LABELS[tab]}
          </button>
        );
      })}
    </nav>
  );
}
