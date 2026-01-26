# --- 1. PRUNER STAGE ---
FROM node:22-alpine AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
# Automatikusan kiszedi a frontendhez tartozó "ágat" (beleértve a shared-types-t is!)
RUN turbo prune --scope=frontend --docker

# --- 2. BUILDER STAGE ---
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable

# Dependencies telepítése
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile --ignore-scripts

# Build
COPY --from=pruner /app/out/full/ .

# BUILD ARGUMENTUMOK KEZELÉSE
# Fontos: SPA (Vite/React) esetén a build időben cserélődnek ki a változók!
# A "Build Once, Deploy Anywhere" elv miatt a relatív URL (proxy) a legjobb megoldás.
ARG VITE_APP_VERSION
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_SOCKET_URL=/

# A turbo build automatikusan felismeri a topológiát (hogy a shared-types kell a frontendnek)
# Nem kell külön buildelni a dependenciákat manuálisan.
RUN pnpm turbo build --filter=frontend...

# --- 3. NGINX STAGE ---
FROM nginx:alpine


# Biztonsági alapbeállítás (opcionális, de ajánlott)
# Töröljük az alapértelmezett Nginx configot
RUN rm -rf /etc/nginx/conf.d/*

# A buildelt statikus fájlok másolása
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# A saját konfigod másolása
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
