# Server MCP

Riferimento essenziale di `packages/mcp`: otto tool e due risorse su trasporto
stdio. Le descrizioni dei tool contengono già le regole d'uso — un agente che
parla MCP non ha bisogno del prompt di [prompt-lettura.md](prompt-lettura.md).

## Avvio

```sh
npm run build
node packages/mcp/dist/stdio.js
```

Configurazione di un client (Claude Code, Claude Desktop, un IDE):

```json
{
  "mcpServers": {
    "undicesimacasa": {
      "command": "node",
      "args": ["/percorso/undicesimacasa/packages/mcp/dist/stdio.js"]
    }
  }
}
```

Il pacchetto dichiara il binario `undicesimacasa-mcp`, che una volta pubblicato
renderà superfluo il percorso assoluto.

Su stdio lo standard output è riservato al protocollo: qualunque diagnostica va
su stderr, altrimenti corrompe i messaggi JSON-RPC.

| Variabile | Serve a |
|---|---|
| `GEONAMES_DB_PATH` | database delle località, se non è quello del pacchetto `geo` |
| `SE_EPHE_PATH` | cartella dei file `.se1`; senza, il motore usa Moshier |

## I tool

Ognuno accetta `format`: `compact` (default, tabella densa pensata per non
bruciare contesto) oppure `json` (la struttura completa del motore).

Le date vanno passate **in ora locale**, come sono segnate sul documento di
nascita: il server non converte. Per il presente la data **va omessa** — la mette
il server, che è la sola fonte a saperla.

### `search_location`

Nome → candidati con `location_id`, coordinate e fuso IANA.

| Parametro | |
|---|---|
| `query` | obbligatorio; riconosce gli esonimi, es. «Monaco di Baviera» |
| `country_code` | ISO 3166-1 alpha-2 |
| `limit` | 1–50, default 10 |

Va chiamato **prima** di ogni calcolo quando si ha un nome di città invece di
coordinate note: nessun altro tool fa geocoding, e la disambiguazione è separata
di proposito ([perché](../README.md#server-mcp)).

### `compute_natal_chart`

Posizioni, case, assi e aspetti di un tema natale.

| Parametro | |
|---|---|
| `date` | obbligatoria, `YYYY-MM-DD` locale |
| `time` | `HH:mm`; **se ignota si omette** → carta senza case né assi |
| `location_id` | da `search_location` |
| `latitude`, `longitude`, `timezone` | la terna, alternativa a `location_id` |
| `house_system` | `placidus` (default), `koch`, `segni-interi`, `equale`, `regiomontano`, `campano`, `porfirio`, `topocentrico`, `alcabizio` |
| `minor_aspects` | default `false` |
| `part_of_fortune_formula` | `settore` (default) o `diurna` |

### `draw_chart_wheel`

Gli stessi parametri di nascita, più il disegno. Restituisce un'**immagine PNG**
— non SVG, che un modello leggerebbe come testo.

| Parametro | |
|---|---|
| `with_transits` | bi-ruota: transitanti nell'anello esterno |
| `transit_date`, `transit_time`, `transit_timezone` | l'istante, con `with_transits` |
| `theme` | `chiaro` (default) o `scuro` |
| `width` | 400–2000, default 900 |

Va chiamato **dopo** `compute_natal_chart`, non al posto suo: un disegno non
contiene le avvertenze del calcolo. Ogni immagine viaggia con una riga che
dichiara di quale carta sia — due ruote di due persone diverse si somigliano
abbastanza da confondersi. I 900 punti predefiniti sono il punto in cui i glifi
restano leggibili senza che l'immagine costi il quadruplo dei token: alzarli
serve solo se chi guarda dice di non riuscire a leggerli.

### `compute_transits`

Il tema più il cielo di un istante messo in rapporto con lui.

| Parametro | |
|---|---|
| *nascita* | `date`, `time`, `location_id` o la terna |
| `transit_date`, `transit_time`, `transit_timezone` | l'istante; ometti la data per adesso |
| `transit_location_id`, `transit_latitude`, `transit_longitude` | il luogo da cui si guarda: aggiunge assi e case **dell'istante** |
| `house_system`, `minor_aspects` | come sopra |

### `find_transit_passages`

Gli istanti in cui i transiti si perfezionano: la risposta a *quando* e *quante
volte*, che `compute_transits` non può dare.

| Parametro | |
|---|---|
| *nascita* | come sopra |
| `from`, `to` | arco; ometti `from` per oggi, `to` vale un anno dopo, massimo 1096 giorni |
| `timezone_range` | fuso in cui leggere date e istanti; default quello di nascita |
| `bodies` | transitanti da seguire; default tutti tranne la Luna |
| `targets` | punti natali da bersagliare; default corpi, ASC e MC |
| `minor_aspects` | |

Un pianeta lento che retrograda tocca lo stesso punto tre volte: quelle tre righe
sono **un solo periodo letto in tre momenti**, non tre fatti distinti.

### `compute_sky`

Il cielo di un istante. **Nessun parametro obbligatorio.**

| Parametro | |
|---|---|
| `date`, `time`, `timezone` | ometti tutto per adesso; default UTC |
| `location_id`, oppure `latitude` e `longitude` insieme | facoltativo: senza, niente assi né case |
| `house_system`, `minor_aspects` | |

Senza una nascita non esistono transiti, esiste solo il cielo. Con una nascita, il
cielo da solo non basta.

### `find_sky_events`

Che cosa accade in cielo in un arco, senza riferirlo a nessuno: incontri fra due
corpi (noviluni e pleniluni compresi), ingressi nei segni, stazioni.

| Parametro | |
|---|---|
| `from`, `to` | ometti `from` per oggi; massimo 1096 giorni |
| `timezone` | default UTC |
| `include` | `["incontri"]`, `["ingressi"]`, `["stazioni"]` — accorcia la risposta |
| `bodies` | default tutti tranne la Luna; chiedila per nome per le lunazioni |
| `minor_aspects` | |

Sta a `find_transit_passages` come `compute_sky` sta a `compute_transits`.

### `find_election_hours`

Ore planetarie con il loro reggitore, Ascendente che sorge all'inizio di
ciascuna, tratti in cui la Luna è vuota di corso.

| Parametro | |
|---|---|
| `location_id`, oppure `latitude`, `longitude`, `timezone` | **obbligatorio, senza alternative** |
| `from`, `to` | default oggi; `to` vale `from`; massimo 31 giorni |
| `rulers` | solo le ore rette da questi pianeti — indispensabile su archi lunghi |
| `bodies` | corpi il cui incontro toglie la Luna dal vuoto; default i sei classici |
| `skip_moon_void` | scarta le ore attraversate da un vuoto; i vuoti restano elencati |

È l'unico tool che pretenda il luogo senza alternative: alba e tramonto vengono
da lì, e senza di loro non ci sono ore planetarie. Il risultato non contiene
raccomandazioni e non è una classifica.

## Le risorse

Caricate solo quando servono, per non occupare contesto a ogni conversazione:

| URI | Contenuto |
|---|---|
| `undicesimacasa://riferimento/aspetti` | angoli e orbite, natali e di transito |
| `undicesimacasa://riferimento/sistemi-case` | i nove sistemi, con il criterio di divisione |

## Errori

Un errore torna come **risultato** con `isError: true`, non come eccezione, e il
messaggio suggerisce il rimedio: è fatto per essere letto e corretto alla
chiamata successiva ([perché](../README.md#server-mcp)).

Le avvertenze del calcolo (`warnings`) compaiono nella risposta e vanno riferite:
sono il punto in cui il risultato dichiara di essere incompleto.
