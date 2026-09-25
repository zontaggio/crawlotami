# syntax=docker/dockerfile:1

# --- Build: compile TypeScript and keep only production dependencies ---------
FROM node:26-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Skip the postinstall browser download; the runtime stage installs Chromium.
RUN npm ci --ignore-scripts
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# --- Runtime: Node plus Chromium and its system libraries, nothing else ------
FROM node:26-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
# Installs the Chromium build matching the locked Playwright version, with its apt dependencies.
RUN npx playwright install --with-deps --only-shell chromium \
    && rm -rf /var/lib/apt/lists/* /root/.npm
COPY --from=build /app/dist ./dist
USER node
CMD ["node", "dist/index.js"]
