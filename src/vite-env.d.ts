/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Cloudflare Worker API, e.g. "https://trusted-recipe-finder-api.<account>.workers.dev". Empty/unset keeps API calls same-origin (Vercel). */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
