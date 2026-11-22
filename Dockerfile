# syntax=docker/dockerfile:1.7
# Image de production du site : construction dans une étape jetable, exécution sans npm, sans root, système de fichiers en lecture seule (compose).
# Les images de base sont épinglées par version ET par empreinte ; Dependabot (écosystème docker) propose les mises à jour.

ARG NODE_IMAGE=node:22.23.5-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a

FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV NUXT_TELEMETRY_DISABLED=1
# --ignore-scripts : aucun script d'installation tiers n'est exécuté pendant la construction
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
RUN npx nuxt prepare && npm run build

FROM ${NODE_IMAGE} AS runtime
LABEL org.opencontainers.image.title="ddibuntu-site" \
      org.opencontainers.image.description="Site vitrine de DDI-Buntu" \
      org.opencontainers.image.source="https://github.com/vincenttisseront/ddibuntu-site"
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NUXT_TELEMETRY_DISABLED=1
WORKDIR /app
# Correctifs de sécurité de l'image de base, puis retrait de npm/yarn (inutiles à l'exécution, et source fréquente de CVE)
RUN apk upgrade --no-cache \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /opt/yarn* /usr/local/bin/yarn /usr/local/bin/yarnpkg
# Fichiers possédés par root : l'utilisateur « node » (uid 1000) peut les lire mais pas les modifier
COPY --from=build /app/.output ./.output
USER 1000:1000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", ".output/server/index.mjs"]
