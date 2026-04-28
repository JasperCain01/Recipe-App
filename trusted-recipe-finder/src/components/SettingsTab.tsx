import { useState } from "react";
import { styles, smBtn } from "../lib/styles";
import { PROVIDERS } from "../lib/constants";
import type { ApiKeys, ProviderId } from "../lib/types";

interface SettingsTabProps {
  provider: ProviderId;
  model: string;
  apiKeys: ApiKeys;
  onProviderChange: (id: ProviderId) => void;
  onModelChange: (id: string) => void;
  onApiKeyChange: (provider: ProviderId, key: string) => void;
}

export default function SettingsTab({
  provider,
  model,
  apiKeys,
  onProviderChange,
  onModelChange,
  onApiKeyChange,
}: SettingsTabProps) {
  const [showKey, setShowKey] = useState(false);
  const currentProvider = PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0];
  const currentKey = apiKeys[provider] ?? "";

  const otherSavedProviders = (Object.keys(apiKeys) as ProviderId[])
    .filter((k) => apiKeys[k] && k !== provider)
    .map((k) => PROVIDERS.find((p) => p.id === k)?.name)
    .filter((n): n is string => Boolean(n));

  return (
    <div>
      <h2 style={{ ...styles.label, marginBottom: "1.25rem" }}>Settings</h2>

      {/* Provider + model */}
      <div style={{ ...styles.card, marginBottom: "1rem" }}>
        <label style={styles.label}>AI Provider</label>
        <p style={{ color: "#444", fontSize: "0.78rem", marginBottom: "0.875rem", lineHeight: "1.6" }}>
          Choose which AI to use for recipe suggestions. You'll need an API key from your chosen provider.
        </p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.875rem" }}>
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => onProviderChange(p.id)}
              style={{ ...smBtn(provider === p.id ? "primary" : "default"), padding: "0.55rem 1.1rem" }}
            >
              {p.name}
            </button>
          ))}
        </div>
        <label style={{ ...styles.label, marginBottom: "0.4rem" }}>Model</label>
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          style={{ ...styles.input, width: "100%", flex: "none", cursor: "pointer", fontFamily: "inherit" }}
        >
          {currentProvider.models.map((m) => (
            <option key={m.id} value={m.id} style={{ background: "#0f0f0f" }}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* API key for current provider */}
      <div style={{ ...styles.card, marginBottom: "1rem" }}>
        <label style={styles.label}>{currentProvider.name} API Key</label>
        <p style={{ color: "#444", fontSize: "0.78rem", marginBottom: "0.875rem", lineHeight: "1.6" }}>
          Stored locally in your browser only. Forwarded to {currentProvider.name} once per request and never logged by this app.{" "}
          <a href={currentProvider.keyUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#c4a96e" }}>
            {currentProvider.keyHelp} →
          </a>
        </p>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <input
            type={showKey ? "text" : "password"}
            value={currentKey}
            onChange={(e) => onApiKeyChange(provider, e.target.value)}
            placeholder={currentProvider.keyPlaceholder}
            style={{ ...styles.input, fontFamily: "monospace", fontSize: "0.8rem" }}
          />
          <button
            onClick={() => setShowKey(!showKey)}
            style={{
              padding: "0.65rem 0.875rem",
              background: "transparent",
              border: "1px solid #222",
              color: "#555",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.75rem",
            }}
          >
            {showKey ? "Hide" : "Show"}
          </button>
        </div>
        {currentKey && (
          <p style={{ color: "#4ade80", fontSize: "0.72rem", marginTop: "0.5rem", marginBottom: 0 }}>
            ✓ API key saved for {currentProvider.name}
          </p>
        )}
        {otherSavedProviders.length > 0 && (
          <p style={{ color: "#444", fontSize: "0.7rem", marginTop: "0.75rem", marginBottom: 0 }}>
            Keys also saved for: {otherSavedProviders.join(", ")}
          </p>
        )}
      </div>

      <div style={styles.card}>
        <label style={styles.label}>About</label>
        <p style={{ color: "#444", fontSize: "0.82rem", lineHeight: "1.75", margin: 0 }}>
          Trusted Recipe Finder uses your chosen AI provider to suggest recipes from your indexed sources based on
          ingredients you have. Store cupboard staples are always assumed available. All quantities are returned in metric.
          Your API key is never stored on our servers — it's forwarded to the provider once per request and discarded.
        </p>
      </div>
    </div>
  );
}
