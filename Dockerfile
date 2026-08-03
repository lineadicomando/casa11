# syntax=docker/dockerfile:1

# ── Dipendenze ───────────────────────────────────────────────────────────────
# `sweph` è un binding N-API: pubblica dei prebuild per le architetture comuni,
# ma senza si passa da node-gyp. Gli strumenti di compilazione restano quindi
# in questo stage, condiviso da build e sviluppo, e non finiscono nel runtime.
FROM node:24-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Prima i manifesti: il livello delle dipendenze resta in cache finché non cambiano.
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/geo/package.json packages/geo/
COPY packages/mcp/package.json packages/mcp/
COPY packages/ruota/package.json packages/ruota/
COPY apps/web/package.json apps/web/

# `--ignore-scripts` evita che `prepare` giri prima che i sorgenti esistano,
# ma salta anche lo script d'installazione di `sweph`, l'unico che serve:
# lo si riesegue da solo. `node-gyp-build` usa il prebuild se c'è, altrimenti
# compila con la toolchain qui sopra — senza questo passo, su un'architettura
# priva di prebuild l'errore emergerebbe solo a runtime.
RUN npm ci --ignore-scripts \
  && npm rebuild sweph


# ── Sviluppo ─────────────────────────────────────────────────────────────────
# I sorgenti non vengono copiati: arrivano dal bind mount di compose, così una
# modifica si vede senza ricostruire nulla. Qui serve solo la toolchain
# completa — devDependencies comprese — e la porta di Vite.
#
# Lo stage gira come root di proposito: è l'unico che scrive nella cartella
# montata dall'host. Con podman rootless root nel container è l'utente host,
# quindi i file generati (dist, .svelte-kit) restano suoi.
FROM deps AS dev

ENV NODE_ENV=development \
    GEONAMES_DB_PATH=/data/geonames.db

EXPOSE 5173

CMD ["npm", "run", "dev", "-w", "@undicesimacasa/web", "--", "--host", "0.0.0.0"]


# ── Compilazione ─────────────────────────────────────────────────────────────
FROM deps AS build

COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/ apps/

RUN npm run build -w @undicesimacasa/ruota -w @undicesimacasa/core -w @undicesimacasa/geo \
  && npm run build -w @undicesimacasa/mcp \
  && npm run build -w @undicesimacasa/web

# Dati non versionati, scaricati in fase di build.
# Le effemeridi (~2 MB) stanno nell'immagine; il dataset delle località
# (~90 MB) è troppo grande e resta su volume — vedi GEONAMES_DB_PATH sotto.
RUN npm run ephe:download -w @undicesimacasa/core

# Ripulisce le dipendenze di sviluppo prima di copiare nell'immagine finale.
RUN npm prune --omit=dev --ignore-scripts


# ── Runtime ──────────────────────────────────────────────────────────────────
# Una sola immagine per tre superfici: applicazione web, server MCP e
# importazione del dataset. Condividono lo stesso codice e le stesse
# dipendenze, cambia solo il comando — vedi compose.yaml.
FROM node:24-bookworm-slim AS runtime

WORKDIR /app

# I glifi della ruota sono caratteri Unicode, non tracciati: il disegno conta
# di trovarli in un font di sistema, e in un'immagine `slim` di font non ce n'è
# nessuno. Senza, il PNG non esce con dei glifi sbagliati — esce **senza testo
# affatto**: niente pianeti, niente numeri delle case, niente sigle degli assi.
# Una ruota di sole linee, che sembra riuscita finché non la si legge, e che
# nessun errore segnala. DejaVu è l'unico font diffuso che li porti tutti, `⊗`
# della Parte di Fortuna compreso; sono un paio di megabyte.
#
# Il pacchetto da solo non basta: resvg li cerca via fontconfig, che qui non
# c'è, e va indirizzato alle cartelle — vedi `CARTELLE_DI_SISTEMA` in
# `packages/ruota/src/png.ts`.
RUN apt-get update \
  && apt-get install -y --no-install-recommends fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

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
COPY --from=build /app/packages/geo/scripts packages/geo/scripts/
COPY --from=build /app/packages/geo/package.json packages/geo/
COPY --from=build /app/packages/mcp/dist  packages/mcp/dist/
COPY --from=build /app/packages/mcp/package.json packages/mcp/
COPY --from=build /app/packages/ruota/dist packages/ruota/dist/
COPY --from=build /app/packages/ruota/package.json packages/ruota/
COPY --from=build /app/apps/web/build     apps/web/build/
COPY --from=build /app/apps/web/package.json apps/web/

# Due punti di mount: `/data` per il database delle località e la cartella di
# cache dell'importazione, dove finiscono i dump GeoNames (~215 MB). Vanno
# creati qui perché un volume eredita i permessi del mountpoint: senza questo
# `chown` sarebbero di root e l'utente `node` non potrebbe scriverci.
RUN mkdir -p /data /app/packages/geo/data/cache \
  && chown -R node:node /data /app/packages/geo/data

USER node
EXPOSE 3000

CMD ["node", "apps/web/build/index.js"]
