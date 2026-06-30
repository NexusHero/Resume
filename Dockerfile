# syntax=docker/dockerfile:1

# --- Build stage: install all deps and compile the TypeScript server ---------
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Runtime stage: production deps + built server + static web assets --------
FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
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
