import { describe, expect, it } from 'vitest';
import { istruzioniDi, letturaDaIncollare, SISTEMI } from '../src/lettura.js';

const TEMA = 'TEMA NATALE — 1978-06-02 15:15 (Europe/Rome, UTC+02:00)\n\nCORPI\nSole 11°39\' Gem';

describe('letturaDaIncollare', () => {
  it('mette le istruzioni prima dei dati', () => {
    const testo = letturaDaIncollare(TEMA);
    expect(testo.indexOf(istruzioniDi())).toBeLessThan(testo.indexOf('TEMA NATALE'));
  });

  it('riporta il tema senza toccarlo', () => {
    // Il testo che si incolla deve contenere la tabella come il motore l'ha
    // scritta: riformattarla qui la farebbe divergere da quella che leggono
    // gli agenti MCP, che è la stessa.
    expect(letturaDaIncollare(TEMA)).toContain(TEMA);
  });

  it('vieta il calcolo a memoria e i pronostici', () => {
    const testo = letturaDaIncollare(TEMA);
    expect(testo).toContain('ricalcolarlo e non correggerlo');
    expect(testo).toContain('numeri fortunati');
    expect(testo).toContain('ora ignota');
  });

  it('chiede una lettura e non una procedura', () => {
    // Senza questi, il modello esegue la gerarchia tecnica e la consegna come
    // interpretazione: ne esce un manuale corretto in cui nessuno si riconosce.
    const testo = letturaDaIncollare(TEMA);
    expect(testo).toContain("l'ordine in cui GUARDI");
    expect(testo).toContain('Scrivi da un centro');
  });

  it('chiede una lettura leggibile, non un muro di prosa', () => {
    // La tesi da sola produce un testo che si legge tutto o niente: i titoli
    // danno la scansione, e la glossa non dà per scontato un vocabolario che
    // chi legge non ha.
    const testo = letturaDaIncollare(TEMA);
    expect(testo).toContain('Dividi in sezioni brevi');
    expect(testo).toContain('che cosa governa');
  });

  it('tiene i vincoli fuori dalla lettura', () => {
    // Un modello che ha appena letto una lista di divieti tende ad aprire
    // riassumendola: chi legge si trova davanti le istruzioni che non ha
    // scritto invece del tema che ha chiesto.
    const testo = letturaDaIncollare(TEMA);
    expect(testo).toContain('non entrano nella lettura');
  });

  it('nomina i temi di cui la lettura deve occuparsi', () => {
    const testo = letturaDaIncollare(TEMA);
    for (const tema of [
      'Indole e qualità da sviluppare',
      'Le forze in conflitto',
      'La missione di vita',
      'Le attività verso cui',
      'I legami',
    ]) {
      expect(testo).toContain(tema);
    }
  });

  it("dichiara la provenienza solo quando c'è un indirizzo", () => {
    expect(letturaDaIncollare(TEMA)).not.toContain('Tema calcolato da');
    expect(letturaDaIncollare(TEMA, { repository: '' })).not.toContain('Tema calcolato da');
    expect(
      letturaDaIncollare(TEMA, { repository: 'https://esempio.it/dodicisegni' }),
    ).toContain('https://esempio.it/dodicisegni');
  });
});

/**
 * Il prezzo della duplicazione, come `ruota/test/tipi.test.ts` lo paga per i
 * tipi ridichiarati.
 *
 * I documenti non si compongono da blocchi condivisi, e la ragione è che
 * ciascuno deve restare leggibile per intero da chi lo modifica: un prompt
 * assemblato a runtime non esiste come testo in nessun punto del repository.
 * Il prezzo è che una clausola portante può finire in un documento e non
 * nell'altro, e nessuno se ne accorge finché non esce una lettura sbagliata.
 *
 * Queste prove sono la guardia. Non impongono le stesse parole — la prosa
 * cambia da un sistema all'altro, ed è il motivo per cui sono due documenti —
 * ma pretendono che ogni documento porti i limiti che nessun sistema può
 * lasciar cadere.
 */
describe('ogni documento di lettura', () => {
  /**
   * Il documento su una riga sola.
   *
   * I documenti sono impaginati a ottanta colonne, e una clausola portante può
   * cadere a cavallo di un ritorno a capo: cercarla alla lettera legherebbe la
   * prova alla larghezza del testo invece che a quello che dice, e un giorno
   * fallirebbe per una riformattazione che non ha tolto niente.
   */
  const scorrevole = (sistema: (typeof SISTEMI)[number]): string =>
    istruzioniDi(sistema).replace(/\s+/g, ' ');

  it.each([...SISTEMI])('%s vieta di ricalcolare i dati', (sistema) => {
    expect(scorrevole(sistema)).toContain('ricalcolarlo e non correggerlo');
  });

  it.each([...SISTEMI])('%s vieta di sostituirsi a un professionista', (sistema) => {
    const testo = scorrevole(sistema);
    expect(testo).toMatch(/medic/i);
    expect(testo).toMatch(/legali|legale/i);
    expect(testo).toMatch(/finanziari/i);
    expect(testo).toContain('nessuna sostituzione di chi quel mestiere lo fa');
  });

  it.each([...SISTEMI])('%s vieta il linguaggio deterministico', (sistema) => {
    const testo = scorrevole(sistema);
    expect(testo).toContain('mai deterministico');
    expect(testo).toContain('Niente previsioni datate');
  });

  it.each([...SISTEMI])('%s tiene ogni affermazione su un dato presente', (sistema) => {
    expect(scorrevole(sistema)).toContain('deve poggiare su un dato presente');
  });

  it.each([...SISTEMI])("%s dice come rispondere sulla validità dell'astrologia", (sistema) => {
    // È la domanda che arriva sempre, e un modello lasciato solo la risolve
    // difendendo l'astrologia o liquidandola: entrambe fuori mandato.
    expect(scorrevole(sistema)).toContain('non ha fondamento scientifico');
  });
});

/**
 * Quello che il documento vedico deve dire e che l'altro non dice.
 *
 * Gli invarianti di sopra girano su entrambi e coprono i limiti condivisi.
 * Qui c'è ciò che è proprio di questo sistema, e che se cadesse produrrebbe
 * una lettura sbagliata invece di una lettura incompleta: un modello lasciato
 * senza queste righe riempie il vuoto con l'astrologia che conosce meglio.
 */
describe('il documento vedico', () => {
  const testo = istruzioniDi('jyotisha').replace(/\s+/g, ' ');

  it('dice che lo zodiaco è siderale e vieta di convertire', () => {
    expect(testo).toContain('SIDERALE');
    expect(testo).toContain('non è un errore da correggere');
    expect(testo).toMatch(/[Nn]on convertire/);
  });

  it('esclude i tre pianeti moderni dalla lettura', () => {
    // Sono nella tabella perché il motore li calcola, e senza questa riga il
    // modello li userebbe: è l'errore più probabile di tutti.
    expect(testo).toContain('lasciali fuori dalla lettura');
    expect(testo).toMatch(/Urano, Nettuno e Plutone non appartengono/);
  });

  it('dà i domicili antichi, che sono la trappola più insidiosa', () => {
    // Un modello che usa le rulership occidentali su un tema vedico produce
    // una lettura interamente sbagliata e perfettamente plausibile.
    expect(testo).toContain('Ariete e Scorpione a Marte');
    expect(testo).toContain('Capricorno e Acquario a Saturno');
    expect(testo).toContain('Nessun segno è di Urano');
  });

  it('mette al centro la Luna e il lagna, non il Sole', () => {
    expect(testo).toContain('Il centro non è il Sole');
    expect(testo).toContain('Il Sole viene dopo');
  });

  it('spiega in che cosa le drishti non sono aspetti', () => {
    expect(testo).toContain('NON gli aspetti occidentali');
    expect(testo).toContain('non esistono orbite');
    expect(testo).toContain('hanno un verso');
  });

  it('lascia nominare la stagione delle dasha e non ciò che porterà', () => {
    // È il punto in cui il documento regge o cade: la tabella consegna delle
    // date, e senza questo il modello le userebbe per predire.
    expect(testo).toContain('aritmetica, non profezia');
    expect(testo).toContain('Non usarle per predire');
    expect(testo).toContain('quando cambia la stagione e non che cosa porterà');
  });

  it('chiude la porta ai rimedi e alla compatibilità', () => {
    // Sono i due terreni su cui la tradizione scivola, e su cui un sito che
    // offre spunti di riflessione non ha niente da dire.
    expect(testo).toContain('niente pietre da portare');
    expect(testo).toContain('il secondo non ce l\'hai');
  });

  it('chiede di spiegare il vocabolario mentre lo si usa', () => {
    // «Ascendente» un lettore italiano lo conosce, «nakshatra» no: una lettura
    // piena di parole non tradotte non è più autentica, è illeggibile.
    expect(testo).toContain('Il vocabolario spiegalo mentre lo usi');
    expect(testo).toContain('non per fare atmosfera');
  });

  it('fa controllare quale ayanamsa sia stato usato', () => {
    expect(testo).toContain('quale ayanamsa');
    expect(testo).toContain('le scuole non concordano');
  });

  it('non è il documento tropicale con qualche parola cambiata', () => {
    // I due si affiancano, non si estendono: se un giorno qualcuno provasse a
    // comporli da blocchi condivisi, questa prova direbbe che non si può.
    expect(istruzioniDi('jyotisha')).not.toBe(istruzioniDi('tropicale'));
    expect(istruzioniDi('jyotisha')).not.toContain('Sole, Luna e Ascendente sono tre voci');
  });
});
