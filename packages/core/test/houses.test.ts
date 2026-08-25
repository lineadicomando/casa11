import { describe, expect, it } from 'vitest';
import { HOUSE_SYSTEM_CODES } from '../src/constants.js';
import { initEphemeris } from '../src/ephemeris.js';
import { computeHouses } from '../src/houses.js';
import { angularSeparation } from '../src/math.js';
import { toJulianDay } from '../src/time.js';
import type { HouseSystem } from '../src/types.js';

/**
 * L'ancoraggio esterno delle cuspidi.
 *
 * Gli altri controlli sulle case provano proprietà interne — dodici cuspidi,
 * l'Ascendente opposto al Discendente, i segni interi che cominciano a zero
 * gradi — e nessuno di essi guarda fuori. Scambiare due lettere in
 * `HOUSE_SYSTEM_CODES` (Porfirio è `O`, Alcabizio è `B`) darebbe cuspidi giuste
 * in tutto tranne che nel sistema, e li lascerebbe passare tutti: un risultato
 * plausibile e sbagliato, che è la specie peggiore. Questo file è l'unico posto
 * dove le nove lettere rispondono a qualcuno che non è il motore.
 *
 * Il tema è quello dell'esempio pubblicato da Jan Kampherbeek su RadixPro —
 * Enschede, 2 novembre 2016, 21:17:30 UT — dove il calcolo è svolto passo per
 * passo, con tutte le cifre intermedie, sulle formule di Geoffrey Dean
 * (*Recent Advances in Natal Astrology*, 1977, p. 185) e di Michael Munkasey
 * (*An Astrological House Formulary*). È aritmetica su carta: non ha niente in
 * comune con Swiss Ephemeris.
 *
 * RadixPro copre Porfirio, Regiomontano e Alcabizio. Gli altri sei vengono da
 * **Astrolog 8.00** di Walter D. Pullen, compilato dai sorgenti **senza il
 * modulo Swiss Ephemeris** — che è la sola precauzione che conti, perché con
 * `SWISS` attivo Astrolog delega le case a `swe_houses_armc_ex2` e il confronto
 * diventerebbe il motore contro sé stesso. Disattivato quel modulo, le cuspidi
 * escono da `matrix.cpp` e `calc.cpp`, discendenti dalle routine di James Neely
 * per Matrix Software degli anni Settanta.
 *
 * Le due fonti sono indipendenti fra loro e si sono trovate d'accordo al
 * secondo d'arco sui tre sistemi che entrambe calcolano.
 *
 * **Perché la tolleranza è un primo d'arco e non meno.** Lo scarto residuo è
 * sistematico e vale fra 7 e 24 secondi: entrambe le fonti usano l'obliquità
 * **media** dell'eclittica, il motore quella **vera**. La differenza è la
 * nutazione in obliquità, che a quella data vale −8,67 secondi d'arco, e non è
 * un errore di nessuno dei due — è una convenzione dichiarata diversa. Dando a
 * Swiss Ephemeris lo stesso ARMC e la stessa obliquità delle fonti, i nove
 * sistemi rientrano entro **un secondo d'arco**, e sui tre di RadixPro
 * l'accordo è esatto: la domificazione non aggiunge errore, lo eredita dagli
 * assi. Un primo d'arco lascia quindi due volte e mezzo il margine che serve.
 *
 * Le cuspidi non dipendono dai file delle effemeridi — obliquità e tempo
 * siderale sono analitici — quindi la prova vale identica con Moshier.
 */
const ENSCHEDE = {
  julianDay: toJulianDay(2016, 11, 2, 21 + 17 / 60 + 30 / 3600),
  latitude: 52 + 13 / 60,
  longitude: 6 + 54 / 60,
};

/** Ascendente delle due fonti, che concordano: 3°30'29" Leone. */
const ASCENDENTE = 123.508056;

/**
 * Le dodici cuspidi dei nove sistemi, in gradi decimali.
 *
 * Per l'equale e i segni interi i valori sono derivati dall'Ascendente invece
 * che letti da Astrolog: lì `-C` stampa Medio Cielo e Fondo Cielo come punti
 * angolari e non come cuspidi decima e quarta, che in quei due sistemi sono
 * un'altra cosa. La regola è la definizione del sistema, non una scelta.
 */
const CUSPIDI: Readonly<Record<HouseSystem, readonly number[]>> = {
  placidus: [
    123.508056, 139.796667, 160.649444, 189.63, 229.330278, 271.383056, 303.508056, 319.796667,
    340.649444, 9.63, 49.330278, 91.383056,
  ],
  koch: [
    123.508056, 145.556944, 167.524722, 189.63, 248.138056, 279.700278, 303.508056, 325.556944,
    347.524722, 9.63, 68.138056, 99.700278,
  ],
  campano: [
    123.508056, 150.798056, 170.2425, 189.63, 216.705, 259.985, 303.508056, 330.798056, 350.2425,
    9.63, 36.705, 79.985,
  ],
  topocentrico: [
    123.508056, 139.676111, 160.636111, 189.63, 229.091111, 270.675, 303.508056, 319.676111,
    340.636111, 9.63, 49.091111, 90.675,
  ],
  porfirio: [
    123.508056, 145.548611, 167.589444, 189.63, 227.589444, 265.548611, 303.508056, 325.548611,
    347.589444, 9.63, 47.589444, 85.548611,
  ],
  regiomontano: [
    123.508056, 142.632778, 162.025556, 189.63, 233.863889, 276.925, 303.508056, 322.632778,
    342.025556, 9.63, 53.863889, 96.925,
  ],
  alcabizio: [
    123.508056, 144.529722, 166.780833, 189.63, 230.278889, 267.087778, 303.508056, 324.529722,
    346.780833, 9.63, 50.278889, 87.087778,
  ],
  equale: Array.from({ length: 12 }, (_, i) => (ASCENDENTE + 30 * i) % 360),
  'segni-interi': Array.from(
    { length: 12 },
    (_, i) => (Math.floor(ASCENDENTE / 30) * 30 + 30 * i) % 360,
  ),
};

/** Un primo d'arco: la ragione della cifra sta nel commento in testa al file. */
const TOLLERANZA = 1 / 60;

describe('le cuspidi contro una fonte esterna', () => {
  it('riproduce le cuspidi pubblicate per tutti e nove i sistemi', () => {
    const context = initEphemeris();

    for (const [sistema, attese] of Object.entries(CUSPIDI) as [
      HouseSystem,
      readonly number[],
    ][]) {
      const { houses } = computeHouses(
        ENSCHEDE.julianDay,
        ENSCHEDE.latitude,
        ENSCHEDE.longitude,
        sistema,
        context,
      );

      expect(houses).toHaveLength(12);
      houses.forEach((casa, indice) => {
        const scarto = angularSeparation(casa.longitude, attese[indice]!);
        expect(
          scarto,
          `${sistema}, cuspide ${indice + 1}: ${casa.longitude.toFixed(6)} invece di ` +
            `${attese[indice]!.toFixed(6)} (${(scarto * 3600).toFixed(1)} secondi d'arco)`,
        ).toBeLessThan(TOLLERANZA);
      });
    }
  });

  it('ancora ogni sistema che il motore dichiara', () => {
    // Chi aggiunge una lettera a `HOUSE_SYSTEM_CODES` senza ancorarla cade
    // qui: è l'unico modo perché il file di sopra non invecchi in silenzio.
    expect(Object.keys(CUSPIDI).sort()).toEqual(Object.keys(HOUSE_SYSTEM_CODES).sort());
  });

  it('tiene i nove sistemi abbastanza distanti perché un primo li distingua', () => {
    // È la prova che regge la prova di sopra. Se su questo tema due sistemi
    // cadessero a meno di un primo l'uno dall'altro, scambiarne le lettere non
    // farebbe cadere niente e l'ancoraggio non varrebbe. La coppia più vicina è
    // Placido/Topocentrico, a quarantadue primi: quaranta volte la tolleranza.
    const sistemi = Object.entries(CUSPIDI) as [HouseSystem, readonly number[]][];

    for (let i = 0; i < sistemi.length; i += 1) {
      for (let j = i + 1; j < sistemi.length; j += 1) {
        const [nomeA, cuspidiA] = sistemi[i]!;
        const [nomeB, cuspidiB] = sistemi[j]!;
        const distanza = Math.max(
          ...cuspidiA.map((valore, indice) => angularSeparation(valore, cuspidiB[indice]!)),
        );
        expect(distanza, `${nomeA} e ${nomeB} sono indistinguibili su questo tema`).toBeGreaterThan(
          0.5,
        );
      }
    }
  });
});
