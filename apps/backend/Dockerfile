# --- 1. PRUNER STAGE ---
FROM node:22-alpine AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=backend --docker

# --- 2. BUILDER STAGE (DevDeps + Build) ---
FROM node:22-alpine AS builder
WORKDIR /app
# Corepack enable jobb practice, mint az npm install -g pnpm, de így is oké
RUN corepack enable

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo build --filter=backend...

# --- 3. INSTALLER STAGE (Csak ProdDeps) ---
# Ez az új köztes lépés kritikus a méretcsökkentéshez!
FROM node:22-alpine AS installer
WORKDIR /app
RUN corepack enable

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
# Itt CSAK a production dependency-ket telepítjük
RUN pnpm install --only=production --ignore-scripts --frozen-lockfile --config.node-linker=hoisted

# --- 4. RUNNER STAGE ---
FROM node:22-alpine AS runner
WORKDIR /app

ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION

# Senior tipp: dumb-init használata a Node process signal handling (SIGTERM) miatt
RUN apk add --no-cache libc6-compat dumb-init

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Csak a szükséges fájlokat másoljuk át rétegenként
COPY --from=installer --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/dist ./dist
# Opcionális: package.json, ha az alkalmazás olvassa futásidőben verziószám miatt
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/package.json ./package.json

USER nodejs

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

# dumb-init entrypoint a tiszta leállásért
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/main"]
