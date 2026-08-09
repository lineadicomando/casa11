# API HTTP

Riferimento essenziale degli endpoint di `apps/web`. Per il prompt completo di
un agente che legge il tema, vedi [prompt-lettura.md](prompt-lettura.md); qui ci
sono i parametri, e in fondo tre istruzioni di progetto brevi da incollare.

Base URL in locale: `http://localhost:3000` (`npm start -w @undicesimacasa/web`,
dopo `npm run build`) oppure `http://localhost:5173` in sviluppo.

**Tutti gli endpoint sono in GET**: un tema è una funzione pura dei suoi
parametri, quindi l'URL è condivisibile e la risposta memorizzabile. Le risposte
sono JSON, tranne le due ruote.

| Endpoint | Cosa restituisce | Nascita | Luogo |
|---|---|---|---|
| `/api/locations` | candidati con `id`, coordinate, fuso | — | — |
| `/api/chart` | il tema natale | obbligatoria | obbligatorio |
| `/api/chart/wheel` | la ruota, `image/svg+xml` o `image/png` | obbligatoria | obbligatorio |
| `/api/transits` | tema **e** transiti a un istante | obbligatoria | obbligatorio |
| `/api/transits/wheel` | la bi-ruota, immagine | obbligatoria | obbligatorio |
| `/api/transits/passages` | gli istanti in cui i transiti si perfezionano | obbligatoria | obbligatorio |
| `/api/sky` | il cielo di un istante | — | facoltativo |
| `/api/sky/calendar` | incontri, ingressi, stazioni di un arco | — | — |
| `/api/election` | ore planetarie, Ascendente, vuoti di corso | — | **obbligatorio** |

## Gruppi di parametri comuni

### Il luogo

`locationId` (identificatore GeoNames da `/api/locations`) **oppure** la terna
completa `latitude` + `longitude` + `timezone`. Senza uno dei due:
`LUOGO_MANCANTE`.

I due modi si possono anche **combinare**: con `locationId` più `latitude` e/o
`longitude`, la località fornisce fuso orario e nome mentre le coordinate
vengono da chi chiama. Serve a chi conosce il punto esatto di nascita, o a chi
riproduce il risultato di un altro programma — le cuspidi dipendono dalle
coordinate. La risposta segnala il caso con `place.refined: true`.

Il fuso orario resta legato alla località di proposito: è il dato in cui
sbagliare costa di più, e un valore errato ma valido non è intercettabile.

### Le opzioni del tema

| Parametro | Valori | Default |
|---|---|---|
| `houseSystem` | `placidus`, `koch`, `segni-interi`, `equale`, `regiomontano`, `campano`, `porfirio`, `topocentrico`, `alcabizio` | `placidus` |
| `minorAspects` | `true` per semisestile, quinconce, semiquadrato, sesquiquadrato | `false` |
| `partOfFortuneFormula` | `settore` (si inverte nei temi notturni), `diurna` | `settore` |

### L'arco di tempo

`from` e `to` in `YYYY-MM-DD`. Senza `from` si parte da oggi; senza `to` si
arriva a un anno dopo — tranne nell'elezione, dove `to` vale `from`, cioè un
giorno solo. Il massimo è **1096 giorni** (tre anni), **31 giorni** per
l'elezione.

### Il disegno

Valgono per i due `…/wheel`. Un valore non riconosciuto viene rifiutato, non
ricondotto al predefinito.

| Parametro | Valori | Default |
|---|---|---|
| `format` | `svg`, `png` | `svg` |
| `theme` | `chiaro`, `scuro` | `chiaro` |
| `width` | 200–4000 punti, **solo con `format=png`** | 1704 |

## La cache

Una regola sola, che vale ovunque e si legge in `cache-control`:

| Risposta | Intestazione |
|---|---|
| Porta dati di nascita (`/api/chart`, `/api/transits`, le due ruote, i passaggi) | `private, max-age=86400` — memorizzabile, ma solo dal browser di chi l'ha chiesta: la chiave di quella cache è un indirizzo che contiene data, ora e luogo di nascita |
| Non porta nessuna nascita (`/api/sky`, `/api/sky/calendar`, `/api/election`) | `public, max-age=86400` — il cielo di un istante è lo stesso per tutti e non è di nessuno |
| `/api/locations` | `public, max-age=3600` — il dataset cambia solo quando lo si reimporta |
| Vale «adesso» o «oggi», cioè la richiesta non nomina il giorno | `no-store`, comunque — invecchia mentre la si legge, e conservarla significherebbe mostrare domani il cielo di oggi |

## Gli endpoint

### `GET /api/locations`

```
/api/locations?q=napoli&limit=8&country=IT
/api/locations?id=3172394
```

- `q` — nome, almeno 2 caratteri; sotto quella soglia risponde `{"results": []}`
  senza errore. Riconosce esonimi e nomi locali.
- `limit` — massimo di candidati, default 10, tetto 50.
- `country` — codice ISO 3166-1 alpha-2.
- `id` — un identificatore preciso, in alternativa a `q`: restituisce un solo
  risultato o nessuno, nella stessa forma di sempre.

```json
{ "results": [ { "id": 3172394, "name": "Napoli", "region": "Campania",
  "country": "Italia", "countryCode": "IT", "latitude": 40.8518,
  "longitude": 14.2681, "timezone": "Europe/Rome", "population": 959188 } ] }
```

Ordinati per popolazione, senza sceglierne uno: la disambiguazione spetta a chi
chiama.

### `GET /api/chart`

```
/api/chart?date=1968-03-12&time=14:30&locationId=3172394
/api/chart?date=1968-03-12&latitude=40.85&longitude=14.27&timezone=Europe/Rome
```

- `date` (obbligatoria) — `YYYY-MM-DD`, ora **locale** come segnata sul
  documento di nascita.
- `time` — `HH:mm` o `HH:mm:ss`. **Se ignota, va omessa**: la risposta esce
  senza `houses`, `angles`, `partOfFortune` e `sect`, con un'avvertenza. Non è
  un errore, è una carta senza case.
- `format` — `json` (default) oppure `compact`, che restituisce
  `text/plain`: la stessa tabella che il server MCP dà ai suoi agenti, circa un
  ottavo dei token, con il nome del luogo in testa. Un valore diverso è
  `FORMATO_NON_VALIDO`, non un ripiego silenzioso sul JSON.
- più il luogo e le opzioni del tema.

```json
{ "chart": { "input": {…}, "time": {…}, "houseSystem": "placidus",
  "ephemerisMode": "swisseph", "bodies": […], "houses": […], "angles": {…},
  "partOfFortune": {…}, "sect": "diurna", "siderealTime": {…},
  "aspects": […], "distribution": {…}, "warnings": [] },
  "place": { "label": "Napoli, Campania, Italia", "refined": false } }
```

`place` è l'etichetta della località, e manca del tutto quando il luogo è stato
dato come coordinate: due numeri non hanno un nome.

### `GET /api/chart/wheel`

Gli stessi parametri di `/api/chart`, più quelli del disegno. Non aggiunge
niente al calcolo: gli stessi dati in forma di immagine.

**Nessuna avvertenza compare nel disegno** — un disegno non ha modo di dirle.
Chi lo mostra dovrebbe aver chiesto anche `/api/chart`.

### `GET /api/transits`

```
/api/transits?date=1968-03-12&time=14:30&locationId=3172394&transitDate=2026-08-15
/api/transits?…&transitDate=2026-08-15&transitTime=09:00&transitLocationId=1850147
```

I parametri della nascita sono quelli di `/api/chart`: un indirizzo che calcola
un tema ne calcola i transiti cambiando solo il percorso. In più:

- `transitDate`, `transitTime`, `transitTimezone` — l'istante. Senza
  `transitDate` valgono adesso e oggi. Senza `transitTime` il motore ripiega su
  mezzogiorno e lo dichiara fra le avvertenze.
- `transitLocationId`, oppure `transitLatitude` e `transitLongitude` insieme —
  il luogo da cui si guarda, facoltativo. Non sposta i corpi né le case natali
  in cui cadono: aggiunge assi e case **dell'istante**. Indicandolo, il fuso
  predefinito dell'istante diventa il suo; altrimenti è quello di nascita.

Risponde con il tema **e** i transiti: le posizioni natali servono comunque a
leggere il quadro. `{ "chart": {…}, "transits": {…}, "place": {…}, "transitPlace": {…} }`.

### `GET /api/transits/wheel`

I parametri di calcolo di `/api/transits` più quelli del disegno. La bi-ruota:
il tema al centro, i transitanti in un anello esterno e, fra i due, le linee dei
loro aspetti al tema — non quelle interne al tema.

### `GET /api/transits/passages`

```
/api/transits/passages?date=1968-03-12&time=14:30&locationId=3172394&from=2026-01-01&to=2026-12-31
```

I parametri della nascita, più l'arco. È la risposta a *quando* e a *quante
volte*: un pianeta lento che retrograda passa tre volte sullo stesso punto
natale, e quelle tre righe sono un solo periodo letto in tre momenti.

- `from`, `to` — l'arco; il fuso in cui leggerlo è `transitTimezone`, altrimenti
  quello di nascita.
- `moon=true` — include la Luna, esclusa perché da sola perfeziona qualche
  migliaio di aspetti all'anno.

`{ "chart": {…}, "range": {…}, "passages": […], "warnings": [], "place": {…} }`

### `GET /api/sky`

```
/api/sky?date=2026-08-01&time=18:30&timezone=Europe/Rome
/api/sky
```

Il cielo di un istante, senza nessuna nascita. **Nessun parametro è
obbligatorio**: senza `date` vale adesso, senza `timezone` vale UTC (o il fuso
della località, se ne è stata indicata una).

Il luogo — `locationId`, oppure `latitude` e `longitude` **insieme** — può
mancare del tutto. Senza luogo la risposta non ha assi né case, che è la
differenza fra un'effemeride e una carta.

`{ "sky": {…}, "place": {…} }`

### `GET /api/sky/calendar`

```
/api/sky/calendar?from=2026-01-01&to=2026-12-31&timezone=Europe/Rome&bodies=sole,luna
```

Che cosa succede in cielo in un arco: incontri fra due corpi, ingressi nei segni,
stazioni. Nessuna nascita e **nessun luogo** — qui niente dipende da dove si
guarda, nemmeno le case.

- `from`, `to`, `timezone` (default UTC).
- `bodies` — elenco separato da virgola. Senza, tutti tranne la Luna, che in un
  anno riempirebbe l'elenco da sola; chiederla per nome è l'unico modo di avere
  le lunazioni.
- `minorAspects=true`.

`{ "range": {…}, "passages": […], "ingresses": […], "stations": […], "warnings": [] }`

### `GET /api/election`

```
/api/election?locationId=2523920&from=2029-08-24&to=2029-08-26&rulers=giove,venere
```

Di che cosa è fatto il tempo in un luogo: le ore planetarie con il loro
reggitore, l'Ascendente che sorge all'inizio di ognuna, i tratti in cui la Luna è
vuota di corso.

Nessuna nascita, ma il luogo è **obbligatorio e senza alternative**: alba e
tramonto vengono da lì, e senza di loro non ci sono ore planetarie.

- `from`, `to` — massimo 31 giorni, perché ogni giorno porta ventiquattro righe.
  Senza, oggi.
- `rulers` — restringe alle ore rette da quei pianeti. Su archi lunghi serve: un
  mese sono più di settecento ore.
- `bodies` — i corpi il cui incontro toglie la Luna dal vuoto di corso. Default:
  i sei classici.
- `skipMoonVoid=true` — scarta le ore che un vuoto attraversa; i vuoti restano
  elencati, perché sono la ragione per cui quelle ore mancano.

`{ "range": {…}, "place": {…}, "hours": […], "voids": […], "filters": {…}, "warnings": [] }`
— `filters` compare solo se un filtro è stato applicato: un elenco ridotto che
non dichiari di esserlo si legge come completo.

Non contiene raccomandazioni e non ne conterrà: dice quale pianeta regge un'ora,
non se quell'ora sia buona per qualcosa.

## Errori

Corpo `{ "message": "…", "code": "…" }` con lo status HTTP appropriato. Il `code`
è stabile: è su quello che si ramifica, non sul messaggio.

| Codice | Status | Che cosa fare |
|---|---|---|
| `DATA_MANCANTE`, `DATA_NON_VALIDA`, `ORA_NON_VALIDA` | 400 | chiedi il dato giusto |
| `DATA_TRANSITO_NON_VALIDA`, `ORA_TRANSITO_NON_VALIDA`, `FUSO_TRANSITO_NON_VALIDO` | 400 | riguardano l'istante del transito, non la nascita |
| `LUOGO_MANCANTE` | 400 | mancano sia `locationId` sia la terna completa |
| `LUOGO_INCOMPLETO` | 400 | una sola delle due coordinate: indicale entrambe o omettile |
| `LOCALITA_NON_VALIDA`, `LOCALITA_SCONOSCIUTA` | 400 / 404 | l'id è malformato o non esiste: rifai la ricerca |
| `QUERY_VUOTA` | 400 | `q` non contiene nessun carattere cercabile: sola punteggiatura |
| `COORDINATE_NON_VALIDE`, `FUSO_ORARIO_NON_VALIDO`, `SISTEMA_CASE_NON_VALIDO`, `FORMULA_FORTUNA_NON_VALIDA` | 400 | input da correggere |
| `CORPO_SCONOSCIUTO` | 400 | corpo inesistente, o — nell'elezione — un pianeta che non regge ore |
| `INTERVALLO_NON_VALIDO`, `INTERVALLO_TROPPO_LUNGO` | 400 | arco rovesciato o oltre il tetto: chiedine uno più breve |
| `FORMATO_NON_VALIDO`, `TEMA_NON_VALIDO`, `LARGHEZZA_NON_VALIDA`, `LARGHEZZA_SENZA_PNG` | 400 | riguardano il disegno |
| `DATABASE_ASSENTE`, `DATABASE_CORROTTO` | 503 | il dataset delle località non è stato importato: il calcolo funziona ancora con coordinate e fuso espliciti |
| `ERRORE_EFFEMERIDI`, `ERRORE_INTERNO` | 500 | problema del server: dillo, non riprovare all'infinito |

Il fallimento è parziale: un corpo non calcolabile finisce in `warnings`, non in
un errore. Le avvertenze vanno lette e riferite — sono il posto in cui la
risposta dice di essere incompleta.

## Istruzioni di progetto per un agente

I prompt qui sotto sono la versione breve, da incollare nella casella delle
istruzioni di un progetto. Quella completa — con procedura, vincoli inviolabili
e criteri di lettura — sta in [prompt-lettura.md](prompt-lettura.md).

Prima di usarli, sostituire `{BASE_URL}` con l'origine del servizio. Un agente
che parla MCP non ha bisogno di nessuno di questi: vedi [mcp.md](mcp.md).

### Nucleo comune (qualunque piattaforma)

```text
Calcoli e interpreti temi natali. Il calcolo NON lo fai tu: lo chiedi all'API di
undicesimacasa su {BASE_URL} e ti limiti a leggere i dati che restituisce.
L'interpretazione è tuo compito.

Endpoint, tutti in GET e con risposta JSON:
- /api/locations?q=<nome>&country=<ISO2> → candidati con id, coordinate, fuso IANA
- /api/chart?date=<YYYY-MM-DD>&time=<HH:mm>&locationId=<id> → il tema
- /api/chart/wheel?<gli stessi>&format=png → la ruota come immagine
- /api/transits?<gli stessi>&transitDate=<YYYY-MM-DD> → transiti a un istante
- /api/transits/passages?<gli stessi>&from=&to= → quando i transiti diventano esatti
- /api/sky → il cielo di un istante, senza nessuna nascita
- /api/sky/calendar?from=&to= → incontri, ingressi nei segni, stazioni
- /api/election?locationId=<id>&from=&to= → ore planetarie e vuoti di corso della Luna

Procedura: chiedi data, ora e luogo di nascita. Risolvi SEMPRE il luogo con
/api/locations e usa il locationId che ne esce. Poi chiama /api/chart. Leggi il
tema solo dai campi della risposta.

Regole che non puoi violare:
1. Non calcolare a mente e non stimare posizioni, case o aspetti: se l'API non
   ha risposto, non hai il dato.
2. Non inventare coordinate né fusi orari. Vengono da /api/locations. Se i
   candidati sono più d'uno e plausibili, chiedi quale, invece di scegliere il
   più popoloso.
3. Passa data e ora COME SONO SEGNATE sul documento di nascita, in ora locale.
   Non convertirle tu in UTC e non applicare tu l'ora legale.
4. Se l'ora di nascita è ignota, OMETTI time. Uscirà una carta senza case né
   assi: dillo, e non parlare di Ascendente, Medio Cielo o case.
5. Per il presente ometti la data: la mette il server. Non scrivere una data che
   credi corrente.
6. Riferisci sempre il contenuto di "warnings": è il punto in cui la risposta
   dichiara di essere incompleta.
7. Un errore arriva come {"message","code"}: leggi il code, correggi il
   parametro, non ritentare identico.
8. Senza una nascita non esistono transiti, esiste solo il cielo: usa /api/sky.
   Non inventare una data di nascita per poter chiamare /api/transits.
9. Il disegno non contiene le avvertenze del calcolo: chiedi la ruota dopo il
   tema, mai al posto suo.

Distingui sempre il dato dall'interpretazione: le posizioni sono verificabili, il
significato è una lettura. Non fare diagnosi mediche, previsioni legali o
finanziarie, e non predire morte, malattia o eventi datati.
```

### Claude — istruzioni di progetto

Un Progetto su claude.ai chiama l'API solo se ha uno strumento per farlo: un
connettore o il server MCP di questo repo. Se il connettore c'è, il nucleo qui
sopra funziona così com'è; conviene aggiungere in testa:

```text
Per raggiungere l'API usa lo strumento di richiesta HTTP disponibile in questo
progetto. Se non ne hai nessuno, dillo subito invece di rispondere a memoria: un
tema calcolato a mente è plausibile e sbagliato, che è il modo peggiore di
sbagliare.

Fai una chiamata per volta e mostra l'URL che stai chiamando prima di
interpretare: chi legge deve poter verificare su quali dati stai parlando.
```

Con Claude Code o Claude Desktop, il server MCP è la strada giusta e rende
superflue queste istruzioni: le descrizioni dei tool contengono già le stesse
regole. Vedi [mcp.md](mcp.md).

### ChatGPT — GPT personalizzato

Un GPT raggiunge l'API tramite **Action**, che richiede un `{BASE_URL}`
pubblico e raggiungibile: `localhost` non funziona. Configurata l'Action sui nove
percorsi, il nucleo va nelle istruzioni con questa aggiunta:

```text
Chiami l'API tramite le Action configurate in questo GPT. I nomi delle Action
corrispondono ai percorsi: usale, non tentare di raggiungere l'API in altro modo
e non rispondere con calcoli tuoi se un'Action fallisce.

Se un'Action restituisce 4xx, leggi "code" nel corpo, correggi quel parametro e
richiama. Se restituisce 5xx o 503, fermati e dillo.
```

Nota: essendo GET con i parametri nell'indirizzo, ogni chiamata porta data, ora e
luogo di nascita nell'URL. Se l'istanza è pubblica, vedi
[proxy-e-log.md](proxy-e-log.md) prima di esporla.

### Gemini — Gem

Un Gem non ha uno strumento di richiesta HTTP generico: può raggiungere l'API
solo se ha la navigazione attiva e `{BASE_URL}` è pubblico. Il nucleo va nelle
istruzioni del Gem con questa aggiunta:

```text
Per ottenere i dati apri gli indirizzi dell'API con la navigazione e leggi il
JSON che restituiscono. Sono URL diretti, senza autenticazione.

Se non riesci ad aprirli — navigazione non disponibile, indirizzo non
raggiungibile — NON rispondere con un tema calcolato da te: spiega che il
calcolo non è disponibile e fermati.
```

Se la navigazione non è disponibile, l'alternativa onesta è calcolare il tema
altrove — con la CLI, vedi [cli.md](cli.md) — e incollare il JSON nella
conversazione. In quel caso, sostituisci al nucleo:

```text
Ricevi il tema già calcolato, in JSON, incollato nella conversazione. Non
calcolare nulla e non integrare da altre fonti: se un dato non è nel JSON, non
ce l'hai. Leggi "warnings" e riferiscilo. Interpreta solo ciò che vedi.
```
