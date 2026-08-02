<script lang="ts">
  import { REPOSITORY_URL } from '$lib/project';

  /**
   * Data dell'ultima revisione del testo. Va aggiornata **a mano** insieme al
   * contenuto: ricavarla dal momento della compilazione la farebbe cambiare
   * a ogni ricostruzione, e un'informativa che si dice aggiornata senza
   * esserlo dice il falso proprio sul punto in cui deve essere credibile.
   */
  const AGGIORNAMENTO = '31 luglio 2026';

  /** Giorni di conservazione dei log del server. Vedi `docs/proxy-e-log.md`. */
  const RITENZIONE_LOG = 7;
</script>

<svelte:head>
  <title>Privacy e cookie — undicesimacasa</title>
  <meta
    name="description"
    content="Informativa privacy e cookie: il sito non usa cookie, non profila e non conserva i dati di nascita inseriti."
  />
</svelte:head>

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
  Il resto della pagina spiega per esteso queste cinque righe, comprese le due
  cose che il sito <em>fa</em> registrare: i log tecnici del server e il fatto
  che i dati inseriti passino per l'indirizzo della pagina.
</p>

<h2>Titolare del trattamento</h2>

<p>
  Il trattamento è svolto nell'ambito del progetto <strong>undicesimacasa</strong>,
  software libero distribuito sotto licenza AGPL-3.0. Per qualsiasi richiesta
  relativa ai dati personali, compreso l'esercizio dei diritti descritti più
  avanti, il recapito è
  {#if REPOSITORY_URL}
    <a href={REPOSITORY_URL}>il repository pubblico del progetto</a>.
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
  Va detta però una cosa che si vede a occhio nudo:
  <strong>i valori inseriti compaiono nell'indirizzo</strong> della richiesta
  (<code>/api/chart?date=…&amp;time=…</code>). È una scelta voluta — rende un
  tema condivisibile con un collegamento e riproducibile — ma ha due
  conseguenze: quell'indirizzo resta nella cronologia del tuo browser, e
  transita per i log del server descritti qui sotto. Il server è configurato
  per registrare il percorso <em>senza</em> i parametri, proprio per non
  conservarli.
</p>

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
  di terze parti. Non usa la memoria persistente del browser
  (<em>localStorage</em>) né alcuna tecnologia equivalente per riconoscerti fra
  una visita e l'altra.
</p>

<p>
  Una cosa il browser la conserva, e sarebbe scorretto tacerla: passando da una
  pagina all'altra il sistema di navigazione registra nella
  <em>sessionStorage</em> la posizione dello scorrimento, alla voce
  <code>sveltekit:scroll</code>, per riportarti dove eri se torni indietro. Sono
  due numeri per pagina — nessun identificativo, nessun dato che ti riguardi — e
  spariscono chiudendo la scheda.
</p>

<p>
  Nessuno di questi elementi richiede il tuo consenso: sono strettamente
  necessari a far funzionare la navigazione e non permettono di riconoscerti.
  Non c'è quindi nessun banner. Le opzioni che scegli nel modulo — sistema di
  case, aspetti minori — non vengono memorizzate affatto: vivono nella pagina
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
  Non viene svolta alcuna attività di profilazione, non viene costruito alcun
  profilo di comportamento o di interessi, non esiste alcun processo
  decisionale automatizzato che ti riguardi. I dati non vengono usati per
  finalità commerciali, pubblicitarie o promozionali, né ceduti o venduti a
  terzi per tali finalità.
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
  forma portabile (artt. 15-22).
</p>

<p>
  Nella pratica, sui dati di nascita questi diritti sono già soddisfatti dal
  fatto che nulla viene conservato: non c'è un archivio da consultare o da
  ripulire. Restano esercitabili sui log tecnici, per il tempo in cui esistono,
  scrivendo al recapito indicato sopra e indicando l'indirizzo IP e il periodo
  di riferimento — sono i soli elementi che permettono di ritrovare le righe
  che ti riguardano.
</p>

<p>
  Hai inoltre diritto di proporre reclamo al
  <a href="https://www.garanteprivacy.it/">Garante per la protezione dei dati personali</a>.
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
