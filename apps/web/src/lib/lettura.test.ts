import { describe, expect, it } from 'vitest';
import { ISTRUZIONI, letturaDaIncollare } from './lettura';

const TEMA = 'TEMA NATALE — 1978-06-02 15:15 (Europe/Rome, UTC+02:00)\n\nCORPI\nSole 11°39\' Gem';

describe('letturaDaIncollare', () => {
  it('mette le istruzioni prima dei dati', () => {
    const testo = letturaDaIncollare(TEMA);
    expect(testo.indexOf(ISTRUZIONI)).toBeLessThan(testo.indexOf('TEMA NATALE'));
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

  it('dichiara la provenienza solo quando c\'è un indirizzo', () => {
    expect(letturaDaIncollare(TEMA, '')).not.toContain('Tema calcolato da');
    expect(letturaDaIncollare(TEMA, 'https://esempio.it/undicesimacasa')).toContain(
      'https://esempio.it/undicesimacasa',
    );
  });
});
