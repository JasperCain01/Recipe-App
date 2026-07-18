FROM node:20-bookworm

# ── System packages ──────────────────────────────────────────────────────────
# git and curl are needed by the Claude Code feature and general dev tooling.
RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ── npm dependency installation ──────────────────────────────────────────────
# Dependencies are installed at container-creation time via the
# postCreateCommand in devcontainer.json (source files are not present at
# Docker build time, only at runtime via the workspace mount).

WORKDIR /workspaces/Recipe-App
