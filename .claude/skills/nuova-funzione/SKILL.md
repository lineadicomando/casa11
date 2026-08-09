---
name: nuova-funzione
description: Usare quando si AGGIUNGE o si ESTENDE una funzione di calcolo di undicesimacasa che deve arrivare agli utenti o agli agenti — nuovo calcolo in core, nuovo endpoint /api, nuovo tool MCP, nuova sezione dell'interfaccia, nuova opzione della CLI. Elenca le superfici da attraversare (core, CLI, web, MCP, README, docs/) e come spezzarle in commit. Trigger: nuovo calcolo, nuovo endpoint, nuovo tool MCP, nuova sezione, esporre agli agenti, nuova opzione CLI.
---

# Aggiungere una funzione a undicesimacasa

Il progetto ha un motore solo e **cinque superfici** che lo raccontano. Una
funzione che si ferma a metà lascia `docs/api.md` che descrive otto endpoint
quando ne esistono nove, o un tool MCP che nessun prompt sa di poter chiamare.
Il lavoro non è finito finché tutte le superfici pertinenti sono allineate.

## Le superfici

```
packages/core/src/<funzione>.ts     il calcolo
  ├── types.ts                      i tipi del risultato
  ├── index.ts                      l'export pubblico
  ├── format.ts                     formatXxxCompact — la resa densa per gli agenti
  ├── cli.ts                        le opzioni di casa11
  └── test/<funzione>.test.ts       obbligatorio

apps/web/
  ├── src/routes/api/<...>/+server.ts   endpoint GET
  ├── src/lib/server/{place,birth,moment,range}.ts   lettura parametri, già condivisa
  ├── src/lib/api.ts                    chiamata lato client
  ├── src/lib/components/<Xxx>Table.svelte
  ├── src/routes/<sezione>/+page.svelte
  └── src/lib/navigation.ts             se è una sezione nuova

packages/mcp/
  ├── src/tools.ts                  registerXxx(server, context)
  ├── src/server.ts                 la registrazione
  └── test/server.test.ts           obbligatorio

README.md                           la sezione descrittiva: perché la funzione è così
docs/api.md                         il nuovo endpoint fra i suoi parametri
docs/mcp.md                         il nuovo tool fra i suoi parametri
docs/cli.md                         le nuove opzioni di casa11
docs/prompt-lettura.md              il contratto che gli agenti leggono davvero
```

**README e `docs/` non si ripetono**: il README dice il perché e non elenca i
parametri, `docs/` elenca i parametri e rimanda al README per il perché.

## Procedura

1. **Il calcolo, in `core`.** Funzione pura, nessuna nozione di HTTP o MCP.
   Tipi in `types.ts`, export da `index.ts`, un `formatXxxCompact` in
   `format.ts` se il risultato è destinato anche agli agenti. Test con valori
   attesi verificabili, non snapshot.
2. **La CLI**, se la funzione ha senso da riga di comando: è il modo più
   economico di provarla prima che esistano le altre superfici.
3. **Le superfici**, insieme: endpoint, interfaccia, tool MCP. Riusa
   `lib/server/*` per leggere i parametri invece di riscriverne la validazione,
   e fa' che le tabelle prendano i dati, non il tema.
4. **La documentazione**, per ultima e mai omessa: la sezione descrittiva del
   README, il riferimento in `docs/api.md`, `docs/mcp.md` o `docs/cli.md`
   secondo la superficie toccata, e `docs/prompt-lettura.md` (numero dello
   strumento, parametri, errori, e la variante MCP in fondo).
5. `npm test && npm run typecheck`.

## I commit

Uno per fase, nell'ordine in cui il repo li ha sempre avuti:

```
Trova gli ingressi nei segni e le stazioni          → core + cli + test
Mostra il calendario del cielo nell'interfaccia e agli agenti → web + mcp
Documenta il calendario del cielo e ne apre i corpi via HTTP  → README + docs
```

Italiano, indicativo presente terza persona, nessun prefisso convenzionale.

## Regole che valgono qui più che altrove

- **Non far scegliere in silenzio.** `compute_natal_chart` non fa geocoding
  perché scegliere fra le decine di «Roma» del mondo produce un tema plausibile
  e sbagliato. Ogni disambiguazione resta un passo esplicito.
- **La data di adesso la mette il server.** Nelle descrizioni dei tool MCP, i
  parametri temporali vanno dichiarati omissibili e l'agente va istruito a non
  compilarli: `transit_date`, `from`, `date`.
- **Le descrizioni dei tool dicono anche cosa non fare.** È lì che un modello
  inventa una data di nascita per poter chiamare `compute_transits`.
- **Niente interpretazione nei dati.** Il calcolo è verificabile, il significato
  è di chi consuma.
- **Nel client di `apps/web` si importano solo tipi da `core`.** Un import di
  valore trascina le effemeridi nel bundle del browser.
- Se il risultato può crescere senza limite (un arco di date), serve un tetto —
  `MAX_RANGE_DAYS` in `tools.ts` e `lib/server/range.ts` sono il precedente.
