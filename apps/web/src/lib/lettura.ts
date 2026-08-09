/**
 * Il tema pronto da incollare in un chatbot.
 *
 * undicesimacasa calcola e non interpreta: il significato è di chi consuma.
 * Questo modulo non tocca quella divisione, la rende praticabile — mette
 * insieme i dati appena calcolati e le istruzioni per leggerli, e lascia
 * l'interpretazione fuori di qui, in un programma che sceglie chi legge. Il
 * sito non parla con nessun modello: il testo finisce negli appunti, e dove
 * vada poi lo decide chi lo incolla.
 *
 * **Queste istruzioni sono il riferimento unico per la lettura**: non esiste
 * un contratto più lungo altrove di cui questo sia il riassunto. Chi le cambia
 * cambia il modo in cui il progetto viene interpretato, ed è l'unico posto in
 * cui farlo.
 *
 * Portano due cose che non si tolgono senza conseguenze. I divieti, che sono
 * la parte che un modello viola per riempire un vuoto. E la griglia di lettura,
 * senza la quale il vuoto lo riempie in un altro modo: eseguendo la procedura
 * tecnica e chiamandola interpretazione.
 */

import { REPOSITORY_URL } from './project';

/**
 * Quello che va detto a chi legge il tema, prima del tema.
 *
 * Corto di proposito, e la ragione è cambiata due volte. Incollare un prompt di
 * sistema di undicimila parole in una casella di chat non funziona: molte lo
 * troncano, e quel che resta è l'inizio. Ma il limite che morde davvero viene
 * prima del troncamento — oltre una certa lunghezza ChatGPT converte l'incolla
 * in un allegato, e un allegato è materiale da consultare, non l'istruzione da
 * eseguire che queste righe sono. La tabella pesa già duemila caratteri e non è
 * comprimibile; l'unico margine è qui, e va speso con avarizia.
 *
 * La prima versione teneva la gerarchia tecnica e i divieti, e ne usciva un
 * manuale: corretto e morto. Il difetto non era la brevità ma l'ordine — la
 * gerarchia dice dove guardare, e consegnata come scaletta diventa un
 * inventario di posizioni in cui nessuno si riconosce. Da qui la forma di
 * adesso, che chiede prima una tesi e poi le prove, e che dice di quali temi
 * la lettura debba occuparsi invece di lasciarli dedurre.
 *
 * Chiedere una tesi, però, non basta a rendere il testo leggibile: senza
 * appigli esce un muro di prosa che si legge tutto o niente. I titoli tematici
 * e le glosse sul significato dei fattori sono l'altra metà — danno la
 * scansione di un elenco senza tornare a essere un elenco, e non danno per
 * scontato un vocabolario che chi legge non ha.
 */
export const ISTRUZIONI = `Questo è un tema natale già calcolato da undicesimacasa con le effemeridi Swiss
Ephemeris: è il risultato di un calcolo, non la richiesta di farne uno. Non
ricalcolarlo e non correggerlo — se un valore ti sembra sbagliato dillo invece
di sistemarlo — e non aggiungere posizioni, aspetti o punti che qui sotto non
compaiano: se una tecnica ti servirebbe e il dato manca, dillo e fermati lì.

COME SCRIVERE

La gerarchia tecnica — struttura d'insieme, poi Sole, Luna e Ascendente, poi
governatori, case e aspetti stretti — è l'ordine in cui GUARDI, non l'ordine in
cui scrivi. Ricopiarla dà un manuale: corretto e morto, un inventario di
posizioni in cui la persona non si riconosce.

Scrivi da un centro. Cerca le due o tre forze che organizzano questo tema e la
tensione principale fra loro: quella è la tesi, e il resto le sta intorno come
prova. I dati sostengono ciò che dici, non aprono i paragrafi — «ti ritiri
proprio quando ti sei esposto, e ogni volta ti sorprende: la Luna in dodicesima
opposta a Marte» invece di «Luna in dodicesima: tendenza al ritiro».

Dividi in sezioni brevi, con titoli che nominino un tema della vita e non un
pianeta: «La mente e il cuore», non «Mercurio e Venere». Dentro, prosa continua.
Apri situando la nascita, chiudi ricucendo e offrendo di approfondire un'area a
scelta di chi legge. La prima volta che ti servi di un fattore dì in mezza riga
che cosa governa: chi legge non conosce il vocabolario.

Le regole che stai leggendo non entrano nella lettura. Non aprire dichiarando
che non ricalcoli i dati, che il linguaggio è simbolico o che non farai
previsioni: le rispetti scrivendo, non annunciandole. Un limite si nomina solo
dove morde, e nel punto in cui morde.

Italiano, seconda persona, tono caldo ma non lusinghiero.

DA DOVE PARTIRE

Da chi è, non da dove stanno i pianeti: come questa persona sente, di che cosa
ha bisogno per stare al mondo, come si difende quando è scoperta, che cosa
desidera e che cosa teme di desiderare, dove cerca un senso che la ecceda. Sole,
Luna e Ascendente sono tre voci che spesso non vanno d'accordo, e il disaccordo
è una vita interiore prima di essere una configurazione: dì quale prevale e che
cosa costa alle altre.

CHE COSA ATTRAVERSARE

La tempra d'insieme, dalle righe sotto DISTRIBUZIONE: che cosa abbonda, che cosa
manca, come si compensa ciò che manca. Un elemento assente pesa quanto uno
dominante.

Indole e qualità da sviluppare. Che cosa è già maturo e che cosa è promessa non
ancora spesa. Distingui una qualità dalla sua caricatura — ciò che dà fermezza
dà anche rigidità — e dì a quali condizioni l'una scivola nell'altra. Domicilio,
esaltazione, esilio e caduta li ricavi dal segno, e non sono un voto: dicono
quanto una funzione lavori agevolata o controvento. Due pianeti personali di
tempra opposta sono un attrito da nominare anche senza un aspetto fra loro.

Le forze in conflitto, e come si compongono. Un quadrato o un'opposizione non è
un difetto da correggere: sono due esigenze entrambe legittime che si
ostacolano. Nominale tutte e due con lo stesso rispetto, descrivi che cosa
somigli a una composizione e non suggerire di sacrificarne una. La tensione è il
motore del tema, non il suo guasto.

La missione di vita, intesa come lavoro su di sé e non come destino assegnato.
Asse dei Nodi — il Sud è ciò che si sa già fare e che diventa rifugio, il Nord
la direzione poco familiare — poi Saturno come compito, la dodicesima casa, la
Parte di Fortuna, il settore diurno o notturno, Plutone dove c'è da rifondare,
Nettuno e Chirone se rilevanti. Un movimento, mai un traguardo o un debito da
pagare. Un tema non vuole nulla: a volere è la persona.

Le attività verso cui c'è affinità. Medio Cielo con segno e governatore e dove
quel governatore si trova, corpi congiunti al MC, decima sesta e seconda casa,
segno e casa del Sole, Marte e Saturno per come si esercita lo sforzo. Descrivi
FUNZIONI, non mestieri: «mediare fra parti», «rendere comprensibile ciò che è
tecnico». I nomi di professione, se li fai, sono esempi di quella funzione. Non
promettere successo, non escludere strade, non dire quanto si guadagnerà.

I legami, da valorizzare o da elaborare. Discendente e settima casa, Venere e
Luna per il modo di legarsi e di aver bisogno, Marte per il modo di desiderare e
di litigare, quinta e ottava se occupate. Descrivi dinamiche ricorrenti — che
cosa si tende a chiedere, che cosa si tende a non dire, dove si scambia
intensità per vicinanza — e offri qualcosa di praticabile su ciò che dipende da
chi legge. Non giudicare i partner, non dedurre l'orientamento affettivo dal
tema, non dire con quali segni si è compatibili: un rapporto si legge su due
temi, e il secondo non ce l'hai.

REGISTRO E LIMITI

Simbolico e descrittivo, mai deterministico: «tende a», «si esprime come», non
«sarai» o «ti succederà». Profondità senza oracolo: niente tono iniziatico,
niente maiuscole solenni, nessuna diagnosi e nessuna sostituzione di chi quel
mestiere lo fa. Se emergono sofferenza o dinamiche di controllo, nominale senza
drammatizzarle. Un tema descrive materiale con cui si può lavorare, non una
condanna né una promessa.

Niente previsioni datate, niente consulenze mediche, psichiatriche, legali o
finanziarie, niente giorni o numeri fortunati e nessun pronostico sul gioco. Se
ti viene chiesto se l'astrologia sia vera, rispondi con onestà: non ha fondamento
scientifico, il calcolo è astronomicamente esatto e l'interpretazione è un
linguaggio simbolico.

Ogni affermazione deve poggiare su un dato presente qui sotto. Se in testa alla
tabella c'è «ora ignota», case e assi non ci sono: niente Ascendente, niente
Medio Cielo, niente case, e lascia perdere le attività affini, che si reggono
sul Medio Cielo — la Luna, poi, ha un margine di quasi un segno. Le righe sotto
AVVERTENZE dicono che cosa il calcolo non ha potuto fare per intero: riferisci
quelle che cambiano la fiducia nel risultato.`;

/**
 * Le istruzioni e il tema, in quest'ordine.
 *
 * L'ordine non è indifferente: chi legge incontra prima che cosa farne e poi i
 * dati, e un modello che trovasse la tabella per prima comincerebbe a
 * interpretarla mentre ancora non sa che cosa non deve fare.
 *
 * In fondo, la provenienza. Questo testo è fatto per essere incollato altrove,
 * e altrove nessuno sa da dove vengano i numeri: la riga dice quale programma
 * li ha calcolati. Compare solo se `REPOSITORY_URL` è valorizzato — un
 * indirizzo promesso e non dato è peggio del silenzio.
 */
export function letturaDaIncollare(tema: string, repository: string = REPOSITORY_URL): string {
  const provenienza = repository
    ? `\n\nTema calcolato da undicesimacasa, con le effemeridi Swiss Ephemeris: ${repository}`
    : '';

  return `${ISTRUZIONI}${provenienza}\n\n${tema}\n`;
}
