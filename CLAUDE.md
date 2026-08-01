# undicesimacasa

Calcolo di temi natali: un **motore puro** (`packages/core`) e **adattatori** che
lo espongono su superfici diverse. Il `README.md` è la documentazione completa —
qui c'è solo ciò che serve sapere prima di toccare qualsiasi cosa.

## Mappa

| | |
|---|---|
| `packages/core` | motore di calcolo e CLI `casa11`. Nessuna dipendenza da HTTP, framework o MCP |
| `packages/geo` | ricerca località su dataset GeoNames locale (SQLite) |
| `packages/mcp` | server MCP: sei tool, trasporto stdio |
| `apps/web` | SvelteKit: interfaccia + API REST, tutti gli endpoint in GET |

Monorepo npm workspaces, Node ≥ 22, ESM, TypeScript.

## Comandi

```sh
npm test                                   # tutti i workspace (vitest)
npm run test:watch -w @undicesimacasa/core
npm run typecheck                          # ricompila core e geo, poi controlla il resto
npm run build
npm run dev -w @undicesimacasa/web         # http://localhost:3000
```

`npm run geo:import -w @undicesimacasa/geo` scarica **~205 MB**: serve solo se
la ricerca delle località non funziona, non va lanciato per abitudine.
`npm run ephe:download -w @undicesimacasa/core` (~2 MB) è opzionale — senza,
il motore usa Moshier invece delle effemeridi Swiss.

## Vincoli

- **Licenza AGPL-3.0-or-later**, imposta da Swiss Ephemeris. Ogni nuova
  dipendenza deve esserle compatibile.
- **Il motore non interpreta.** `core` produce dati verificabili; il significato
  è responsabilità di chi consuma. Non aggiungere testi interpretativi al calcolo.
- **Il client non importa valori da `@undicesimacasa/core`, solo tipi.** Un
  import di valore trascina effemeridi e modulo nativo nel bundle del browser.
- **Il fallimento è parziale**: un corpo non calcolabile produce un avviso, non
  un errore; l'ora ignota produce una carta senza case, non un rifiuto. Gli
  errori di dominio sono `ChartError` con un `code` mappabile su HTTP.
- Le tabelle Svelte prendono **i dati, non il tema**: legarle a `NatalChart`
  le rende inutilizzabili per i transiti.

## Stile

Messaggi di commit **in italiano, indicativo presente terza persona**, che
dicono cosa fa il codice e non cosa è stato fatto. Nessun prefisso tipo
`feat:`. Esempi reali: «Trova gli ingressi nei segni e le stazioni», «Espone i
transiti su /api/transits», «Accorpa l'asse dei Nodi nell'elenco degli aspetti».

Commenti e identificatori di dominio in italiano dove il dominio è italiano
(`incontri`, `ingressi`, `stazioni`, i `code` degli errori); il resto in inglese.

## Aggiungere una funzione

Attraversa più superfici e ha una procedura sua: vedi la skill `nuova-funzione`.
