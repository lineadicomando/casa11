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
 * Le istruzioni sono la versione breve di `docs/prompt-lettura.md`, che resta
 * il contratto intero: là ci sono anche i transiti, il disegno e gli endpoint
 * da chiamare. Qui il calcolo è già fatto e viaggia insieme al testo, quindi
 * di quel contratto restano i soli divieti — che sono la parte che un modello
 * viola per riempire un vuoto.
 */

import { REPOSITORY_URL } from './project';

/**
 * Quello che va detto a chi legge il tema, prima del tema.
 *
 * Corto di proposito. Incollare un prompt di sistema di undicimila parole in
 * una casella di chat non funziona — molte lo troncano, e quel che resta è
 * l'inizio, cioè le istruzioni sugli endpoint che qui non servono a niente.
 */
export const ISTRUZIONI = `Questo è un tema natale già calcolato. I dati qui sotto vengono da undicesimacasa,
che usa le effemeridi Swiss Ephemeris: sono il risultato di un calcolo, non la
richiesta di farne uno.

Non ricalcolarli e non correggerli. Se un valore ti sembra sbagliato dillo,
invece di sistemarlo. E non aggiungere posizioni, aspetti o punti che qui sotto
non compaiano: se una tecnica ti servirebbe e il dato manca, dillo e fermati lì.

Leggi il tema come una gerarchia e non come un elenco, in italiano, in prosa
continua, in seconda persona. Prima la struttura d'insieme — elementi, modalità,
settore, corpi vicini agli assi — poi Sole, Luna e Ascendente come tre voci che
possono non trovarsi d'accordo, poi i governatori, le case occupate e gli
aspetti con l'orbita più stretta. Niente «Sole in Gemelli: sei così», che è un
oroscopo da rivista e non una lettura.

Il linguaggio astrologico è simbolico e descrittivo, mai deterministico: «tende
a», non «sarai». Segnala le tensioni del tema invece di appianarle, ma senza
diagnosticare — un quadrato è una dinamica, non un difetto. Niente previsioni
datate, niente consulenze mediche, psichiatriche, legali o finanziarie, niente
giorni o numeri fortunati e nessun pronostico sul gioco. Se ti viene chiesto se
l'astrologia sia vera, rispondi con onestà: non ha fondamento scientifico, il
calcolo è astronomicamente esatto e l'interpretazione è un linguaggio simbolico.

Se in testa alla tabella c'è «ora ignota», case e assi non ci sono: non parlare
di Ascendente, di Medio Cielo né di case, e ricorda che la Luna ha un margine di
quasi un segno. Le righe sotto AVVERTENZE dicono che cosa il calcolo non ha
potuto fare per intero: leggile, e riferisci quelle che cambiano la fiducia nel
risultato.`;

/**
 * Le istruzioni e il tema, in quest'ordine.
 *
 * L'ordine non è indifferente: chi legge incontra prima che cosa farne e poi i
 * dati, e un modello che trovasse la tabella per prima comincerebbe a
 * interpretarla mentre ancora non sa che cosa non deve fare.
 *
 * Il rimando al repository compare solo se c'è. `REPOSITORY_URL` è vuoto
 * finché non lo si valorizza, e una frase che prometta un documento senza
 * dire dove sia è peggio dell'assenza della frase.
 */
export function letturaDaIncollare(tema: string, repository: string = REPOSITORY_URL): string {
  const rimando = repository
    ? `\n\nIl contratto completo per un agente — transiti compresi, e gli endpoint da\n` +
      `cui prenderli — sta in docs/prompt-lettura.md, qui: ${repository}`
    : '';

  return `${ISTRUZIONI}${rimando}\n\n${tema}\n`;
}
