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
│   ├── ruota/         il disegno: geometria, glifi, colori, SVG e PNG
│   └── mcp/           server MCP: luogo, tema natale, disegno, cielo, transiti, passaggi, elezione
└── apps/
    ├── web/           SvelteKit: interfaccia + API REST
    └── desktop/       Electron: la web app in una finestra, per Linux e Windows
```

`ruota` è l'unico pacchetto che **non dipende da `core`**, nemmeno per i tipi:
li ridichiara. Non è distrazione — è ciò che permette a `core`, dove vive la
CLI, di dipendere da lui senza chiudere un ciclo, e dice il verso giusto delle
cose: il disegno riceve una carta già calcolata e non ha modo di calcolarne
una. Che le due dichiarazioni restino allineate lo verifica un test.

Monorepo con **npm workspaces**. Node ≥ 22.

### I riferimenti

Questo README racconta **perché** le cose sono come sono. I parametri, i valori
e i difetti di ogni superficie stanno in [`docs/`](docs/README.md), per chi il
progetto lo ha già capito e deve solo chiamarlo:

| | |
|---|---|
| [`docs/api.md`](docs/api.md) | i nove endpoint HTTP, con i prompt brevi per un agente |
| [`docs/mcp.md`](docs/mcp.md) | gli otto tool MCP e le due risorse di riferimento |
| [`docs/cli.md`](docs/cli.md) | la riga di comando `casa11` |
| [`docs/prompt-lettura.md`](docs/prompt-lettura.md) | il prompt di sistema per un agente che legge il tema |
| [`docs/proxy-e-log.md`](docs/proxy-e-log.md) | reverse proxy e log: ciò che rende vera l'informativa su `/privacy` |

## Avvio rapido

```sh
npm install
npm run ephe:download -w @undicesimacasa/core   # opzionale, ~2 MB
npm run geo:import   -w @undicesimacasa/geo     # necessario per la ricerca località, ~215 MB
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
L'elenco completo dei flag sta in [`docs/cli.md`](docs/cli.md).

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
chart.distribution;   // elementi e modalità, a gruppi separati — vedi sotto
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
davanti, nello stesso sistema di domificazione.

### Il luogo da cui si guarda

Facoltativo, e senza non manca niente: le longitudini eclittiche sono
geocentriche, quindi a Roma e a Tokyo un pianeta è allo stesso grado dello
zodiaco e forma gli stessi aspetti al tema. Serve alle sole cose che un
orizzonte definisce.

```ts
const transits = computeTransits(natal, { date: '2026-08-15', time: '09:00', timezone: 'Asia/Tokyo' }, {
  place: { latitude: 35.6895, longitude: 139.6917 },
});

transits.angles;       // Ascendente e Medio Cielo **dell'istante**, da lì
transits.houses;       // le dodici cuspidi dell'istante. Vuote senza luogo o senza ora
transits.siderealTime; // locale: dipende dalla longitudine
```

Da qui un corpo in transito si trova in **due** case, e non è una
contraddizione ma la differenza fra due domande. `house` risponde a «in quale
settore della vita di questa persona sta passando», e vale ovunque la persona
si trovi: è quella che si legge di solito. `transitHouse` risponde a «dove sta
in cielo, adesso, per chi è in quel posto» — sopra o sotto l'orizzonte, a
oriente o a occidente.

Con il luogo, **Ascendente e Medio Cielo dell'istante entrano fra i
transitanti** e aspettano i punti natali. Vanno letti sapendo che si muovono di
un grado ogni quattro minuti: un loro contatto dura minuti, non i giorni o i
mesi di un pianeta. La loro velocità non è supposta costante ma misurata sul
posto — l'Ascendente accelera e rallenta secondo il segno che sorge, tanto più
quanto più alta è la latitudine.

Il luogo del transito **non riloca il tema**: le case natali restano quelle di
nascita. Un luogo senza ora produce il solo tempo siderale e un avviso — a
mezzogiorno l'Ascendente sarebbe inventato, non approssimato.

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
casa11 … --transits --on 2026-08-15 --at 09:00 \
       --transit-lat 35.6895 --transit-lon 139.6917
```

Senza `--on` vale adesso, ora compresa. Via API e via MCP:

```
GET /api/transits?date=1968-03-12&time=14:30&locationId=3172394&transitDate=2026-08-15
GET /api/transits?…&transitDate=2026-08-15&transitTime=09:00&transitLocationId=1850147
GET /api/transits/passages?date=1968-03-12&time=14:30&locationId=3172394&from=2026-01-01
```

Il luogo del transito ha parametri suoi — `transitLocationId`, oppure
`transitLatitude` e `transitLongitude` insieme — perché una richiesta di
transiti porta **due** luoghi, e negli stessi nomi uno dei due andrebbe perso.
Sceglierne uno fornisce anche il fuso in cui leggere `transitTime`: chi nomina
una città intende l'ora di lì.

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
qui ogni giorno porta ventiquattro righe. Il tetto però non basta a rendere
consultabile un mese — sono più di settecento ore — e per questo l'elenco si
restringe: `rulers` tiene solo le ore rette da certi pianeti, `skipMoonVoid`
scarta quelle che un vuoto attraversa. Chiedere un reggitore solo su un mese
intero porta da 745 righe a 72. I filtri **viaggiano col risultato**: un elenco
ridotto che non dichiari di esserlo si legge come completo. E reggono l'ora
soltanto i sette dell'ordine caldeo: `rulers=urano` è un errore e non un elenco
vuoto, perché un elenco vuoto direbbe «non in questo mese» invece di «mai».

```sh
casa11 --elezione --lat 38.1166 --lon 13.3636 --tz Europe/Rome \
       --from 2029-08-24 --to 2029-08-26
casa11 --elezione --lat 44.6983 --lon 10.6312 --tz Europe/Rome \
       --from 2026-08-01 --to 2026-08-31 --reggitori giove --senza-vuoti
```

```
GET /api/election?locationId=2523920&from=2029-08-24&to=2029-08-26
GET /api/election?locationId=3169522&from=2026-08-01&to=2026-08-31&rulers=giove&skipMoonVoid=true
```

Il luogo è **obbligatorio e senza alternative**, unico caso fra gli endpoint: le
ore planetarie nascono da alba e tramonto, e quelle senza un punto sulla Terra
non esistono. Omettendo `to` si ha un giorno solo, che è la domanda più comune.

**Il risultato non contiene raccomandazioni**, ed è deliberato quanto il resto:
dice quale pianeta regge un'ora e se la Luna sia vuota, non se quell'ora sia
buona per qualcosa. Il significato è di chi consuma, come per ogni altro numero
che questo motore produce.

### L'ora eletta sul tema di nascita

Nella tradizione l'elezione si radica nel tema di chi commissiona l'impresa, e
l'interfaccia lo lascia fare senza che il motore ne sappia niente: nella sezione
`/elezione` la nascita è un blocco **facoltativo** del modulo, e con una nascita
ogni riga della tabella si apre come istante sul tema — la biruota, gli aspetti
al natale, le posizioni dei due cieli.

Non serve nessun calcolo nuovo, ed è la ragione per cui la cosa costa una
schermata e non un endpoint: **un'ora planetaria è un istante**, e i transiti
sono già il confronto fra una nascita e un istante qualsiasi. La riga scelta
diventa `transitDate` e `transitTime` di `/api/transits`, con il fuso del luogo
eletto e non quello di nascita.

Resta fuori ciò che sarebbe un giudizio: nessuna ora viene ordinata, segnata o
consigliata in base al tema. Giustapporre non è valutare — l'elenco è lo stesso
con o senza nascita — e il contesto per scegliere sta nelle domande che
l'astrologo fa al cliente, non in una tabella.

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

## Elementi e modalità

Ogni tema e ogni cielo portano un campo `distribution`: quanti punti cadono in
ciascun elemento — fuoco, terra, aria, acqua — e in ciascuna modalità —
cardinale, fisso, mobile.

```
DISTRIBUZIONE
Pianeti  fuoco 4  terra 2  aria 2  acqua 2      | cardinale 2  fisso 5  mobile 3
Punti    fuoco 1  terra 1  aria 1  acqua 0      | cardinale 3  fisso 0  mobile 0
Assi     fuoco 2  terra 0  aria 0  acqua 0      | cardinale 1  fisso 1  mobile 0
```

Contare non è interpretare, ma **decidere che cosa contare** è già una scelta di
scuola: c'è chi conta i sette pianeti tradizionali e chi i dieci, chi aggiunge i
nodi, chi l'Ascendente, chi pesa i luminari più del resto. Un totale unico
sceglierebbe una convenzione in silenzio e ne presenterebbe il risultato come un
fatto — che è esattamente ciò che rende inservibile il conteggio di parecchi
programmi, dove il numero non si riesce a ricostruire.

Perciò i gruppi restano tre e separati, e ciascuno porta in `counted` l'elenco
di ciò che ha contato: chi segue una convenzione diversa rifà la somma invece di
doverci credere. Non esiste nessun campo «dominante»: quella è lettura, e la
lettura non è di chi fa i conti.

Degli assi si contano l'Ascendente e il Medio Cielo, non i loro opposti:
Discendente e Fondo Cielo sono determinati dai primi due e non aggiungono nulla
che non sia già stato contato.

Nell'interfaccia la tabella sta accanto ad *Assi e cuspidi*, i settori della
ruota hanno finalmente la loro legenda, e nelle tabelle il glifo del segno porta
il colore del proprio elemento — un rinforzo, non l'unica strada: l'elemento si
ricava dal nome del segno, che è scritto lì accanto.

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

Nove endpoint, **tutti in GET** perché un tema natale è una funzione pura dei
suoi parametri: l'URL è condivisibile e la risposta memorizzabile. I parametri
di ciascuno, con i codici d'errore e la loro resa in HTTP, stanno in
[`docs/api.md`](docs/api.md).

Due cose che l'elenco dei parametri non spiega da sé. I due `…/wheel` sono gli
unici a non restituire JSON: danno l'immagine della ruota, `image/svg+xml` o
`image/png`, e `width` vale solo con `format=png` — un SVG si scala da sé, e
chiederne la larghezza è quasi sempre il sintomo di un malinteso. Vedi
[Il disegno servito](#il-disegno-servito). E i transiti accettano **gli stessi
parametri di nascita** del tema: un indirizzo che calcola un tema ne calcola i
transiti cambiando solo il percorso.

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
| `lib/birth-store.svelte.ts` | quella nascita, condivisa fra le sezioni: in memoria, finché la pagina non viene ricaricata |
| `lib/moment.ts` | lo stato del modulo dell'istante, con il fuso di chi guarda |
| `lib/clock.ts` | l'ora da parete in un fuso: la stessa risposta al server e al browser |
| `lib/api.ts` | chiamata all'API e distinzione fra errore di dominio e guasto di rete |
| `lib/coordinates.ts` | coordinate scritte a mano: decimali con punto o virgola, sessagesimali, e la distanza dal centroide |
| `lib/format.ts` | gradi, primi e segni a schermo: la usano tutte le tabelle |
| `lib/navigation.ts` | l'elenco delle sezioni: aggiungerne una è una riga |
| `lib/color-scheme.ts` | l'aspetto chiaro o scuro scelto dal pulsante, con la chiave dichiarata nell'informativa |
| `lib/server/{place,birth,moment,range}.ts` | lettura dei parametri, condivisa fra gli endpoint |
| `lib/evidenza.svelte.ts` | il corpo isolato nella ruota e nelle tabelle: sorvolato col mouse o scelto con un clic, e il secondo vince sul primo |
| `lib/house-systems.ts` | l'elenco dei sistemi di case e la domanda «è uno di questi?», che serve a chi legge un indirizzo |
| `lib/components/DistributionTable.svelte` | il conteggio per elemento e modalità, a gruppi separati |
| `lib/components/LegendaElementi.svelte` | che cosa vogliono dire i quattro colori della ruota |
| `lib/components/Meta.svelte` | titolo, descrizione, canonico e Open Graph di ogni pagina |
| `lib/esporta.ts` | la ruota portata via: fissa i valori calcolati dell'SVG, che altrimenti fuori dalla pagina non risolve né le `var()` né le classi |
| `lib/components/ModuloPieghevole.svelte` | il riquadro dei campi che si ritira in una striscia appesa: lo stesso in tutte e quattro le sezioni |
| `lib/components/Risultato.svelte` | titolo, riga delle condizioni, avvertenze: l'intestazione di ciò che è stato calcolato |
| `lib/components/BirthForm.svelte` | data, ora, luogo, correzione delle coordinate; accetta uno snippet per le opzioni della sezione |
| `lib/components/LocationSearch.svelte` | la ricerca della località, con l'etichetta della sezione: nel cielo non è una nascita ma il punto da cui si guarda |
| `lib/components/CampiMancanti.svelte` | perché il pulsante d'invio è spento: da solo, spento restava muto |
| `lib/components/MomentFields.svelte` | giorno, ora, «adesso» e il passo avanti o indietro: l'istante che i transiti e il cielo chiedono allo stesso modo |
| `lib/components/ChartSettings.svelte` | sistema di case e aspetti minori; nella striscia del modulo chiuso ricalcola da sé |
| `lib/components/ChartWheel.svelte` | la ruota, con anello esterno opzionale per i transiti |
| `lib/components/StrumentiRuota.svelte` | scarica il disegno come SVG o PNG, e manda in stampa |
| `lib/components/Wordmark.svelte` | il marchio, disegnato inline perché le lettere seguano il colore del testo |
| `lib/components/ColorSchemeToggle.svelte` | il pulsante che scorre fra aspetto automatico, chiaro e scuro |
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

### Che cosa finisce nell'indirizzo

Le quattro sezioni **leggono** tutte il proprio indirizzo, e chi lo trova
scritto ci ritrova il suo calcolo. A scriverlo però sono solo due:

| | |
|---|---|
| **Cielo**, **Elezione** | l'indirizzo si aggiorna a ogni calcolo. Sono un istante e una città: non dicono niente di chi guarda, e la pagina si può ricaricare, mettere fra i segnalibri e mandare a qualcuno. Sull'elezione la nascita facoltativa resta fuori |
| **Tema natale**, **Transiti** | l'indirizzo resta pulito. Dentro ci sarebbe una data di nascita, che finirebbe nella cronologia di chi apre il collegamento e nei registri dei server che attraversa: lo compone il pulsante **Copia link**, sotto la ruota, e sotto il pulsante sta scritto che cosa porta con sé |

I nomi dei parametri sono quelli dell'API — `date`, `time`, `locationId`,
`houseSystem`, `transitDate` — perché il collegamento è fatto con gli stessi:
un elenco solo invece di due da tenere allineati. Il luogo viaggia come
identificativo, e `GET /api/locations?id=…` lo ritrasforma in un nome quando la
pagina si rimette in piedi.

Si scrive con `replaceState` e non con `pushState`: le frecce del passo si
premono in fretta, e un giorno per volta riempirebbero la cronologia di voci da
risalire una a una. Quello che si guadagna è la ricarica e la condivisione, non
il tasto Indietro.

### Portare via la carta

Sotto ogni ruota ci sono tre comandi: **SVG**, **PNG** e **stampa**. Il primo dà
un disegno vettoriale che si apre in qualunque programma; il secondo
un'immagine al doppio del riquadro di vista, che regge lo zoom e la carta.

Entrambi passano da `lib/esporta.ts`, che prima **fissa** il disegno: i colori
della ruota sono `var(--elemento-fuoco)` e simili, e i corpi dei glifi stanno in
classi che vivono nel componente — fuori dal documento non esiste né l'una cosa
né l'altra, e un SVG serializzato così com'è uscirebbe nero. Si legge quindi il
valore calcolato di ogni proprietà che conti, nodo per nodo, e lo si scrive come
attributo; lo stile in riga va tolto, o vincerebbe sull'attributo appena
scritto. Sotto tutto viene dipinto un rettangolo del colore di sfondo, perché un
file trasparente perde i glifi scuri su qualunque fondo scuro.

Salvare e stampare **tolgono la selezione in corso**. Con un corpo scelto la
ruota attenua gli altri glifi e le linee escluse non sono attenuate ma assenti:
nel file mancherebbero senza che nulla lo dica. Un documento non è la fotografia
di come lo si stava leggendo. Vale anche per chi stampa con la scorciatoia della
tastiera, che non passa dal pulsante.

La stampa è governata da un `@media print` in `app.css`: via testata, menù,
modulo e piè di pagina; `color-scheme` torna a `light` anche per chi lavora in
scuro, o ne uscirebbero fogli neri; la griglia passa a una colonna, con la ruota
in cima. Le spiegazioni del dominio restano — su carta servono quanto a schermo
— mentre le istruzioni d'uso, marcate `.istruzione`, spariscono: «scegli un
corpo per isolarne gli aspetti» su un foglio è una promessa che nessuno può
mantenere.

### Il prompt per un'AI

In cima alla colonna dei dati del tema natale, prima della tabella dei corpi,
c'è un blocco **Prompt per un'AI** con un solo pulsante: **copia il prompt**.
Mette negli appunti il tema appena calcolato in forma di tabella — la stessa di
`format=compact`, cioè la stessa che legge un agente MCP — preceduto dalle
istruzioni per interpretarlo.

Sta in cima e non in fondo alla pagina perché in fondo non lo trovava nessuno:
la colonna delle tabelle è alta più del triplo del disegno, e un comando dopo
gli aspetti è un comando dietro uno schermo di scorrimento. Sta nella colonna
dei dati e non sotto la ruota perché quella è **appesa**, e un elemento `sticky`
non viene spinto da ciò che lo segue: resta inchiodato in cima mentre il resto
gli scorre sotto, e il blocco finiva sovrapposto al disegno. A schermo largo si
legge comunque accanto alla ruota, senza scorrere; a colonna singola cade fra il
disegno e i corpi, che è lo stesso posto detto in verticale.

Esiste perché il vincolo su cui il progetto è costruito è che il motore non
interpreta, e quel vincolo lascia scoperta una domanda legittima: chi ha appena
calcolato il proprio tema vuole sapere che cosa significhi. La risposta non è
aggiungere l'interpretazione al calcolo, ed è consegnare i dati a chi
interpreta. Il sito non parla con nessun modello, non ha una chiave da spendere
e non manda niente da nessuna parte: il testo finisce negli appunti, e dove vada
poi lo decide chi lo incolla.

È anche la ragione per cui **una chat qui dentro non c'è**. Una casella di testo
su questa pagina significherebbe mandare data, ora e luogo di nascita a un
fornitore terzo, e l'informativa promette che aprendo il sito il browser non
contatta nessun altro server. Quella promessa vale più della comodità di non
dover cambiare finestra.

Le istruzioni copiate sono la versione breve di
[`docs/prompt-lettura.md`](docs/prompt-lettura.md), ridotta ai divieti: qui il
calcolo viaggia già insieme al testo, quindi degli otto endpoint non resta
niente da dire, e ciò che serve è la parte che impedisce a un modello di
riempire i vuoti — non ricalcolare, non aggiungere punti che non ci sono, niente
previsioni datate né numeri fortunati, e silenzio su Ascendente e case quando
l'ora di nascita manca.

La tabella arriva dal server invece di essere ricomposta nel browser: la resa
compatta vive in `core`, e il client di `apps/web` da `core` importa solo tipi.
Riscriverla lì significherebbe due formattatori destinati a divergere, e a
divergere sarebbe proprio il testo che qualcun altro legge.

### Il disegno servito

Quel che sopra esce dal browser, `packages/ruota` lo produce anche **senza un
browser**: la stessa carta come SVG o come PNG, dalla CLI, dall'API e dal
server MCP.

```sh
casa11 --date 1978-06-02 --time 15:15 --lat 38.1166 --lon 13.3636 --tz Europe/Rome \
       --svg tema.svg --png tema.png --tema scuro
```

Il disegno **si aggiunge ai dati, non li sostituisce**: la tabella si stampa lo
stesso. Un'immagine non porta le avvertenze del calcolo — un corpo non
calcolabile, un'ora ambigua per il cambio d'ora — e mostrarla da sola
significa mostrare una carta di cui non si sa se sia completa. Vale per la CLI
come per l'agente, e la descrizione del tool MCP lo dice a chiare lettere.

Sono due disegnatori per la stessa ruota — `ChartWheel.svelte`, interattivo, e
`svg.ts`, statico — e non si possono accorpare: il sorvolo e la scelta di un
corpo non sopravvivono alla serializzazione. Condividono però `wheel.ts` di
`packages/ruota`, la geometria — anche l'interfaccia la importa da lì invece di
tenerne una sua: a divergere potranno essere i pesi e i colori, mai le
posizioni.

Due cose che nella pagina non esistono e qui vanno risolte a mano:

- **I colori.** Nel documento sono `var(--elemento-fuoco)`, e `light-dark()` ne
  tiene due per ciascuno. Fuori dal documento una `var()` non risolta non è un
  colore sbagliato, è nessun colore: `palette.ts` ne fa due palette di
  esadecimali, e i valori vanno tenuti allineati a quelli di `app.css`.
- **I font.** I glifi sono caratteri Unicode, non tracciati, e la ruota conta
  di trovarli in un font di sistema. In un'immagine `node:*-slim` di font non
  ce n'è nessuno, e il PNG non esce con dei glifi sbagliati: esce **senza testo
  affatto** — niente pianeti, niente numeri delle case, niente sigle degli
  assi. Una ruota di sole linee, che sembra riuscita finché non la si legge, e
  che nessun errore segnala. Servono due cose insieme, e nessuna delle due
  basta da sola: il Dockerfile installa `fonts-dejavu-core` — DejaVu è l'unico
  font diffuso che li porti tutti, `⊗` della Parte di Fortuna compreso — e
  `png.ts` indica a resvg le cartelle in cui cercarli, perché `loadSystemFonts`
  su Linux si appoggia a fontconfig, che in un'immagine `slim` non è installato.

La rasterizzazione sta in un punto d'ingresso separato,
`@undicesimacasa/ruota/png`, perché porta con sé un modulo nativo
(`@resvg/resvg-js`, MPL-2.0): il bundle del browser non deve avere modo di
incontrarlo, e importarlo solo da `lib/server` lo garantisce per costruzione
invece che per attenzione.

### Privacy

Non c'è nulla da consentire, quindi non c'è nessun banner: il sito **non
imposta cookie**, non ha account, non profila e non carica nessuna risorsa da
domini terzi. I dati di nascita sono calcolati in memoria e non vengono
conservati da nessuna parte. L'informativa sta su `/privacy`.

Sul dispositivo restano due sole scritture, entrambe dichiarate
nell'informativa — che deve descrivere quello che il sito fa, non quello che
vorremmo facesse:

- `sveltekit:scroll` nella `sessionStorage`, dove il router del framework tiene
  la posizione dello scorrimento per il ritorno indietro: due numeri per
  pagina, nessun identificativo, cancellati alla chiusura della scheda;
- `undicesimacasa:color-scheme` nella `localStorage`, la parola `light` o
  `dark` scritta dal pulsante dell'aspetto. Non esiste finché il pulsante non
  viene toccato e sparisce tornando su «automatico»: è la ragione per cui
  quello stato si chiama `auto` e non è un terzo colore.

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

## Applicazione desktop

La stessa applicazione web, dentro una finestra. `apps/desktop` non duplica
niente: il processo principale di Electron avvia il server SvelteKit già
compilato come processo di utilità, su una porta libera del loopback, e la
finestra vi punta. La superficie resta una — ciò che funziona sul web funziona
identico qui, API comprese — e ogni correzione all'interfaccia arriva al
desktop senza lavoro aggiuntivo.

```sh
npm run build                              # prima: compila tutto il monorepo
npm start -w @undicesimacasa/desktop       # avvio in sviluppo
npm run dist -w @undicesimacasa/desktop    # AppImage per Linux, in apps/desktop/release/
npm run dist:win -w @undicesimacasa/desktop  # installer Windows (richiede Wine o una macchina Windows)
```

L'impacchettamento passa da `scripts/stage.mjs`, che raccoglie in `bundle/` il
server compilato, i pacchetti del monorepo disposti come in un `node_modules`
e le sole dipendenze caricate a runtime (`sweph` coi suoi binari precompilati,
`luxon`); electron-builder copia il tutto in `resources/`, fuori dall'asar,
perché un modulo nativo dentro un archivio non si carica. I file di effemeridi
`.se1`, se scaricati, viaggiano dentro il pacchetto: l'app installata calcola
in modalità `swisseph` senza configurare nulla. In sviluppo l'app usa l'albero
del repo così com'è, dataset delle località compreso.

Il database delle località invece **non viaggia** nell'installer, per lo
stesso motivo per cui non è versionato: è un artefatto rigenerabile di ~90 MB.
Al primo avvio, se assente, l'app propone di scaricarlo — riusa lo script di
importazione di `packages/geo`, mostrandone l'avanzamento — e lo salva nella
cartella dati dell'utente (`~/.config/undicesimacasa` su Linux). Si può anche
rifiutare: tutto il resto funziona, e le località si inseriscono per
coordinate.

I pacchetti prodotti non sono firmati: su Windows SmartScreen avviserà, e la
firma (così come una build macOS, tecnicamente già alla portata di
`sweph`, che ha il binario per Apple Silicon) è un passo successivo che
richiede certificati, non codice.

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

Espone il calcolo agli agenti: otto tool su trasporto stdio. La configurazione
del client, i parametri di ogni tool e le due risorse di riferimento stanno in
[`docs/mcp.md`](docs/mcp.md); qui c'è il perché delle scelte che quei parametri
riflettono.

**La ricerca del luogo è separata dal calcolo.** `compute_natal_chart` non fa
geocoding. Un tool unico dovrebbe scegliere in silenzio fra le decine di "Roma"
del mondo, e uno sbaglio lì produce un tema plausibile e sbagliato — che è il
modo peggiore di sbagliare, perché nessuno se ne accorge. Così la
disambiguazione resta una decisione esplicita, e `location_id` evita che
l'agente ricopi a mano tre valori numerici.

**Il cielo non è un tema senza nascita.** `compute_sky` e `find_sky_events` non
hanno nessun parametro obbligatorio, e le loro descrizioni insistono sulla
differenza che un modello tenderebbe a perdere: senza una nascita non esistono
transiti, esiste solo il cielo; con una nascita il cielo da solo non basta.
Serve a evitare che un agente inventi una data di nascita per poter chiamare
`compute_transits`, o che chiami questi quando la domanda riguarda una persona.

**La data di adesso va sempre omessa** — `transit_date`, `from`, `date` —
perché la mette il server, che è la sola fonte a saperla. È la stessa ragione
per cui i tool non convertono l'ora e non inventano le coordinate: le
descrizioni dicono all'agente che cosa non deve fare da sé, perché è lì che un
modello produce un risultato plausibile e sbagliato.

**`draw_chart_wheel` restituisce PNG anche se il progetto sa produrre SVG**: un
modello non vede un SVG, lo legge come testo, e una ruota serializzata sono
ventimila caratteri di coordinate che non assomigliano a niente. Va chiamato
*dopo* `compute_natal_chart` e non al posto suo — un disegno non contiene le
avvertenze del calcolo — e la sua descrizione lo dice. Ogni immagine viaggia
con una riga che dichiara di quale carta sia: due ruote di due persone diverse
si somigliano abbastanza da confondersi. Il lato predefinito è 900 punti, che
non è il massimo possibile ma il punto in cui i glifi restano leggibili senza
che l'immagine costi il quadruplo dei token.

**Un errore torna come risultato, non come eccezione.** Un tool che lancia dice
all'agente solo «è andata male»; uno che restituisce un messaggio con il rimedio
gli permette di correggersi alla chiamata successiva. Da qui l'insistenza dei
messaggi sul suggerire l'azione.

## Sviluppo

```sh
npm test                                  # tutti i workspace
npm run test:watch -w @undicesimacasa/core
npm run typecheck
npm run build
```
