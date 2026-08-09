# CLI `casa11`

Riferimento essenziale della riga di comando di `packages/core`. Stampa una
tabella compatta su stdout, o il JSON completo con `--json`.

## Invocazione

```sh
npm run build                                   # poi:
node packages/core/dist/cli.js --sky

npm run cli -w @undicesimacasa/core -- --sky    # in sviluppo, senza build
casa11 --sky                                    # se il pacchetto è installato
```

Il pacchetto dichiara il binario `casa11`. Gli esempi che seguono lo usano.

## Le cinque domande

Il comando risponde a cinque domande diverse, scelte dai flag. Le prime tre
partono da una nascita — `--date`, `--lat`, `--lon`, `--tz` obbligatori — le
ultime due no.

| Invocazione | Che cosa stampa |
|---|---|
| `casa11 --date …` | il tema natale |
| `casa11 --date … --transits` | i transiti a un istante |
| `casa11 --date … --passages` | quando i transiti diventano esatti |
| `casa11 --sky` | il cielo di un istante, senza nascita |
| `casa11 --sky --passages` / `--sky --events` | il calendario del cielo |
| `casa11 --elezione --lat … --lon …` | ore planetarie e vuoti di corso |

```sh
casa11 --date 1968-03-12 --time 14:30 --lat 40.8518 --lon 14.2681 --tz Europe/Rome
casa11 --date 1968-03-12 --time 14:30 --lat 40.8518 --lon 14.2681 --tz Europe/Rome \
       --transits --on 2026-08-15
casa11 --sky
casa11 --sky --events --from 2026-01-01 --to 2026-12-31
casa11 --elezione --lat 38.1157 --lon 13.3615 --tz Europe/Rome --reggitori giove,venere
```

La CLI non cerca le località: vuole coordinate e fuso. Il nome di una città lo
risolve `/api/locations` ([api.md](api.md)) o `search_location` ([mcp.md](mcp.md)).

## Opzioni

### Il tema

| | |
|---|---|
| `--date <YYYY-MM-DD>` | data di nascita locale (obbligatoria) |
| `--time <HH:mm>` | ora locale. **Se omessa, carta senza case né assi** |
| `--lat <gradi>` | latitudine, positiva a Nord (obbligatoria) |
| `--lon <gradi>` | longitudine, positiva a Est (obbligatoria) |
| `--tz <IANA>` | fuso orario, es. `Europe/Rome` (obbligatorio) |
| `--houses <sistema>` | `placidus` (default), `koch`, `segni-interi`, `equale`, `regiomontano`, `campano`, `porfirio`, `topocentrico`, `alcabizio` |
| `--minor` | include anche gli aspetti minori |
| `--fortuna <formula>` | Parte di Fortuna: `settore` (default, si inverte nei temi notturni) o `diurna` |
| `--json` | il JSON completo invece della tabella |
| `--ephe <percorso>` | cartella dei file `.se1` |
| `--help` | l'elenco completo delle opzioni |

### I transiti

| | |
|---|---|
| `--transits` | calcola i transiti sul tema invece del tema soltanto |
| `--on <YYYY-MM-DD>` | giorno del transito. Se omesso, adesso |
| `--at <HH:mm>` | ora del transito. Se omessa, mezzogiorno locale |
| `--transit-tz <IANA>` | fuso del transito. Se omesso, quello di nascita |
| `--transit-lat`, `--transit-lon` | luogo da cui si guarda: facoltativo, vanno insieme. Non sposta i corpi né le case natali in cui cadono; aggiunge assi e case dell'istante, e vuole anche `--at` |

Le opzioni del transito senza `--transits` (o `--sky`) sono un errore, non un
silenzio: chi le ha scritte aspetterebbe un risultato che non arriva.

### I passaggi

| | |
|---|---|
| `--passages` | gli istanti in cui i transiti si perfezionano |
| `--from <YYYY-MM-DD>` | inizio dell'arco. Se omesso, oggi |
| `--to <YYYY-MM-DD>` | fine. Se omessa, un anno dopo l'inizio |
| `--moon` | include la Luna, esclusa perché ne perfeziona a migliaia |

### Il cielo

`--sky` non richiede né data di nascita né luogo: `casa11 --sky` risponde subito.

| | |
|---|---|
| `--sky` | il cielo di un istante |
| `--on`, `--at` | giorno e ora. Se omessi, adesso e mezzogiorno |
| `--tz <IANA>` | fuso in cui leggere e scrivere l'istante. Se omesso, quello di sistema. Con `--sky` il fuso si indica così, non con `--transit-tz` |
| `--lat`, `--lon` | luogo da cui si guarda: facoltativo, vanno insieme. Serve solo ad assi e case, che vogliono anche l'ora |
| `--sky --passages` | il calendario degli incontri fra i corpi, con `--from`, `--to`, `--moon` |
| `--sky --events` | ingressi nei segni e stazioni, con `--from` e `--to` |

`--events` senza `--sky` è un errore: ingressi e stazioni non hanno un tema.

### L'elezione

| | |
|---|---|
| `--elezione` | ore planetarie, Ascendente e vuoti di corso della Luna |
| `--lat`, `--lon` | **obbligatorie**: alba e tramonto dipendono dal luogo |
| `--from`, `--to` | l'arco, al massimo 31 giorni. Se omessi, oggi |
| `--tz <IANA>` | fuso in cui leggere le date e scrivere le ore |
| `--reggitori <lista>` | solo le ore rette da questi, es. `giove,venere` |
| `--senza-vuoti` | scarta le ore che un vuoto di corso attraversa |

### Il disegno

| | |
|---|---|
| `--svg <file>` | salva la ruota come disegno vettoriale |
| `--png <file>` | salva la ruota come immagine |
| `--tema <chiaro\|scuro>` | colori. Default `chiaro`, il fondo su cui una carta viene stampata |
| `--larghezza <punti>` | larghezza del PNG, almeno 100. Default 1704 |

Vale anche con `--transits`, dove diventa una bi-ruota, e con `--sky`. Il nome
del file salvato va su stderr.

**La tabella si stampa lo stesso**: salvare un disegno non è un modo di non
vedere i dati, e un disegno non porta le avvertenze del calcolo.

## Codici d'uscita

| | |
|---|---|
| `0` | fatto |
| `1` | errore di dominio: `Errore [CODICE]: messaggio` su stderr |
| `2` | uso sbagliato: parametri mancanti, valori non riconosciuti, flag incompatibili |

I codici di dominio sono quelli di `ChartError` — `DATA_NON_VALIDA`,
`ORA_NON_VALIDA`, `FUSO_ORARIO_NON_VALIDO`, `COORDINATE_NON_VALIDE`,
`CORPO_SCONOSCIUTO`, `SISTEMA_CASE_NON_VALIDO`, `INTERVALLO_NON_VALIDO`,
`ERRORE_EFFEMERIDI` — gli stessi che l'API mappa su HTTP.

## Effemeridi

Senza i file Swiss Ephemeris il motore usa Moshier, e lo dichiara nel campo
`ephemerisMode`. Per scaricarli (~2 MB):

```sh
npm run ephe:download -w @undicesimacasa/core
```

In alternativa, `--ephe <percorso>` o la variabile `SE_EPHE_PATH`.
