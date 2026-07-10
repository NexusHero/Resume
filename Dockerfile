# syntax=docker/dockerfile:1

# --- Build stage: install all deps and compile the TypeScript server ---------
FROM node:24-slim AS build
WORKDIR /app
# The build never renders PDFs, so don't let Puppeteer download Chromium here.
ENV PUPPETEER_SKIP_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm run build:web

# --- Runtime stage: production deps + built server + static web assets --------
FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Headless-Chromium runtime for PDF export (ADR-0031/0032): install a system
# Chromium + fonts and point Puppeteer at it, and skip Puppeteer's own browser
# download. Without this a slim Node image has no browser and every PDF render
# (CV, dossier, autopilot Mappe) fails at runtime.
ENV PUPPETEER_SKIP_DOWNLOAD=1 \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     chromium fonts-liberation fonts-noto-color-emoji ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
# Compiled server
COPY --from=build /app/server/dist ./server/dist
# Static UIs are served from the repo root (config.staticDir)
COPY --from=build /app/index.html ./index.html
COPY --from=build /app/design ./design
COPY --from=build /app/assets ./assets
# The file-backed user/session store and PDF archive live here; mount a volume.
RUN mkdir -p archive
EXPOSE 4178
CMD ["node", "server/dist/index.js"]
