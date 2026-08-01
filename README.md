# undicesimacasa

Generazione di temi natali: motore di calcolo astronomico, API REST e server MCP.

Il progetto è diviso in un **motore puro** e in **adattatori** che lo espongono
su superfici diverse — un'interfaccia web per le persone, un server MCP per gli
agenti. Il calcolo è deterministico e non contiene interpretazioni: quelle
restano a carico del consumatore.

## Licenza

**AGPL-3.0-or-later.** Il progetto usa [Swiss Ephemeris](https://www.astro.com/swisseph/),
distribuita da Astrodienst con doppia licenza AGPL / commerciale. Usando la via
AGPL, l'intera applicazione deve essere rilasciata sotto la stessa licenza: chi
utilizza il servizio via rete ha diritto al codice sorgente. Per un uso a
sorgente chiuso serve la licenza commerciale Astrodienst.

## Struttura

```
undicesimacasa/
├── packages/
│   ├── core/          motore di calcolo (nessuna dipendenza web)
│   ├── geo/           ricerca località, dataset GeoNames locale
│   └── mcp/           server MCP: luogo, tema natale, cielo, transiti, passaggi, elezione
└── apps/
    └── web/           SvelteKit: interfaccia + API REST
```

Monorepo con **npm workspaces**. Node ≥ 22.

## Avvio rapido

```sh
npm install
npm run ephe:download -w @undicesimacasa/core   # opzionale, ~2 MB
npm run geo:import   -w @undicesimacasa/geo     # necessario per la ricerca località, ~205 MB
npm test
```

La CLI si chiama `casa11` — nome corto perché è l'unica cosa che si digita
a ogni invocazione:

```sh
npm run build
npx casa11 --date 1968-03-12 --time 14:30 \
  --lat 40.8518 --lon 14.2681 --tz Europe/Rome
```

```
TEMA NATALE — 1968-03-12 14:30 (Europe/Rome, UTC+01:00) — 40.8518N 14.2681E
Case: placidus | Effemeridi: swisseph | UT: 1968-03-12T13:30:00Z

CORPI
Sole        22°03' Pes    casa  8
Luna        22°53' Leo    casa  1
...
```

Aggiungi `--json` per l'oggetto completo, `--help` per tutte le opzioni.
Con `--transits` si calcolano i transiti sullo stesso tema — vedi *Transiti*.

## Le due modalità di effemeridi

| Modalità | File richiesti | Precisione | Chirone |
|---|---|---|---|
| `swisseph` | `sepl_18.se1`, `semo_18.se1`, `seas_18.se1` (~2 MB) | secondo d'arco | sì |
| `moshier` | nessuno | ~0,4 secondi d'arco sui pianeti principali | no |

Il motore **rileva automaticamente** i file e ripiega su Moshier se assenti,
segnalandolo in `warnings`. Il progetto è quindi utilizzabile subito dopo
`npm install`, senza scaricare nulla. Lo scarto fra le due modalità è verificato
dai test: sotto i 5 secondi d'arco, cioè irrilevante in astrologia.

I file `.se1` **non sono versionati** (dati binari ridistribuibili): li scarica
`packages/core/scripts/download-ephe.mjs` dal repository ufficiale Swiss Ephemeris.

## Uso come libreria

```ts
import { computeNatalChart, formatChartCompact } from '@undicesimacasa/core';

const chart = computeNatalChart({
  date: '1968-03-12',
  time: '14:30',          // se omessa: nessuna casa, nessun asse
  latitude: 40.8518,      // positiva a Nord
  longitude: 14.2681,     // positiva a Est
  timezone: 'Europe/Rome',
}, {
  houseSystem: 'placidus',
  minorAspects: false,
});

chart.bodies;    // posizioni, segno, casa, retrogradazione, velocità
chart.houses;    // 12 cuspidi
chart.angles;    // ASC, MC, DSC, IC, Vertex
chart.aspects;   // matrice degli aspetti con orbita e direzione
chart.partOfFortune;  // ASC + Luna − Sole, invertita nei temi notturni
chart.sect;           // 'diurna' | 'notturna'
chart.siderealTime;   // tempo siderale locale, { hours, formatted }
chart.warnings;  // ora ambigua, effemeridi ripiegate, corpi mancanti

formatChartCompact(chart);  // resa tabellare, ~1/8 dei token del JSON
```

Sistemi di case: `placidus`, `koch`, `segni-interi`, `equale`, `regiomontano`,
`campano`, `porfirio`, `topocentrico`, `alcabizio`.

## Transiti

Dove sono i pianeti in un dato momento, e che aspetti formano con un tema di
nascita.

```ts
import { computeNatalChart, computeTransits, formatTransitsCompact } from '@undicesimacasa/core';

const natal = computeNatalChart(nascita);
const transits = computeTransits(natal, { date: '2026-08-15', timezone: 'Europe/Rome' });

transits.transiting;  // posizioni all'istante, con la casa **natale** in cui cadono
transits.aspects;     // aspetti al tema: transitante, punto natale, orbita, direzione
transits.warnings;    // ora del transito non fornita, tema senza case, bersagli assenti
```

`computeTransits` prende il **tema già calcolato**, non i dati di nascita: non
lo ricalcola, e le case in cui i transiti cadono sono quelle che la persona ha
davanti, nello stesso sistema di domificazione. I transiti non hanno una
domificazione propria.

### Le orbite sono un'altra tabella

| | congiunzione, opposizione, quadrato, trigono | sestile | minori |
|---|---|---|---|
| **Tema natale** | 8° / 8° / 7° / 7° | 5° | 2–3° |
| **Transiti** | 2° | 1,5° | 1° |

Non è una preferenza. Con gli 8° della congiunzione natale un transito di
Saturno risulterebbe «in aspetto» per mesi di fila, e il quadro del momento non
distinguerebbe più il giorno in cui l'aspetto si perfeziona da quello prima e da
quello dopo. I luminari conservano un bonus — 1° la Luna, mezzo grado il Sole —
su **entrambi** i lati: un contatto che tocca il Sole o la Luna di nascita
merita più spazio quanto la Luna che passa. Si sostituiscono per singolo aspetto
con `options.orbs`.

### Che cosa aspetta che cosa

I bersagli natali predefiniti sono i corpi del tema più **Ascendente e Medio
Cielo**: un transito sull'Ascendente è fra i più significativi che esistano, e
l'Ascendente non è un corpo celeste. Discendente e Fondo Cielo restano fuori
perché ogni loro riga comparirebbe già come aspetto all'asse opposto;
simmetricamente il **Nodo Sud** non è fra i transitanti, dove sarebbe
l'opposizione esatta del Nord. Entrambi si chiedono per nome con
`options.targets` e `options.bodies`.

Un punto natale entra nel calcolo con **velocità nulla**: una posizione di
nascita è ferma per sempre, e da questo dipende il verso di `applying` — è il
transito che si avvicina, non l'incontro.

### Sulle altre superfici

```sh
casa11 --date 1968-03-12 --time 14:30 --lat 40.85 --lon 14.27 --tz Europe/Rome \
       --transits --on 2026-08-15
```

Senza `--on` vale adesso, ora compresa. Via API e via MCP:

```
GET /api/transits?date=1968-03-12&time=14:30&locationId=3172394&transitDate=2026-08-15
GET /api/transits/passages?date=1968-03-12&time=14:30&locationId=3172394&from=2026-01-01
```

La risposta porta il tema **e** i transiti, perché le posizioni natali servono
comunque a leggere il quadro. Quando l'istante è indicato vale un giorno di
cache come un tema; quando è «adesso» la risposta è `no-store`: invecchia mentre
la si legge, e conservarla significherebbe mostrare domani il cielo di oggi.

### Il calendario dei passaggi

Un quadro istantaneo dice *che cosa* sta passando. Non dice **quando** un
aspetto diventerà esatto, né **quante volte**:

```ts
const { passages } = findTransitPassages(natal, {
  from: '2026-01-01',
  to: '2027-12-31',
  timezone: 'Europe/Rome',
}, { bodies: ['saturno'], targets: ['saturno'] });
```

```
3 giu 2026, 09:19   Saturno  congiunzione  Saturno  D  [12 mag → 7 lug]
19 set 2026, 21:24  Saturno  congiunzione  Saturno  R  [15 ago → 15 ott]
23 feb 2027, 06:16  Saturno  congiunzione  Saturno  D  [2 feb → 12 mar]
```

Tre righe, un fatto solo: il ritorno di Saturno di chi è nato nel 1968. Il
pianeta arriva sulla posizione natale, retrocede oltre e ci ripassa, poi torna
a perfezionarla — ed è quel ritmo, non un giorno singolo, a descrivere il
periodo. Un quadro istantaneo ne vedrebbe uno solo dei tre.

Il metodo è quello classico per le radici di una funzione continua: si campiona
lo scarto dall'angolo esatto a passo commisurato alla velocità del corpo, si
cerca dove cambia segno, e lì si dimezza l'intervallo fino al minuto. Un aspetto
sfiorato e non raggiunto — il corpo inverte il moto appena prima — non produce
cambi di segno e non compare, che è il risultato corretto.

**La Luna resta fuori** per impostazione predefinita: percorre lo zodiaco in
ventisette giorni, quindi perfeziona qualche migliaio di aspetti all'anno. Un
elenco così non è un calendario.

Sulle altre superfici:

```sh
casa11 --date … --passages --from 2026-01-01 --to 2026-12-31
```

```
GET /api/transits/passages?date=1968-03-12&…&from=2026-01-01&to=2026-12-31
```

Via API l'arco ha un tetto di tre anni, che il motore non ha: la ricerca costa
proporzionalmente alla durata. Senza `from` si parte da oggi, senza `to` si
arriva a un anno dopo.

**Resta un elenco di istanti, non di eventi.** Il motore dice quando un angolo
si chiude; che cosa accada in quel periodo non è un dato astronomico.

## Cielo

Dove sono i pianeti in un dato momento e che aspetti formano **fra loro**.

Non sono transiti. Un transito è un rapporto — un pianeta che passa *su
qualcosa* — e senza una nascita non c'è niente su cui passare. Non è nemmeno un
tema natale con la data di oggi: quello pretende un luogo, e qui il luogo è
facoltativo.

```ts
import { computeSky, currentMoment, formatSkyCompact } from '@undicesimacasa/core';

const sky = computeSky(currentMoment('Europe/Rome'));

sky.bodies;    // posizioni, segno, moto — le stesse ovunque sulla Terra
sky.aspects;   // aspetti reciproci, con le orbite di un tema
sky.houses;    // vuoto: nessun luogo, nessuna casa
```

Il luogo è facoltativo perché **le longitudini eclittiche sono geocentriche**: a
Roma e a Tokyo un pianeta è allo stesso grado dello zodiaco. Con un luogo si
aggiungono tempo siderale, assi e case:

```ts
const sky = computeSky(momento, { place: { latitude: 41.9028, longitude: 12.4964 } });
```

Ma le case vogliono **anche l'ora**. Senza, l'Ascendente compie un giro completo
nell'arco della giornata: calcolarle a mezzogiorno significherebbe inventarle,
non approssimarle, ed è la sola condizione che il motore segnala fra le
avvertenze. Che il luogo manchi non è invece un'anomalia ma una scelta, e non
produce nessun avviso.

Le orbite sono quelle **natali**, non quelle strette dei transiti: è una carta a
tutti gli effetti, solo senza nascita.

Sulle altre superfici:

```sh
casa11 --sky                                    # adesso, fuso di sistema
casa11 --sky --on 2026-08-01 --at 18:30 --tz Europe/Rome --lat 41.90 --lon 12.50
```

```
GET /api/sky
GET /api/sky?date=2026-08-01&time=18:30&timezone=Europe/Rome&locationId=3169070
```

Nessun parametro è obbligatorio da nessuna parte: senza data vale adesso, senza
fuso vale UTC via API e l'orologio della macchina da riga di comando. La cache
di `/api/sky` è **pubblica** e non privata come quella di un tema — il cielo di
un istante è lo stesso per tutti e non è di nessuno.

### Il calendario del cielo

Le tre cose che succedono in un periodo, e che un quadro istantaneo non può
mostrare: due corpi che si **incontrano**, un corpo che **entra** in un segno,
un corpo che si **ferma** e inverte il moto.

```ts
const { passages } = findSkyPassages(arco, { bodies: ['saturno', 'nettuno'] });
const { ingresses } = findSignIngresses(arco);
const { stations } = findStations(arco);
```

```
2026-02-20 17:54  Saturno  congiunzione  Nettuno  D/D  [24 gen → 16 mar]
2026-01-26 18:35  Nettuno  pesci → ariete
2026-05-06 17:34  Plutone  retrograda  5°31' Acq
```

Il metodo è quello del calendario dei passaggi, con una differenza che decide
tutto: là un termine solo si muoveva, contro una posizione di nascita ferma per
sempre; qui si muovono **entrambi**. Il passo di campionamento segue perciò la
somma delle due velocità e non la loro differenza — in retrogradazione i due si
avvicinano più in fretta di quanto dicano i moti medi, e un passo tarato sulla
differenza salterebbe proprio l'incontro che conta. Il margine con cui si cerca
la finestra segue invece la differenza, che è il ritmo con cui un'orbita si apre
e si chiude.

La coppia è ordinata per velocità **media** e non per moto istantaneo: presa sul
momento si scambierebbe i ruoli a ogni retrogradazione, e lo stesso incontro
comparirebbe ora in un verso ora nell'altro. Ogni coppia compare una volta sola,
perché un aspetto fra due corpi è reciproco.

**Le lunazioni non hanno codice proprio**: novilunio e plenilunio sono la
congiunzione e l'opposizione fra Sole e Luna, e escono da sole se il metodo è
giusto. Il novilunio del 18 gennaio 2026 cade alle 19:52 UT, come sulle
effemeridi pubblicate — è la verifica che il resto dell'elenco sia altrettanto
esatto.

**Un ingresso non è sempre un progresso.** Saturno entra in Ariete il 25 maggio
2025, retrograda tornando in Pesci il 1° settembre e rientra il 14 febbraio
2026: contarne uno solo darebbe una data d'inizio sbagliata di nove mesi a un
passaggio che dura tre anni. Ogni attraversamento è un evento a sé e porta con
sé il verso. Una stazione, dal canto suo, è una radice della **velocità** e non
della posizione — il pianeta non arriva da nessuna parte, si ferma — e porta il
grado su cui indugia per giorni e su cui tornerà due volte.

```sh
casa11 --sky --passages --from 2026-01-01 --to 2026-12-31
casa11 --sky --events   --from 2026-01-01 --to 2026-12-31
```

```
GET /api/sky/calendar?from=2026-01-01&to=2026-12-31&timezone=Europe/Rome
GET /api/sky/calendar?from=2026-01-01&to=2026-12-31&bodies=sole,luna
```

L'endpoint fa le tre ricerche insieme: chi guarda un periodo le vuole tutte e
tre. Non accetta nessun luogo, nemmeno facoltativo — un incontro fra due
pianeti avviene alla stessa ora ovunque lo si guardi. La **Luna resta fuori**
dai corpi predefiniti, qui come nel calendario dei passaggi: da sola cambia
segno ogni due giorni e mezzo. Ma senza di lei non ci sono lunazioni, quindi
quando servono la si chiede per nome.

## Elezione

Il tema natale riceve un istante e lo legge; l'elezione fa il contrario: cerca
l'istante. È la tecnica tradizionale per scegliere **quando** cominciare
qualcosa, e il motore ne calcola il materiale — non la scelta.

```ts
const { hours, voids } = findElectionHours(
  { from: '2029-08-24', to: '2029-08-26', timezone: 'Europe/Rome' },
  { latitude: 38.1166, longitude: 13.3636 },
);
```

```
06:34-07:40 Venere     d 1  66m 1°19' Ver
07:40-08:46 Mercurio   d 2  66m 14°43' Ver
...
2029-08-23 15:47 → 2029-08-24 01:34 (587 min) in acquario, dopo quadrato a Saturno, poi pesci
```

Tre cose, e nessuna di esse è un giudizio.

Le **ore planetarie** sono le dodici parti in cui si divide l'arco diurno, e le
altre dodici in cui si divide quello notturno. Durano sessanta minuti soltanto
agli equinozi: a Palermo, a fine agosto, un'ora diurna sta sui sessantasei
minuti e una notturna sui cinquantaquattro. Il reggitore segue l'**ordine
caldeo** — Saturno, Giove, Marte, Sole, Venere, Mercurio, Luna — a partire dal
pianeta del giorno della settimana, e il giorno planetario comincia **all'alba**
e non a mezzanotte: fra la mezzanotte e l'alba di lunedì regge ancora la
domenica. Ventiquattro ore avanzano di tre posizioni nella catena, ed è da quello
scarto che discende l'ordine dei giorni della settimana.

L'**Ascendente** viene dato all'inizio di ogni ora, ed è il dato che si muove
più in fretta di tutti: un grado ogni quattro minuti, un segno intero in meno di
due ore.

La **Luna vuota di corso** è il tratto in cui non perfeziona più alcun aspetto
maggiore prima di lasciare il segno. Si ricava per intero da due calendari che
il motore già sa fare — gli ingressi della Luna e i suoi incontri — presi su un
arco allargato, perché il vuoto in corso il primo giorno è cominciato prima.
Contano i **sei classici**: allargare la regola a Urano, Nettuno e Plutone
cambierebbe in silenzio il risultato di una dottrina che ha un'origine precisa,
quindi chi la vuole moderna passa `bodies` e se ne assume la scelta.

Alba e tramonto sono l'unico calcolo del motore che guardi l'orizzonte, e sono
presi al **centro del disco senza rifrazione**: non è l'alba dell'almanacco, che
arriva quasi cinque minuti prima, ma è l'unica per cui il Sole si trovi
esattamente sull'Ascendente — cioè l'unica coerente con gli assi che la stessa
tabella riporta accanto. Alle latitudini polari, dove il Sole può non sorgere per
settimane, il risultato è vuoto e lo dice: dodici parti di un arco diurno lungo
un giorno intero sarebbero un numero plausibile e falso.

L'arco ha un tetto di **31 giorni**, che è più stretto di quello dei passaggi:
qui ogni giorno porta ventiquattro righe.

```sh
casa11 --elezione --lat 38.1166 --lon 13.3636 --tz Europe/Rome \
       --from 2029-08-24 --to 2029-08-26
```

```
GET /api/election?locationId=2523920&from=2029-08-24&to=2029-08-26
```

Il luogo è **obbligatorio e senza alternative**, unico caso fra gli endpoint: le
ore planetarie nascono da alba e tramonto, e quelle senza un punto sulla Terra
non esistono. Omettendo `to` si ha un giorno solo, che è la domanda più comune.

**Il risultato non contiene raccomandazioni**, ed è deliberato quanto il resto:
dice quale pianeta regge un'ora e se la Luna sia vuota, non se quell'ora sia
buona per qualcosa. Il significato è di chi consuma, come per ogni altro numero
che questo motore produce.

## Le località

Il dataset GeoNames è importato in un database SQLite locale: 235.073 località,
1,2 milioni di nomi cercabili, nessuna chiamata di rete a runtime. Il fuso
orario IANA arriva dal dataset stesso, quindi una ricerca restituisce già tutto
ciò che serve al calcolo.

**I nomi sono in italiano.** GeoNames usa come nome primario l'esonimo
internazionale — "Rome", "Munich", "Naples" — inadatto a un'interfaccia
italiana. L'importazione preleva le varianti italiane da `alternateNames.zip`
e le applica a città, regioni e paesi:

| Prima | Dopo |
|---|---|
| Rome, Lazio, Italy | Roma, Lazio, Italia |
| Munich, Bavaria, Germany | Monaco di Baviera, Baviera, Germania |
| London, England, United Kingdom | Londra, Inghilterra, Regno Unito |

Circa il 9% delle località ha un esonimo italiano: le altre ricadono sul nome
locale, che è il comportamento giusto (Bergamo resta Bergamo). Paesi tradotti
246 su 246, regioni 2.201 su 3.703.

La **ricerca** resta indipendente dalla lingua: si può digitare "Munich" e
ricevere "Monaco di Baviera", o viceversa. Chi preferisce i nomi
internazionali passa `lang: 'en'`:

```ts
searchLocations('roma', { lang: 'en' });  // → Rome, Lazio, Italy
```

Il file `alternateNames.zip` pesa 200 MB e decompresso supera i 700 MB: viene
letto in streaming e filtrato alla sola lingua italiana, mai caricato in
memoria. L'importazione completa richiede meno di un minuto.

## Accuratezza

Il motore è stato confrontato con un programma astrologico affermato su un
tema reale, verificando posizioni, case, conversione oraria e punti calcolati:

| | Scarto dal riferimento |
|---|---|
| Posizioni planetarie | ≤ 1 primo d'arco, segno e casa compresi |
| Cuspidi delle case | ≤ 1 primo d'arco, a parità di coordinate |
| Tempo Universale | esatto (ora legale del 1978 applicata) |
| Tempo siderale locale | 1 secondo |
| Parte di Fortuna | esatta |

Un primo d'arco è sotto la soglia in cui qualcosa cambia: nessuna orbita,
cuspide o interpretazione ne risente.

**Le case dipendono dalle coordinate.** Due programmi che partono da punti
diversi della stessa città danno cuspidi diverse: fra il centroide GeoNames di
una città e quello usato da un altro programma possono esserci chilometri, e
bastano a produrre qualche primo di scarto sulle cuspidi. Per un confronto che
misuri il calcolo invece della differenza fra due centroidi, vanno usate le
stesse coordinate — vedi *Coordinate precise* qui sotto.

## Coordinate precise

La ricerca della città restituisce il centroide comunale. Non sempre basta:

- si vuole **riprodurre** il risultato di un altro programma, che parte da un
  punto diverso
- si conosce il **luogo esatto** di nascita — un ospedale in periferia sposta
  l'Ascendente di qualche primo
- il luogo **non è nel dataset**, che copre i centri sopra i 500 abitanti

L'interfaccia permette di correggere le coordinate dopo aver scelto la
località, accettando sia il formato decimale (`38.1333`, con punto o virgola)
sia quello sessagesimale (`38°08'N`) — quest'ultimo è la forma in cui le danno
i documenti e gli altri programmi. Accanto compare la distanza dal centroide,
che rende evidente l'errore classico: una longitudine inserita a Ovest invece
che a Est produce coordinate perfettamente valide e un tema del tutto
sbagliato, ma anche duemila chilometri di scarto.

**Il fuso orario resta quello della località, e non è modificabile.** È una
scelta deliberata: è il dato in cui sbagliare costa di più — un'ora sposta
l'Ascendente di quindici gradi — e un valore errato ma valido (`Europe/London`
al posto di `Europe/Rome`) non è intercettabile da nessun controllo. Per un
luogo fuori dataset conviene scegliere il comune più vicino, che dà il fuso
corretto, e poi correggere le coordinate.

Via API le due forme si combinano allo stesso modo:

```
GET /api/chart?date=1978-06-02&time=15:15&locationId=2523920
GET /api/chart?date=1978-06-02&time=15:15&locationId=2523920&latitude=38.1333&longitude=13.3333
```

Con `locationId` da solo si usa il centroide; aggiungendo le coordinate,
la località fornisce fuso orario e nome mentre il punto lo dà chi chiama.
Restano accettate anche `latitude` + `longitude` + `timezone` senza
`locationId`, per i casi in cui nessuna località vicina abbia il fuso giusto.

**Parte di Fortuna.** La formula si inverte nei temi notturni, secondo la
tradizione ellenistica e medievale. Parte dei programmi moderni usa sempre la
forma diurna: su un tema notturno le due convenzioni divergono anche di oltre
cento gradi. Per riprodurre il risultato di un altro programma:

```ts
computeNatalChart(nascita, { partOfFortuneFormula: 'diurna' });
```

Lo stesso interruttore esiste su ogni superficie: `partOfFortuneFormula=diurna`
via API, `part_of_fortune_formula` nel tool MCP, `--fortuna diurna` dalla CLI.

## Il punto delicato: i fusi orari

Un errore di un'ora nella conversione sposta l'Ascendente di circa 15 gradi,
cioè mezzo segno. Il motore usa il database tzdata **storico** via Luxon, quindi
gestisce correttamente l'ora legale di guerra, i tempi medi locali pre-1893 e i
cambi di fuso. I casi limite sono coperti da test e segnalati in `warnings`:

- ora **inesistente** (salto in avanti per l'ora legale) → si usa l'istante successivo
- ora **ambigua** (ritorno all'ora solare, l'orario ricorre due volte) → si usa la prima occorrenza
- ora **ignota** → carta calcolata a mezzogiorno locale, senza case né assi

La conversione a giorno giuliano è implementata direttamente (algoritmo di
Meeus) invece che delegata al modulo nativo, così da restare testabile in
isolamento.

## Progettato per essere consumato da agenti

L'obiettivo dichiarato del progetto è esporre il calcolo anche via **MCP**.
Alcune scelte del motore vengono da lì:

- **calcolo e interpretazione sono separati** — l'API restituisce solo dati verificabili
- **il fallimento è parziale, non totale** — un corpo non calcolabile produce un
  avviso, non un errore; l'ora ignota produce una carta senza case anziché un rifiuto
- **`formatChartCompact`** esiste per non bruciare migliaia di token di contesto
- **gli errori hanno un `code`** (`ChartError`) mappabile su una risposta API

## Applicazione web

```sh
npm run build
npm start -w @undicesimacasa/web        # http://localhost:3000
npm run dev -w @undicesimacasa/web      # sviluppo
```

Tutti gli endpoint sono in GET perché un tema natale è una funzione pura dei
suoi parametri: l'URL è condivisibile e la risposta memorizzabile.

```
GET /api/locations?q=napoli&limit=8&country=IT
GET /api/chart?date=1968-03-12&time=14:30&locationId=3172394
GET /api/chart?date=1968-03-12&latitude=40.85&longitude=14.27&timezone=Europe/Rome
GET /api/transits?date=1968-03-12&time=14:30&locationId=3172394&transitDate=2026-08-15
GET /api/transits/passages?date=1968-03-12&time=14:30&locationId=3172394&from=2026-01-01
GET /api/sky?date=2026-08-01&time=18:30&timezone=Europe/Rome
GET /api/sky/calendar?from=2026-01-01&to=2026-12-31&timezone=Europe/Rome
GET /api/election?locationId=2523920&from=2029-08-24&to=2029-08-26
```

I transiti accettano **gli stessi parametri di nascita** del tema, più
`transitDate`, `transitTime` e `transitTimezone`: un indirizzo che calcola un
tema ne calcola i transiti cambiando solo il percorso. Senza `transitDate`
valgono l'istante e il giorno correnti.

Gli errori riportano il `code` del dominio (`FUSO_ORARIO_NON_VALIDO`,
`LUOGO_MANCANTE`, …) con lo status appropriato: 400 per l'input, 404 per una
località inesistente, 503 se il database delle località non è stato importato.

**Il bundle del browser non contiene il motore di calcolo.** Il codice client
importa da `@undicesimacasa/core` solo *tipi*, mai valori: un singolo import di
valore ne trascinerebbe l'intero grafo — effemeridi e modulo nativo compresi —
dentro il JavaScript scaricato dall'utente.

### Struttura dell'interfaccia

L'applicazione ospita più sezioni — il tema, i transiti, il cielo, l'elezione —
che condividono quasi tutto pur partendo da domande diverse. Le parti riusabili
stanno perciò in `$lib` e non nella pagina:

| | |
|---|---|
| `lib/birth.ts` | lo stato del modulo di nascita, con `isComplete` e le coordinate corrette |
| `lib/moment.ts` | lo stato del modulo dell'istante, con il fuso di chi guarda |
| `lib/clock.ts` | l'ora da parete in un fuso: la stessa risposta al server e al browser |
| `lib/api.ts` | chiamata all'API e distinzione fra errore di dominio e guasto di rete |
| `lib/wheel.ts` | la geometria della ruota, senza SVG e quindi verificabile |
| `lib/navigation.ts` | l'elenco delle sezioni: aggiungerne una è una riga |
| `lib/server/{place,birth,moment,range}.ts` | lettura dei parametri, condivisa fra gli endpoint |
| `lib/components/BirthForm.svelte` | data, ora, luogo, correzione delle coordinate; accetta uno snippet per le opzioni della sezione |
| `lib/components/MomentFields.svelte` | giorno, ora, «adesso» e il passo avanti o indietro: l'istante che i transiti e il cielo chiedono allo stesso modo |
| `lib/components/ChartSettings.svelte` | sistema di case e aspetti minori; nella striscia del modulo chiuso ricalcola da sé |
| `lib/components/ChartWheel.svelte` | la ruota, con anello esterno opzionale per i transiti |
| `lib/nodal-axis.ts` | accorpa l'asse dei Nodi, che si presenta sempre in coppia |
| `lib/components/*Table.svelte` | le tabelle dei risultati |

Le tabelle prendono **i dati, non il tema**: un quadro di transiti ha due
insiemi di posizioni e aspetti fra insiemi diversi, e legarle a `NatalChart`
costringerebbe a riscriverle. È la ragione per cui la sezione dei transiti ha
richiesto una tabella nuova sola — quella degli aspetti a due lati — e ha
riusato le altre; e per cui il cielo di un istante non ne ha richiesta nessuna.
Ne servono due al calendario, ma perché i dati sono diversi davvero: un incontro
ha due corpi mobili invece di un corpo e un punto fermo, e ingressi e stazioni
non sono aspetti affatto. L'elezione ne ha richiesta una sua per lo stesso
motivo — un'ora planetaria non è un aspetto e non ha orbita — e prende le ore e
i vuoti, non il risultato dell'endpoint. Per la stessa ragione la ruota accetta un tipo
strutturale e non un `NatalChart`: il cielo non deve fingersi un tema per essere
disegnato.

### Privacy

Non c'è nulla da consentire, quindi non c'è nessun banner: il sito **non
imposta cookie**, non ha account, non profila e non carica nessuna risorsa da
domini terzi. I dati di nascita sono calcolati in memoria e non vengono
conservati da nessuna parte. L'informativa sta su `/privacy`.

L'unica scrittura sul dispositivo è `sveltekit:scroll` nella `sessionStorage`,
dove il router del framework tiene la posizione dello scorrimento per il
ritorno indietro: due numeri per pagina, nessun identificativo, cancellati alla
chiusura della scheda. È dichiarata nell'informativa — che deve descrivere
quello che il sito fa, non quello che vorremmo facesse.

Restano due punti che dipendono da **come si mette in rete** l'applicazione, e
sono descritti in [`docs/proxy-e-log.md`](docs/proxy-e-log.md):

- il formato di log predefinito di nginx registra la query string accanto
  all'indirizzo IP, cioè i dati di nascita accanto a chi li ha inseriti: va
  cambiato in uno che registri `$uri`;
- la ritenzione dei log dichiarata nell'informativa (sette giorni) va resa vera
  con la rotazione.

Prima della pubblicazione va inoltre valorizzato `REPOSITORY_URL` in
`apps/web/src/lib/project.ts`: l'AGPL, articolo 13, obbliga a offrire il codice
sorgente a chi usa il programma attraverso la rete, ed è lo stesso indirizzo
indicato come recapito nell'informativa. Finché è vuoto l'interfaccia scrive il
testo senza collegamento, invece di produrne uno rotto.

## Docker

Un'unica immagine serve le tre superfici — web, server MCP, importazione del
dataset — perché condividono codice e dipendenze: cambia solo il comando.
L'orchestrazione sta in `compose.yaml`.

```sh
docker compose --profile setup run --rm geo-import   # una tantum, ~215 MB
docker compose up -d                                 # localhost:3000
```

I servizi che non sono l'applicazione stanno dietro un profilo, così `up` non
li avvia per sbaglio. Il profilo va nominato: Docker Compose lo attiva da sé
quando il servizio è l'argomento di `run`, podman-compose no.

Le effemeridi stanno nell'immagine (~2 MB); il dataset delle località (~90 MB)
resta fuori, così l'immagine resta leggera e il dataset si aggiorna senza
ricostruirla.

**Dove vive il dataset** lo decide `GEONAMES_DATA`, l'unica variabile che
cambia davvero qualcosa — vedi `.env.example`, da copiare in `.env`:

| Valore | Effetto |
|---|---|
| `geonames` (predefinito) | volume gestito da Docker, popolato da `geo-import`: non serve Node sull'host |
| `./packages/geo/data` | bind mount: riusa il dataset già importato con `npm run geo:import` |

Qualsiasi percorso che inizi per `.` o `/` diventa un bind mount, ogni altro
valore è un nome di volume. Il montaggio è in sola lettura ovunque tranne che
in `geo-import`, e porta l'opzione `z`: senza rietichettatura SELinux un bind
mount è irraggiungibile dal container su Fedora e RHEL, mentre altrove
l'opzione non ha effetto.

### I due profili

Restano fuori da `docker compose up`, e si attivano per nome:

```sh
docker compose --profile dev up dev            # Vite in ricaricamento, :5173
docker compose --profile mcp run --rm -T mcp   # server MCP su stdio
```

Il servizio `dev` monta i sorgenti dell'host ma conserva i `node_modules`
dell'immagine, compilati per Debian: quelli locali contengono il binding
nativo di `sweph` costruito per un'altra distribuzione.

Il server MCP parla su stdio, quindi non è un servizio da avviare ma un
processo che il client lancia:

```json
{
  "mcpServers": {
    "undicesimacasa": {
      "command": "docker",
      "args": ["compose", "-f", "/percorso/undicesimacasa/compose.yaml",
               "--profile", "mcp", "run", "--rm", "-T", "mcp"]
    }
  }
}
```

Il database delle località viene importato in modalità WAL e riportato a
journal ordinario alla fine: in WAL SQLite deve poter creare un file `-shm`
persino per leggere, e da un mount in sola lettura non può.

## Server MCP

Espone il calcolo agli agenti. Trasporto stdio:

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

Una volta pubblicato su npm, il binario `undicesimacasa-mcp` renderà superfluo
il percorso assoluto.

Sette tool, con la ricerca del luogo deliberatamente separata dal calcolo:

| Tool | Cosa fa |
|---|---|
| `search_location` | nome → candidati con `location_id`, coordinate, fuso IANA |
| `compute_natal_chart` | `location_id` (o coordinate) + data/ora locale → tema |
| `compute_transits` | gli stessi dati più il momento → posizioni e aspetti al tema |
| `find_transit_passages` | gli stessi dati più un arco → gli istanti in cui gli aspetti si perfezionano |
| `compute_sky` | niente, o poco: il cielo di un istante, senza nascita e senza luogo |
| `find_sky_events` | un arco → incontri, ingressi nei segni e stazioni, sempre senza nascita |
| `find_election_hours` | un luogo e un arco → ore planetarie, Ascendente, Luna vuota di corso |

**`compute_sky` e `find_sky_events` non hanno nessun parametro obbligatorio**, e
le loro descrizioni insistono sulla differenza che un modello tenderebbe a
perdere: senza una nascita non esistono transiti, esiste solo il cielo; con una
nascita il cielo da solo non basta. Serve a evitare che un agente inventi una
data di nascita per poter chiamare `compute_transits`, o che chiami questi
quando la domanda riguarda invece una persona. `find_sky_events` accetta
`include` per chiedere una sola delle tre cose, che accorcia la risposta quando
la domanda è precisa. `find_election_hours` è l'eccezione che conferma la
regola del luogo: è l'unico tool a pretenderlo senza alternative, perché senza
alba e tramonto non ci sono ore planetarie da dividere.

La data di adesso **va sempre omessa** — `transit_date`, `from`, `date` —
perché la mette il server, che è la sola fonte a saperla. È la stessa ragione
per cui i tool non convertono l'ora e non inventano le coordinate: le
descrizioni dicono all'agente che cosa non deve fare da sé, perché è lì che un
modello produce un risultato plausibile e sbagliato.

La separazione è il punto: `compute_natal_chart` non fa geocoding. Un tool
unico dovrebbe scegliere in silenzio fra le decine di "Roma" del mondo, e uno
sbaglio lì produce un tema plausibile e sbagliato. Così la disambiguazione
resta una decisione esplicita, e `location_id` evita che l'agente ricopi a mano
tre valori numerici.

Il parametro `format` vale `compact` (default, tabella densa) o `json`.
Le risorse `undicesimacasa://riferimento/aspetti` e `.../sistemi-case` contengono
il materiale di riferimento, caricato solo quando serve.

Variabili d'ambiente: `GEONAMES_DB_PATH`, `SE_EPHE_PATH`.

## Sviluppo

```sh
npm test                                  # tutti i workspace
npm run test:watch -w @undicesimacasa/core
npm run typecheck
npm run build
```
