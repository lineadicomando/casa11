/**
 * URL pubblico del repository.
 *
 * Non è un dettaglio di cortesia. L'AGPL, articolo 13, obbliga a offrire il
 * codice sorgente a chi usa il programma **attraverso la rete**: pubblicare
 * l'applicazione senza questo collegamento viola la licenza con cui è
 * distribuita Swiss Ephemeris. Lo stesso indirizzo è il recapito indicato
 * nell'informativa privacy.
 *
 * Finché è vuoto, l'interfaccia scrive il testo senza collegamento invece di
 * produrne uno rotto. **Chi mette in rete una propria copia deve cambiarlo con
 * l'indirizzo della sua**: l'obbligo riguarda il sorgente di ciò che sta
 * girando, e l'informativa dichiara titolare del trattamento chi gestisce
 * l'istanza, non chi ha scritto il programma.
 */
export const REPOSITORY_URL = 'https://github.com/lineadicomando/casa11';

/**
 * Come il sito si chiama, per esteso e in breve.
 *
 * L'abbreviazione non è un vezzo: sotto un'icona installata ci stanno sette
 * caratteri, e «dodicisegni» verrebbe troncato a metà parola. `12segni` ci sta
 * esatta ed è anche il dominio di servizio, quindi non è una terza forma
 * inventata qui. La usano il manifesto — dove è `short_name` — e i dati
 * strutturati, dove è l'`alternateName` con cui il sito si può cercare.
 */
export const SITE_NAME = 'dodicisegni';
export const SITE_SHORT_NAME = '12segni';

/**
 * Che cosa il sito calcola, in tre parole.
 *
 * Non è un motto: è l'elenco delle cose che ci sono, nell'ordine in cui uno
 * le cerca. Un payoff vero — una promessa, un tono — qui non avrebbe niente da
 * promettere, perché il motore non interpreta e chi arrivasse cercando un
 * significato tornerebbe indietro subito.
 *
 * Serve in due posti, e in tutt'e due perché è **corta**: è il titolo della
 * pagina d'ingresso, dove «Tema natale» da solo sprecava la pagina più forte
 * del sito e dove oltre una sessantina di caratteri un motore di ricerca
 * tronca; ed è lo `slogan` dei dati strutturati, che è il campo dove una cosa
 * del genere va dichiarata. Chi la allunga rompe il primo dei due usi, e
 * `lib/seo.test.ts` lo dice.
 *
 * Sulle altre sezioni non compare: un titolo uguale su ogni pagina è la cosa
 * che i motori riscrivono per prima, e toglierebbe peso alla parola che
 * distingue la sezione.
 */
export const SITE_TAGLINE = 'Tema natale, transiti e ore planetarie';

/**
 * Che cos'è il sito, in una riga.
 *
 * Sta qui perché la dicono in due — il manifesto a chi installa
 * l'applicazione, i dati strutturati a chi la indicizza — e due copie della
 * stessa frase divergono alla prima correzione. Non è la descrizione delle
 * pagine: quella la dà ogni sezione con `components/Meta.svelte`, ed è più
 * stretta apposta.
 */
export const SITE_DESCRIPTION =
  'Temi natali, transiti e ore planetarie calcolati con le effemeridi Swiss Ephemeris.';

/**
 * La licenza, nella forma che i dati strutturati vogliono: un indirizzo, non
 * una sigla. È la stessa che il piè di pagina nomina e che `LICENSE` riporta
 * per esteso — imposta da Swiss Ephemeris, vedi il README.
 */
export const LICENSE_URL = 'https://www.gnu.org/licenses/agpl-3.0.html';
