<script lang="ts">
  import Meta from '$lib/components/Meta.svelte';
  import { REPOSITORY_URL } from '$lib/project';

  /**
   * Data dell'ultima revisione del testo. Va aggiornata **a mano** insieme al
   * contenuto: ricavarla dal momento della compilazione la farebbe cambiare
   * a ogni ricostruzione, e un'informativa che si dice aggiornata senza
   * esserlo dice il falso proprio sul punto in cui deve essere credibile.
   */
  const AGGIORNAMENTO = '25 agosto 2026';

  /**
   * Giorni di conservazione dei log del server.
   *
   * È una dichiarazione, non una configurazione: va resa vera con la rotazione
   * dei log sul server che sta davanti all'applicazione. Vedi «Prima di mettere
   * in rete» nel README.
   */
  const RITENZIONE_LOG = 7;
</script>

<Meta
  titolo="Privacy e cookie"
  descrizione="Informativa privacy e cookie: il sito non usa cookie, non profila e non conserva i dati di nascita inseriti."
/>

<h1>Privacy e cookie</h1>
<p class="aggiornamento">Ultimo aggiornamento: {AGGIORNAMENTO}</p>

<div class="sintesi">
  <ul>
    <li>Nessun cookie, di nessun tipo. Nessun banner da chiudere.</li>
    <li>Nessuno strumento che ti riconosca fra una visita e l'altra.</li>
    <li>Nessun account, nessuna registrazione, nessuna newsletter.</li>
    <li>Nessuna profilazione e nessuna finalità di marketing.</li>
    <li>Nessun servizio di terze parti: aprendo il sito il browser non contatta nessun altro server.</li>
    <li>I dati di nascita inseriti non vengono conservati: servono al calcolo e finiscono lì.</li>
  </ul>
</div>

<p>
  Restano due cose che il sito <em>fa</em> registrare, e qui sotto sono spiegate
  per esteso: i log tecnici del server, e il fatto che i dati inseriti passino
  per l'indirizzo della richiesta.
</p>

<h2>Titolare del trattamento</h2>

<p>
  Il trattamento è svolto nell'ambito del progetto <strong>dodicisegni</strong>,
  software libero distribuito sotto licenza AGPL-3.0. Per qualsiasi richiesta
  relativa ai dati personali, compreso l'esercizio dei diritti descritti più
  avanti, il recapito è
  {#if REPOSITORY_URL}
    <a href={REPOSITORY_URL} target="_blank" rel="noopener">il repository pubblico del progetto</a>.
  {:else}
    il repository pubblico del progetto.
  {/if}
</p>

<p>
  Questa informativa vale per l'istanza che stai usando. Il codice è libero e
  chiunque può metterne in rete una propria copia: chi lo fa diventa titolare
  del trattamento per la propria istanza, e le condizioni qui descritte non lo
  vincolano.
</p>

<h2>I dati che inserisci nel modulo</h2>

<p>
  Per calcolare un tema servono data, ora e luogo di nascita. Non ti viene
  chiesto un nome, né un indirizzo di posta, né alcun altro elemento che
  colleghi quei valori a una persona.
</p>

<p>
  Il calcolo avviene <strong>in memoria</strong>, alla richiesta: il risultato
  viene restituito e dimenticato. Non esiste alcun archivio dei temi calcolati,
  nessuna cronologia, nessun salvataggio su disco. Lo stesso vale per la ricerca
  della località, che interroga una copia locale del dataset GeoNames senza
  uscire dal server.
</p>

<p>
  C'è una cosa, però, che si vede a occhio nudo:
  <strong>i valori inseriti compaiono nell'indirizzo</strong> della richiesta
  (<code>/api/chart?date=…&amp;time=…</code>). La scelta è voluta, e rende un
  tema riproducibile. Ha due conseguenze: quell'indirizzo resta nella
  cronologia del tuo browser, e arriva al server che tiene i log descritti qui
  sotto. Lì non si ferma: il server è configurato per registrare il percorso
  <em>senza</em> i parametri, proprio per non conservarli.
</p>

<p>
  Diverso è l'indirizzo <strong>della pagina</strong>, quello che leggi nella
  barra del browser, e qui il sito distingue:
</p>

<ul>
  <li>
    Su <strong>Cielo</strong> ed <strong>Elezione</strong> l'indirizzo si
    aggiorna da sé con quello che stai guardando (giorno, ora, fuso, luogo,
    opzioni), così che la pagina si possa ricaricare, mettere fra i segnalibri
    e mandare a qualcuno. Sono un istante e una città: non dicono niente di te.
    Sull'Elezione il tema di nascita facoltativo <em>non</em> ci finisce.
  </li>
  <li>
    Su <strong>Tema natale</strong> e <strong>Transiti</strong> l'indirizzo
    resta pulito, perché lì i dati sono una data e un luogo di nascita. Se vuoi
    condividere un tema c'è il pulsante <em>Copia link</em>, che compone
    l'indirizzo solo in quel momento: da lì in poi quel collegamento porta con
    sé la nascita, e finirà nella cronologia di chi lo apre e nei registri dei
    server che attraversa. È una decisione tua, non un comportamento
    predefinito.
  </li>
</ul>

<h2>I log tecnici del server</h2>

<p>
  L'applicazione è servita da un <em>reverse proxy</em> che tiene un registro
  degli accessi, come qualsiasi server web. Vi finiscono:
</p>

<ul>
  <li>l'indirizzo IP da cui arriva la richiesta;</li>
  <li>data e ora;</li>
  <li>il percorso richiesto, senza i parametri;</li>
  <li>il codice di risposta e la quantità di dati inviati;</li>
  <li>il tipo di browser dichiarato (<em>user agent</em>).</li>
</ul>

<p>
  <strong>Finalità:</strong> far funzionare il servizio, diagnosticare i guasti
  e difenderlo dagli abusi.
  <strong>Base giuridica:</strong> il legittimo interesse del titolare
  (art. 6, par. 1, lett. f del Regolamento UE 2016/679).
  <strong>Conservazione:</strong> {RITENZIONE_LOG} giorni, dopo i quali i
  registri vengono cancellati per rotazione automatica.
</p>

<p>
  Questi registri non vengono incrociati con altro, non alimentano statistiche
  di audience e non vengono comunicati a nessuno.
</p>

<h2 id="cookie">Cookie</h2>

<p>
  <strong>Il sito non installa cookie.</strong> Non tecnici, non analitici, non
  di terze parti. Non usa nessuna tecnologia per riconoscerti fra una visita e
  l'altra: non ti viene assegnato nessun identificativo, e niente di quello che
  resta sul tuo dispositivo dice chi sei.
</p>

<p>Tre cose il browser le conserva, e sarebbe scorretto tacerle.</p>

<ul>
  <li>
    Passando da una pagina all'altra il sistema di navigazione registra nella
    <em>sessionStorage</em> la posizione dello scorrimento, alla voce
    <code>sveltekit:scroll</code>, per riportarti dove eri se torni indietro.
    Sono due numeri per pagina (nessun identificativo, nessun dato che ti
    riguardi) e spariscono chiudendo la scheda.
  </li>
  <li>
    Se scegli l'aspetto della pagina con il pulsante in alto, quella scelta
    (la parola <code>light</code> o <code>dark</code>, nient'altro) resta nella
    <em>localStorage</em> alla voce <code>dodicisegni:color-scheme</code>,
    così ricaricando il sito lo ritrovi come lo avevi lasciato. Finché non
    tocchi il pulsante non viene scritto nulla, e riportandolo su «automatico»
    la voce viene cancellata.
  </li>
  <li>
    Il sito si può <strong>installare</strong> come applicazione, e per potersi
    aprire anche senza collegamento ne tiene una copia sul dispositivo, nel
    <em>Cache Storage</em> alla voce <code>dodicisegni-</code> seguita dal numero
    della versione. Dentro ci sono le pagine, i programmi, gli stili e le
    icone: il contenitore, non il contenuto. <strong>Le risposte del calcolo
    non ci finiscono mai</strong>, e gli indirizzi delle pagine ci vengono
    scritti <strong>senza i parametri</strong>, cioè senza la data, l'ora e il
    luogo che portano con sé, per non farne un elenco dei temi che hai
    guardato. Disinstallando l'applicazione, o cancellando i dati del sito
    dalle impostazioni del browser, sparisce tutto.
  </li>
</ul>

<p>
  Installata, l'applicazione fa esattamente quello che fa nel browser, e nulla
  di più: <strong>non manda notifiche e non ti chiede il permesso di
  mandartene</strong>, non lavora in sottofondo e non accede a nessun sensore.
  Senza collegamento si apre e si sfoglia, ma non calcola: i calcoli li fa il
  server, e senza rete il sito te lo dice invece di far finta.
</p>

<p>
  Nessuno di questi elementi richiede il tuo consenso: sono strettamente
  necessari a far funzionare la navigazione e non permettono di riconoscerti.
  Non c'è quindi nessun banner. Le opzioni che scegli nel modulo, sistema di
  case e aspetti minori, non vengono memorizzate affatto: vivono nella pagina
  aperta e spariscono quando la chiudi.
</p>

<p>
  Lo stesso vale per i dati di nascita, con una precisazione che ti riguarda:
  passando dal tema ai transiti o all'elezione <strong>li ritrovi già
  scritti</strong>, per non doverli ridigitare a ogni sezione. Restano nella
  memoria della pagina aperta, non in un archivio e non sul disco: ricaricando
  il sito i campi tornano vuoti.
</p>

<h2>Nessuna profilazione, nessun marketing</h2>

<p>
  Non c'è profilazione. Non viene costruito nessun profilo di comportamento o
  di interessi, non esiste nessun processo decisionale automatizzato che ti
  riguardi, e i dati non vengono usati per finalità commerciali, pubblicitarie
  o promozionali, né ceduti o venduti a terzi per quelle finalità. Del resto
  mancherebbe la materia: di te restano un indirizzo IP e un percorso, per
  {RITENZIONE_LOG} giorni.
</p>

<h2>Servizi di terze parti</h2>

<p>
  Non ce ne sono. Nessuno strumento di statistica, nessuna rete pubblicitaria,
  nessun servizio di mappe, nessun font caricato da un dominio esterno, nessuna
  CDN. Le pagine usano i caratteri già presenti sul tuo sistema e i simboli
  astrologici dello standard Unicode.
</p>

<p>
  Anche i dati su cui il sito lavora sono in locale: le effemeridi
  <em>Swiss Ephemeris</em> e il dataset delle località <em>GeoNames</em> sono
  copiati sul server, quindi durante un calcolo non parte nessuna chiamata
  verso l'esterno. I collegamenti a quei progetti in fondo alla pagina sono
  collegamenti normali: contattano quei siti solo se decidi di aprirli.
</p>

<h2>Trasferimenti fuori dallo Spazio economico europeo</h2>

<p>Non ne avvengono.</p>

<h2>Interfaccia programmatica e server MCP</h2>

<p>
  Le stesse regole valgono per gli endpoint <code>/api/locations</code> e
  <code>/api/chart</code>, utilizzabili direttamente, e per il server MCP con
  cui il calcolo viene esposto agli agenti conversazionali: nessuna
  autenticazione, nessuna conservazione delle richieste, gli stessi log
  tecnici. Il server MCP, quando eseguito sul tuo computer, non produce
  nemmeno quelli.
</p>

<h2>I tuoi diritti</h2>

<p>
  Il Regolamento UE 2016/679 riconosce il diritto di accedere ai propri dati,
  rettificarli, cancellarli, limitarne o opporsi al trattamento e riceverli in
  forma portabile (artt. 15–22).
</p>

<p>
  Nella pratica, sui dati di nascita questi diritti sono già soddisfatti dal
  fatto che nulla viene conservato: non c'è un archivio da consultare o da
  ripulire. Restano esercitabili sui log tecnici, per il tempo in cui esistono,
  scrivendo al recapito indicato sopra e indicando l'indirizzo IP e il periodo
  di riferimento: sono i soli elementi che permettono di ritrovare le righe
  che ti riguardano.
</p>

<p>
  Hai inoltre diritto di proporre reclamo al
  <a href="https://www.garanteprivacy.it/" target="_blank" rel="noopener">Garante per la protezione dei dati personali</a>.
</p>

<h2>Modifiche</h2>

<p>
  Se questa informativa cambierà, cambierà con essa la data in cima alla
  pagina. La cronologia delle revisioni è pubblica, come tutto il resto del
  codice.
</p>

<style>
  code {
    font-size: 0.9em;
    background: var(--accento-tenue);
    padding: 0.05em 0.3em;
    border-radius: 0.25rem;
    word-break: break-word;
  }
</style>
