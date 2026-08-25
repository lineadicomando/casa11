/**
 * Che i tipi ridichiarati in `src/types.ts` combacino con quelli del motore.
 *
 * La duplicazione è deliberata e spiegata là; qui si paga il suo prezzo. Senza
 * questa prova un corpo nuovo in `core` — un asteroide, un punto calcolato —
 * arriverebbe al disegno come glifo mancante, e nessuno se ne accorgerebbe
 * finché non lo si vede: che è esattamente il genere di errore silenzioso per
 * cui la geometria era stata messa alla prova.
 *
 * Il motore lo si importa qui e in nessun altro punto del pacchetto: un test
 * gira dopo che tutto è stato compilato, quindi non crea il ciclo.
 */

import type * as core from '@dodicisegni/core';
import { DEFAULT_BODIES } from '@dodicisegni/core';
import { describe, expect, it } from 'vitest';
import { BODY_GLYPH, SIGN_GLYPH, ZODIAC_ORDER } from '../src/glyphs.js';
import { CHIARA, SCURA } from '../src/palette.js';
import type * as qui from '../src/types.js';
import { GRAHA, GRAHA_SIGLA, type SquareChart } from '../src/quadro.js';

/**
 * Vale `true` solo se i due tipi si contengono a vicenda. Un `extends` solo
 * lascerebbe passare una dichiarazione più larga o più stretta dell'altra.
 */
type Uguali<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

function combaciano<T extends true>(_prova?: T): void {
  // Il controllo è tutto nel tipo: se non combaciano, non compila.
}

describe('i tipi ridichiarati', () => {
  it('hanno gli stessi valori ammessi di quelli del motore', () => {
    combaciano<Uguali<qui.ZodiacSign, core.ZodiacSign>>();
    combaciano<Uguali<qui.BodyId, core.BodyId>>();
    combaciano<Uguali<qui.AspectId, core.AspectId>>();
    combaciano<Uguali<qui.NatalPointId, core.NatalPointId>>();
    combaciano<Uguali<qui.TransitingPointId, core.TransitingPointId>>();
    combaciano<Uguali<qui.Element, core.Element>>();
    combaciano<Uguali<qui.Modality, core.Modality>>();

    expect(true).toBe(true);
  });

  it('accettano una carta del motore così com\'è', () => {
    // Il verso che conta: un `NatalChart` deve soddisfare `WheelChart` senza
    // conversioni. Il contrario no — al disegno serve molto meno.
    const natale = (chart: core.NatalChart): qui.CelestialBody[] => [...chart.bodies];
    const cuspidi = (chart: core.NatalChart): qui.House[] => [...chart.houses];
    const assi = (chart: core.NatalChart): qui.Angles | undefined => chart.angles;
    const aspetti = (chart: core.NatalChart): qui.Aspect[] => [...chart.aspects];
    const fortuna = (chart: core.NatalChart): qui.ChartPoint | undefined => chart.partOfFortune;
    const transiti = (t: core.TransitChart): qui.TransitChart => t;

    // E un varga deve soddisfare il quadro. È ciò che fa sì che un renderer
    // solo disegni la carta rashi — che è il D-1 — e tutte le divisionali:
    // `computeVarga(chart, 'd1')` entra qui senza adattamenti.
    const quadro = (varga: core.VargaChart): SquareChart => varga;

    expect([natale, cuspidi, assi, aspetti, fortuna, transiti, quadro]).toHaveLength(7);
  });

  it('danno una sigla a ogni graha, e solo a quelli', () => {
    // I nove del Jyotisha: se un giorno `BodyId` cambiasse nome a uno di loro,
    // la sigla sparirebbe dal quadro senza che niente fallisca.
    const senzaSigla = GRAHA.filter((id) => !(id in GRAHA_SIGLA));
    expect(senzaSigla).toEqual([]);
    expect(Object.keys(GRAHA_SIGLA)).toHaveLength(GRAHA.length);

    // E ciascuno dev'essere un corpo che il motore calcola davvero.
    const sconosciuti = GRAHA.filter((id) => !DEFAULT_BODIES.includes(id));
    expect(sconosciuti).toEqual([]);
  });
});

describe('le mappe del vocabolario', () => {
  it('coprono ogni corpo che il motore calcola davvero', () => {
    // Non una lista scritta a mano: quella del motore, così che aggiungerci un
    // corpo faccia fallire qui invece che comparire come glifo mancante.
    const mancanti = DEFAULT_BODIES.filter((id) => !(id in BODY_GLYPH));
    expect(mancanti).toEqual([]);

    // La copertura la fa anche il tipo — `Record<BodyId, string>` non compila
    // se manca una chiave — ma non basta: non dice nulla sulle chiavi di
    // troppo, che resterebbero se `BodyId` si restringesse.
    const conosciuti = new Set<string>(ZODIAC_ORDER);
    expect(Object.keys(SIGN_GLYPH).every((sign) => conosciuti.has(sign))).toBe(true);
    expect(Object.keys(SIGN_GLYPH)).toHaveLength(ZODIAC_ORDER.length);
  });

  it('danno un colore a ogni aspetto in tutte e due le palette', () => {
    for (const palette of [CHIARA, SCURA]) {
      expect(Object.keys(palette.aspetti).sort()).toEqual(
        Object.keys(CHIARA.aspetti).sort(),
      );
      expect(Object.values(palette.aspetti).every((c) => /^#[0-9a-f]{6}$/i.test(c))).toBe(true);
      expect(Object.values(palette.elementi).every((c) => /^#[0-9a-f]{6}$/i.test(c))).toBe(true);
    }
  });
});
