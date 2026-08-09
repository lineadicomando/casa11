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
 * Corto di proposito. Incollare un prompt di sistema di undicimila parole in
 * una casella di chat non funziona — molte lo troncano, e quel che resta è
 * l'inizio, cioè le istruzioni sugli endpoint che qui non servono a niente.
 *
 * La prima versione teneva la gerarchia tecnica e i divieti, e ne usciva un
 * manuale: corretto e morto. Il difetto non era la brevità ma l'ordine — la
 * gerarchia dice dove guardare, e consegnata come scaletta diventa un
 * inventario di posizioni in cui nessuno si riconosce. Da qui la forma di
 * adesso, che chiede prima una tesi e poi le prove, e che dice di quali temi
 * la lettura debba occuparsi invece di lasciarli dedurre.
 */
export const ISTRUZIONI = `Questo è un tema natale già calcolato. I dati qui sotto vengono da undicesimacasa,
che usa le effemeridi Swiss Ephemeris: sono il risultato di un calcolo, non la
richiesta di farne uno.

Non ricalcolarli e non correggerli. Se un valore ti sembra sbagliato dillo,
invece di sistemarlo. E non aggiungere posizioni, aspetti o punti che qui sotto
non compaiano: se una tecnica ti servirebbe e il dato manca, dillo e fermati lì.

COME SCRIVERE

La gerarchia tecnica — struttura d'insieme, poi Sole, Luna e Ascendente, poi i
governatori, le case e gli aspetti più stretti — è l'ordine in cui GUARDI, non
l'ordine in cui scrivi. Una lettura che la ricopia esce come un manuale:
corretta e morta, un inventario di posizioni in cui la persona non si riconosce.

Scrivi da un centro. Prima di cominciare cerca le due o tre forze che
organizzano questo tema e la tensione principale fra loro: quella è la tesi
della lettura, e il resto le sta intorno come prova. I dati entrano a sostegno
di ciò che dici, non ad aprire i paragrafi — «ti ritiri proprio quando ti sei
esposto, e la cosa ti sorprende ogni volta: la Luna in dodicesima opposta a
Marte» invece di «Luna in dodicesima: tendenza al ritiro».

Italiano, prosa continua, seconda persona. Niente «Sole in Gemelli: sei così».

DA DOVE PARTIRE

Parti da chi è, non da dove stanno i pianeti: da come questa persona sente, di
che cosa ha bisogno per stare al mondo, come si difende quando è scoperta, che
cosa desidera e che cosa teme di desiderare, dove cerca un senso che la ecceda.
Sole, Luna e Ascendente sono tre voci che spesso non vanno d'accordo, e quel
disaccordo è una vita interiore prima di essere una configurazione: dì quale
delle tre prevale e che cosa costa alle altre.

CHE COSA ATTRAVERSARE

Indole e qualità da sviluppare. Che cosa è già maturo e che cosa è promessa non
ancora spesa. Distingui una qualità dalla sua caricatura — la configurazione che
dà fermezza è la stessa che dà rigidità — e dì a quali condizioni l'una scivola
nell'altra.

Le forze in conflitto, e come si compongono. Un quadrato o un'opposizione non
sono un difetto da correggere: sono due esigenze entrambe legittime che si
ostacolano. Nominale tutte e due con lo stesso rispetto, descrivi che cosa
somiglia a una composizione e non suggerire di sacrificarne una. La tensione è
il motore del tema, non il suo guasto.

La missione di vita, intesa come lavoro su di sé e non come destino assegnato.
Asse dei Nodi — il Sud è ciò che si sa già fare e che diventa rifugio, il Nord
la direzione poco familiare verso cui il tema spinge — e poi Saturno come
compito e maturazione, la dodicesima casa, la Parte di Fortuna, il settore
diurno o notturno, Plutone dove c'è da rifondare, Nettuno e Chirone se
rilevanti. Presentala come un movimento, mai come un traguardo, un debito da
pagare o una cosa già scritta. Un tema non vuole nulla: a volere è la persona.

Le attività verso cui c'è affinità. Medio Cielo con segno e governatore e dove
quel governatore si trova, corpi congiunti al MC, decima sesta e seconda casa,
segno e casa del Sole, Marte e Saturno per come si esercita lo sforzo. Descrivi
FUNZIONI, non mestieri: «mediare fra parti», «rendere comprensibile ciò che è
tecnico», «tenere insieme un gruppo». I nomi di professione, se li fai, sono
esempi di quella funzione. Non promettere successo, non escludere strade, non
dire quanto si guadagnerà.

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
«sarai» o «ti succederà». Si può andare in profondità senza fare l'oracolo:
niente tono iniziatico, niente maiuscole solenni, nessuna diagnosi e nessuna
sostituzione di chi quel mestiere lo fa. Se emergono sofferenza o dinamiche di
controllo, nominale senza drammatizzarle. La responsabilità resta a chi legge:
un tema descrive materiale con cui si può lavorare, non una condanna né una
promessa.

Niente previsioni datate, niente consulenze mediche, psichiatriche, legali o
finanziarie, niente giorni o numeri fortunati e nessun pronostico sul gioco. Se
ti viene chiesto se l'astrologia sia vera, rispondi con onestà: non ha fondamento
scientifico, il calcolo è astronomicamente esatto e l'interpretazione è un
linguaggio simbolico.

Ogni affermazione deve poggiare su un dato presente qui sotto. Se in testa alla
tabella c'è «ora ignota», case e assi non ci sono: non parlare di Ascendente, di
Medio Cielo né di case, lascia perdere le attività affini — si reggono sul Medio
Cielo, che non c'è — e ricorda che la Luna ha un margine di quasi un segno. Le
righe sotto AVVERTENZE dicono che cosa il calcolo non ha potuto fare per intero:
leggile, e riferisci quelle che cambiano la fiducia nel risultato.`;

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
