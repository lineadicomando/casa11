<!--
  Le convenzioni con cui il sito calcola, dette a chi legge.

  Non è documentazione per chi tocca il codice — quella sta nei commenti, che
  restano la fonte — ma il rovescio del vincolo che regge tutto il progetto: se
  il motore promette predicati che chiunque può ricalcolare, allora deve dire
  con quale convenzione li ha calcolati, e deve dirlo dove il risultato si
  guarda e non solo dentro un `warnings` che nessuno apre.

  Ogni numero qui dentro sta anche in `packages/core`, ed è il posto in cui
  cambia per primo: `constants.ts` per orbite, corpi e sistemi di case,
  `ayanamsa.ts` per i sei ayanamsa, `varga.ts` per le sei divisionali. Quando
  quelli cambiano, questa pagina è vecchia — non c'è nessun test che la leghi,
  e non è una dimenticanza: legarla vorrebbe dire ridurre la prosa a una tabella
  generata, che è esattamente la cosa che una pagina come questa non deve
  essere.
-->
<script lang="ts">
  import Meta from '$lib/components/Meta.svelte';
</script>

<Meta
  titolo="Metodo"
  descrizione="Le convenzioni con cui il sito calcola: effemeridi, ayanamsa, sistemi di case, orbite degli aspetti, formula della Parte di Fortuna, nakshatra, dasha e varga."
/>

<h1>Metodo</h1>
<p class="aggiornamento">
  Con quali convenzioni questo sito calcola, e dove le scuole non vanno
  d'accordo.
</p>

<div class="sintesi">
  <ul>
    <li>Il calcolo è deterministico: stessi dati in ingresso, stesso risultato.</li>
    <li>Dove le scuole divergono, la convenzione usata viaggia accanto al numero.</li>
    <li>Quello che i numeri significhino non lo dice mai nessuna pagina di questo sito.</li>
  </ul>
</div>

<p>
  Un tema natale non è una misura: è una misura <em>più</em> una lunga fila di
  convenzioni. Due programmi che partono dalla stessa nascita danno due carte
  diverse, e quasi mai perché uno dei due sbaglia i conti — perché contano
  l'inizio dell'Ariete da due punti diversi, dividono le case con due formule
  diverse, chiamano aspetto due angoli diversi. Questa pagina elenca le scelte
  fatte qui, così che chi trova un risultato diverso altrove possa vedere dove
  le due strade si separano invece di chiedersi chi ha ragione.
</p>

<h2 id="predicati">Che cosa il motore dice e che cosa tace</h2>

<p>
  Il confine è netto e non è una modestia di facciata: il motore emette
  <strong>predicati verificabili</strong>, cioè affermazioni che chiunque può
  ricalcolare dagli stessi dati di partenza seguendo la convenzione dichiarata
  accanto al risultato. «La Luna è a 12°34' dello Scorpione», «sette corpi su
  dieci cadono in segni d'acqua», «Saturno torna diretto il 15 novembre alle
  03:41 UTC» sono predicati. «Saturno in settima ritarda il matrimonio» non lo
  è, e da questo sito non esce.
</p>

<p>
  Il confine non è l'ampiezza del calcolo ma il significato: un conteggio esteso
  a tutto il tema si può fare, un'inferenza su una vita no. È la stessa riga che
  separa il settore diurno dal carattere di chi è nato di giorno — il motore
  produce il primo e tace sul secondo.
</p>

<h2 id="effemeridi">Le effemeridi</h2>

<p>
  Le posizioni vengono da <a href="https://www.astro.com/swisseph/" target="_blank" rel="noopener">Swiss
  Ephemeris</a>, che è lo standard di fatto anche dei programmi commerciali.
  Quando i suoi file di dati non sono installati il motore ripiega sulle
  effemeridi analitiche di Moshier: il sito resta utilizzabile, la precisione
  scende di una frazione di secondo d'arco sui pianeti principali — irrilevante
  per un tema, dove il grado è già una misura fine — e <strong>Chirone non è
  più calcolabile</strong>, perché richiede il file degli asteroidi.
</p>

<p>
  Quale delle due strade sia stata presa non resta implicito: finisce fra le
  avvertenze che accompagnano il risultato. È la regola generale del motore —
  <strong>il fallimento è parziale</strong>. Un corpo che non si riesce a
  calcolare produce un avviso e non un errore, e la carta arriva lo stesso con
  tutto il resto.
</p>

<h2 id="zodiaco">Lo zodiaco, e i ventiquattro gradi di differenza</h2>

<p>
  I due zodiaci non sono due astronomie: sono due convenzioni su dove cominci
  l'Ariete. Quello <strong>tropicale</strong>, usato dall'astrologia
  occidentale, lo fa cominciare al punto vernale — l'equinozio di primavera —
  che per via della precessione degli equinozi arretra di circa un grado ogni
  settantadue anni. Quello <strong>siderale</strong>, usato dall'astrologia
  indiana, lo àncora alle stelle fisse.
</p>

<p>
  Lo scarto fra i due si chiama <em>ayanamsa</em> e oggi vale poco più di
  ventiquattro gradi: quasi un segno intero. Vuol dire che la stessa persona ha
  quasi sempre due Soli diversi a seconda della convenzione, e che chi si è
  visto dire due segni solari diversi non è stato ingannato da nessuno dei due.
</p>

<p>
  Non esiste un ayanamsa giusto: dipende da quale stella si prende come chiodo
  e a quale longitudine la si fissa. Fra Lahiri — l'ufficiale del governo
  indiano, e il predefinito qui — e Raman corre più di un grado e mezzo,
  abbastanza da spostare la Luna di un nakshatra e con essa l'intera sequenza
  delle dasha. Il sito ne espone sei: <strong>Lahiri</strong>,
  <strong>Chitrapaksha vero</strong>, <strong>Krishnamurti</strong>,
  <strong>Raman</strong>, <strong>Yukteshwar</strong> e
  <strong>Fagan/Bradley</strong>. Il valore in gradi viaggia col risultato, non
  solo il nome.
</p>

<h2 id="case">I sistemi di case</h2>

<p>
  Nove, e la scelta cambia la carta più di quanto si creda: uno stesso pianeta
  può stare in decima con Placido e in nona a segni interi. Sono
  <strong>Placido</strong> (il predefinito, e il più diffuso in Occidente),
  <strong>Koch</strong>, <strong>segni interi</strong>, <strong>equale</strong>,
  <strong>Regiomontano</strong>, <strong>Campano</strong>,
  <strong>Porfirio</strong>, <strong>topocentrico</strong> e
  <strong>Alcabizio</strong>.
</p>

<p>
  Placido e Koch <strong>non sono definiti alle latitudini polari</strong>: oltre
  il circolo polare certe cuspidi non esistono. In quel caso Swiss Ephemeris
  ripiega da sé su Porfirio, e il sito lo riporta fra le avvertenze invece di
  tacerlo, perché è un'altra carta e non la stessa carta con un dettaglio in
  meno.
</p>

<p>
  Il sistema di case usato viaggia col tema. Anche il sistema Gauquelin, che
  divide il cielo in trentasei settori invece che in dodici, non è supportato:
  produce un errore esplicito, non dodici cuspidi arbitrarie.
</p>

<h2 id="ora-ignota">Quando l'ora di nascita non si sa</h2>

<p>
  Il sito calcola lo stesso, e non chiede di inventare un'ora. Quello che cade è
  tutto e solo ciò che dipende dalla rotazione della Terra: niente Ascendente,
  niente Medio Cielo, nessuna casa, nessuna Parte di Fortuna — che si costruisce
  sull'Ascendente — e nessun settore diurno o notturno. Restano le posizioni nei
  segni e gli aspetti fra i corpi.
</p>

<p>
  La Luna resta il dato più fragile: percorre circa tredici gradi al giorno,
  quindi su una nascita a ora ignota il suo grado è incerto di mezzo segno. È
  una carta più povera, non una carta approssimata.
</p>

<h2 id="corpi">I corpi</h2>

<p>
  Di serie: i dieci fra luminari e pianeti — Sole, Luna, Mercurio, Venere,
  Marte, Giove, Saturno, Urano, Nettuno, Plutone — più l'asse dei Nodi lunari.
  Su richiesta anche <strong>Lilith</strong> e <strong>Chirone</strong>.
</p>

<p>
  Due precisazioni che altrove restano implicite. Il <strong>Nodo Nord è il nodo
  medio</strong>, non quello vero: sono due punti che distano fino a un grado e
  mezzo, e i programmi si dividono su quale usare. Il Nodo Sud non è calcolato
  ma derivato, essendo per definizione all'opposizione esatta del Nord — per la
  stessa ragione non compare fra i corpi in transito, dove ogni sua riga sarebbe
  una riga già presente letta al contrario, e non gli si assegna nessun aspetto
  col Nord. <strong>Lilith è l'apogeo lunare medio</strong>, la cosiddetta Luna
  Nera; anche qui la variante vera esiste ed è un altro punto.
</p>

<p>
  I graha retrogradi sono marcati con <code>℞</code>.
</p>

<h2 id="aspetti">Gli aspetti e le orbite</h2>

<p>
  Un aspetto è una distanza angolare fra due punti, ammessa entro una tolleranza
  che si chiama orbita. Le orbite sono la convenzione su cui i programmi
  divergono di più, perché non discendono da niente: si scelgono. Queste sono
  quelle usate qui.
</p>

<table>
  <thead>
    <tr>
      <th>Aspetto</th>
      <th>Angolo</th>
      <th>Orbita natale</th>
      <th>Orbita in transito</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Congiunzione</td><td>0°</td><td>8°</td><td>2°</td></tr>
    <tr><td>Opposizione</td><td>180°</td><td>8°</td><td>2°</td></tr>
    <tr><td>Trigono</td><td>120°</td><td>7°</td><td>2°</td></tr>
    <tr><td>Quadrato</td><td>90°</td><td>7°</td><td>2°</td></tr>
    <tr><td>Sestile</td><td>60°</td><td>5°</td><td>1,5°</td></tr>
    <tr><td>Semisestile</td><td>30°</td><td>2°</td><td>1°</td></tr>
    <tr><td>Quinconce</td><td>150°</td><td>3°</td><td>1°</td></tr>
    <tr><td>Semiquadrato</td><td>45°</td><td>2°</td><td>1°</td></tr>
    <tr><td>Sesquiquadrato</td><td>135°</td><td>2°</td><td>1°</td></tr>
  </tbody>
</table>

<p>
  I quattro aspetti minori — semisestile, quinconce, semiquadrato,
  sesquiquadrato — <strong>sono esclusi finché non si chiedono</strong>: la
  tabella predefinita porta i cinque maggiori.
</p>

<p>
  <strong>I luminari ricevono orbite più larghe</strong>, secondo la prassi
  corrente: due gradi in più nel tema natale, e il bonus vale per ciascuno dei
  due lati della coppia — un aspetto fra Sole e Luna somma quindi quattro gradi.
  In transito il supplemento è di un grado per la Luna e mezzo per il Sole, in
  entrambi i versi: un contatto che tocca il Sole natale ha più spazio tanto
  quanto ne ha la Luna che passa.
</p>

<p>
  Le orbite dei transiti sono molto più strette e non per gusto: con gli otto
  gradi natali un transito di Saturno resterebbe «in aspetto» per mesi di fila,
  e il quadro del momento diventerebbe un elenco di contatti permanenti che non
  distingue il giorno in cui l'aspetto si perfeziona da quello prima e da quello
  dopo.
</p>

<p>
  Ogni aspetto porta anche la direzione — <strong>applicativo</strong> se la
  distanza si sta stringendo, <strong>separativo</strong> se si sta aprendo —
  ricavata dal moto di entrambi i punti e non dal solo più veloce.
</p>

<h2 id="fortuna">La Parte di Fortuna</h2>

<p>
  Proietta sull'Ascendente la distanza fra Sole e Luna. È il caso da manuale di
  convenzione divergente: nella tradizione ellenistica e medievale la formula
  <strong>si inverte nei temi notturni</strong>, mentre parte dei programmi
  moderni usa sempre la forma diurna. Su un tema notturno le due danno risultati
  che possono distare oltre cento gradi — non un dettaglio, un altro punto in un
  altro segno.
</p>

<p>
  Qui il predefinito è la formula che tiene conto del settore, cioè quella che
  si inverte di notte. L'altra resta disponibile, e serve soprattutto a
  riprodurre il risultato di un altro programma quando lo si sta confrontando.
  La formula usata è dichiarata accanto al punto.
</p>

<p>
  Il settore diurno o notturno non si decide dal numero di casa del Sole ma
  geometricamente, dall'arco fra Discendente e Ascendente: nei segni interi la
  settima casa non comincia al Discendente, e «casa maggiore o uguale a sette»
  darebbe la risposta sbagliata.
</p>

<h2 id="distribuzione">La distribuzione fra elementi e modalità</h2>

<p>
  Che l'Ariete sia di fuoco non è interpretazione ma classificazione, e su
  quella non c'è scuola che dissenta da Tolomeo in poi. Il punto delicato non è
  contare: è <strong>decidere che cosa contare</strong>. Includere gli assi? La
  Parte di Fortuna? I Nodi? Le scuole non concordano, e un totale solo
  nasconderebbe la scelta dentro un numero.
</p>

<p>
  Qui la decisione non si prende. I dieci fra luminari e pianeti fanno un gruppo,
  e ciò che sta oltre — Nodi, Lilith, Chirone, assi, Parte di Fortuna — viene
  contato a parte invece che escluso. Ogni gruppo porta con sé
  <strong>l'elenco di ciò che ha contato</strong>, così che chi conta
  diversamente possa rifare la somma senza rifare il tema.
</p>

<h2 id="jyotisha">L'astrologia indiana</h2>

<p>
  I termini restano in sanscrito, qui come nel resto del sito: <em>nakshatra</em>,
  <em>dasha</em>, <em>varga</em>, <em>drishti</em>, <em>tithi</em>. Tradurli
  produrrebbe parole che nessun libro usa e che non si possono cercare da
  nessuna parte — «dimore lunari» per i nakshatra è una perifrasi, non un nome.
  Tutto quello che segue vale <strong>nello zodiaco siderale</strong>.
</p>

<h3 id="nakshatra">I nakshatra</h3>

<p>
  Lo zodiaco diviso in ventisette parti invece che in dodici: sono le tappe di
  un giro della Luna, non del Sole, e ciascuna misura 13°20'. Nell'astrologia
  indiana pesano quanto i segni e in più d'un caso di più — il nakshatra della
  Luna alla nascita è quello che si intende quando si chiede sotto quale stella
  qualcuno è nato. Ognuno si divide in quattro <em>pada</em> di 3°20'.
</p>

<p>
  Chiederne uno su una longitudine tropicale è una domanda malposta: un
  nakshatra è un tratto di cielo fra stelle fisse, e contarlo dal punto vernale
  lo staccherebbe dalle stelle che lo nominano. Il motore lo dice invece di
  rispondere con un numero.
</p>

<h3 id="dasha">Le dasha vimshottari</h3>

<p>
  Il tempo diviso in periodi retti da un graha. <em>Vimshottari</em> vuol dire
  centoventi, e tanti sono gli anni del ciclo intero; i nove graha se li
  dividono in parti fisse e disuguali che sommano a centoventi esatti. Ogni
  periodo si suddivide nei nove secondo le stesse proporzioni: qui la
  suddivisione si ferma al terzo ordine.
</p>

<p>
  Dove la catena cominci lo dice il nakshatra della Luna alla nascita; quanto ne
  resti lo dice il punto esatto dentro quel nakshatra. È l'unico calcolo del
  sito in cui un secondo d'arco vale ore di calendario — 13°20' valgono fino a
  vent'anni di dasha, quindi un secondo d'arco vale circa tre ore e mezza. Su
  un'ora di nascita incerta, le date che ne escono lo sono altrettanto.
</p>

<p>
  È la cosa più simile a una previsione che il sito emetta, e resta aritmetica:
  dice quando un periodo comincia, non che cosa ci accadrà dentro.
</p>

<h3 id="varga">I varga</h3>

<p>
  Un varga divide ogni segno in <em>n</em> parti e assegna a ciascuna un segno,
  secondo una regola che cambia da varga a varga. Ne esce una carta nuova, con
  gli stessi corpi in posti diversi: il D-9 di una nascita è una seconda carta,
  non una colonna della prima. Il sito ne calcola sei — <strong>D-1, D-3, D-9,
  D-10, D-12 e D-30</strong>.
</p>

<p>
  Fra le sedici divisioni classiche le scuole divergono su più d'una, e un segno
  consegnato senza la regola che l'ha prodotto non si può ricontrollare: per
  questo <strong>la regola viaggia col risultato</strong>, scritta per esteso
  accanto alla carta. A che cosa serva ciascun varga è interpretazione e sta a
  chi legge; che cosa ciascuno sia è aritmetica, ed è dichiarata.
</p>

<h3 id="drishti">Le drishti</h3>

<p>
  Non sono gli aspetti occidentali con un altro nome, e differiscono in tutto.
  <strong>Si contano a segni interi</strong>: non c'è orbita, un graha guarda un
  segno intero e tutto ciò che vi si trova. <strong>Sono direzionali</strong>: si
  contano sempre in avanti nello zodiaco, quindi che A guardi B non implica che
  B guardi A. E <strong>cadono anche sul vuoto</strong>, perché un graha che
  guarda una casa disabitata la guarda lo stesso — per questo i segni
  bersagliati si riportano tutti, non solo quelli occupati.
</p>

<p>
  La regola di base è che ognuno guarda il settimo da sé, cioè il segno opposto.
  Tre ne hanno altre due ciascuno: Marte la quarta e l'ottava, Giove la quinta e
  la nona, Saturno la terza e la decima.
</p>

<h3 id="panchanga">Il panchanga</h3>

<p>
  Le cinque membra del calendario indiano — tithi, vara, nakshatra, yoga e
  karana. Non è un tema: è la qualità di un istante in un luogo. Tutto discende
  da due sole longitudini, quella del Sole e quella della Luna, e da un'alba.
</p>

<p>
  Da lì discende anche una distinzione che vale la pena tenere a mente:
  <strong>tithi e karana non dipendono dall'ayanamsa</strong>, perché una
  differenza fra due longitudini non cambia se si spostano entrambe. Nakshatra e
  yoga sì — e lo yoga il doppio degli altri, perché usa la somma.
</p>

<h2 id="elezione">L'elezione: le ore planetarie</h2>

<p>
  Qui l'istante non si riceve, si cerca. Il calcolo dice di che cosa è fatto il
  tempo in un certo luogo, e tre cose lo rendono diverso dal resto del sito.
</p>

<ul>
  <li>
    <strong>Dipende dal luogo più di ogni altro calcolo.</strong> Alba e tramonto
    muovono tutto: a parità di istante, un'ora planetaria di Palermo non è quella
    di Oslo.
  </li>
  <li>
    <strong>Le ore non durano un'ora.</strong> Il giorno si divide comunque in
    dodici parti — lunghe d'estate, corte d'inverno — e la notte per differenza.
  </li>
  <li>
    <strong>Il giorno comincia all'alba</strong>, non a mezzanotte: il reggitore
    di lunedì entra in carica quando il Sole sorge, non quando scatta la data.
  </li>
</ul>

<p>
  La successione dei reggitori segue l'ordine caldeo, cioè i sette pianeti
  classici per velocità apparente decrescente. Ventiquattro ore avanzano di tre
  posizioni nella catena, ed è da questo scarto che nasce l'ordine dei giorni
  della settimana — che infatti non è quello dei pianeti, e che sopravvive
  intatto nei nomi italiani dei giorni.
</p>

<p>
  Accanto alle ore compare il <strong>vuoto di corso</strong> della Luna: il
  tratto in cui non perfeziona più alcun aspetto maggiore prima di lasciare il
  segno, e che dura da pochi minuti a un giorno e mezzo. Il sito dice quando
  comincia e quando finisce. Che la tradizione sconsigli di cominciare qualcosa
  mentre è in corso è interpretazione, e sta a chi legge.
</p>

<p>
  Nessuna di queste pagine dice quale ora sia propizia. Il risultato è un
  calendario, non una classifica, ed è una scelta di fondo: una graduatoria
  sarebbe un giudizio travestito da numero.
</p>

<h2 id="rifare-i-conti">Rifare i conti</h2>

<p>
  Tutto quello che l'interfaccia mostra è disponibile anche altrove, con gli
  stessi parametri: un'<strong>interfaccia REST</strong> sotto
  <code>/api</code>, in cui ogni endpoint è una richiesta <code>GET</code>
  perché un tema è una funzione pura dei suoi argomenti; una <strong>riga di
  comando</strong>; e un <strong>server MCP</strong> per chi lavora con un
  assistente. I parametri sono documentati nei commenti delle rotte e nelle
  descrizioni dei tool, che restano la fonte.
</p>

<p>
  Il codice è pubblico e la licenza è AGPL-3.0-or-later: chiunque può leggere
  come ciascuno di questi numeri viene fuori, e correggerlo se è sbagliato. È il
  senso di questa pagina — non chiedere fiducia, ma dire dove guardare.
</p>

<style>
  code {
    font-size: 0.9em;
    background: var(--accento-tenue);
    padding: 0.05em 0.3em;
    border-radius: 0.25rem;
    word-break: break-word;
  }

  /* La tabella delle orbite prende lo stile globale dei risultati — è la stessa
     tabella, e deve leggersi allo stesso modo — ma qui sta in mezzo a un testo
     corrente e ha bisogno dell'aria che nell'interfaccia le dà il riquadro che
     la contiene. */
  table {
    margin: 0.4rem 0 1.4rem;
  }

  /* I gradi in colonna si confrontano leggendo in verticale, e con
     l'allineamento a sinistra «1,5°» e «2°» non cominciano nello stesso punto. */
  td:not(:first-child),
  th:not(:first-child) {
    text-align: right;
    padding-right: 0;
  }
</style>
