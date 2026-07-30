# syntax=docker/dockerfile:1

# `sweph` è un binding N-API che passa da node-gyp: gli strumenti di
# compilazione servono solo in fase di build, non nell'immagine finale.
FROM node:24-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Prima i manifesti: il livello delle dipendenze resta in cache finché non cambiano.
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/geo/package.json packages/geo/
COPY packages/mcp/package.json packages/mcp/
COPY apps/web/package.json apps/web/

# `--ignore-scripts` evita che `prepare` giri prima che i sorgenti esistano.
RUN npm ci --ignore-scripts

COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/ apps/

RUN npm run build -w @undicesimacasa/core -w @undicesimacasa/geo \
  && npm run build -w @undicesimacasa/mcp \
  && npm run build -w @undicesimacasa/web

# Dati non versionati, scaricati in fase di build.
# Le effemeridi (~2 MB) stanno nell'immagine; il dataset delle località
# (~85 MB) conviene montarlo come volume — vedi GEONAMES_DB_PATH sotto.
RUN npm run ephe:download -w @undicesimacasa/core

# Ripulisce le dipendenze di sviluppo prima di copiare nell'immagine finale.
RUN npm prune --omit=dev --ignore-scripts


FROM node:24-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    SE_EPHE_PATH=/app/packages/core/ephe \
    GEONAMES_DB_PATH=/data/geonames.db

COPY --from=build /app/node_modules      node_modules/
COPY --from=build /app/package.json      ./
COPY --from=build /app/packages/core/dist packages/core/dist/
COPY --from=build /app/packages/core/ephe packages/core/ephe/
COPY --from=build /app/packages/core/package.json packages/core/
COPY --from=build /app/packages/geo/dist  packages/geo/dist/
COPY --from=build /app/packages/geo/schema.sql packages/geo/
COPY --from=build /app/packages/geo/package.json packages/geo/
COPY --from=build /app/apps/web/build     apps/web/build/
COPY --from=build /app/apps/web/package.json apps/web/

USER node
EXPOSE 3000

# Il database delle località va montato su /data: l'immagine resta leggera e
# il dataset si aggiorna senza ricostruirla.
#   docker run -v ./packages/geo/data:/data:ro -p 3000:3000 undicesimacasa
VOLUME /data

CMD ["node", "apps/web/build/index.js"]
