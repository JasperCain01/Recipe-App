FROM node:20-bookworm

# ── System packages ──────────────────────────────────────────────────────────
# git and curl are needed by the Claude Code feature and general dev tooling.
RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ── Node.js global tooling ───────────────────────────────────────────────────
# The Vercel CLI is already a devDependency (v52) so npm run dev:all works
# via the local binary. No global install is needed.

# ── npm dependency installation ──────────────────────────────────────────────
# Dependencies are installed at container-creation time via the
# postCreateCommand in devcontainer.json (source files are not present at
# Docker build time, only at runtime via the workspace mount).

WORKDIR /workspaces/Recipe-App
