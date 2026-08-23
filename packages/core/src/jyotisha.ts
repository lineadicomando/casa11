/**
 * Il tema vedico: la carta più ciò che il Jyotisha ci legge sopra.
 *
 * Non è un calcolo nuovo ma una composizione, e per questo sta in un modulo
 * suo invece che dentro uno degli altri: **che cosa sia «il tema vedico» va
 * deciso in un posto solo**. I chiamanti sono già tre — la riga di comando, il
 * prompt MCP, la rotta — e cinque chiamate copiate in tre posti divergono al
 * primo cambiamento.
 *
 * Non è un `NatalChart` con dei campi in più. La carta ci sta dentro intera,
 * perché le posizioni sono le stesse; quello che le si affianca è un'altra
 * lettura degli stessi gradi.
 *
 * Che cosa **non** c'è, e di proposito:
 *
 * - Il panchanga. È la qualità di un istante in un luogo, non una proprietà di
 *   una nascita, e ha una superficie sua. Il dato che di lì serve a un tema —
 *   il nakshatra della Luna — è già qui.
 * - Le case dei varga. In un varga si contano dal lagna a segni interi, quindi
 *   si ricavano dai due segni senza altro calcolo.
 * - Yoga, dignità, forze. Sono la riga oltre cui il motore non va: vedi il
 *   vincolo in `CLAUDE.md`.
 */

import { computeVimshottari } from './dasha.js';
import { computeDrishti } from './drishti.js';
import { grahaName, nakshatraOf, requireSidereal } from './nakshatra.js';
import { computeVarga } from './varga.js';
import type { JyotishaChart, JyotishaOptions, NatalChart } from './types.js';

/**
 * Compone il tema vedico a partire da una carta già calcolata.
 *
 * La carta dev'essere **siderale**: nakshatra, dasha e varga sono tratti di
 * cielo fra stelle fisse, e nel tropicale non esistono.
 *
 * Le case le vuole a segni interi, ed è così che il Jyotisha le conta. Chi
 * passa una carta domificata altrimenti riceve un'avvertenza e non un rifiuto:
 * le posizioni dei graha restano giuste, sono le cuspidi a non essere quelle
 * che il sistema intende.
 *
 * @example
 * ```ts
 * const carta = computeNatalChart(nascita, {
 *   zodiac: 'siderale',
 *   houseSystem: 'segni-interi',
 * });
 * const vedico = computeJyotisha(carta);
 * ```
 */
export function computeJyotisha(
  chart: NatalChart,
  options: JyotishaOptions = {},
): JyotishaChart {
  requireSidereal(chart.zodiac, 'Il tema vedico');

  const warnings: string[] = [];

  if (chart.houses.length > 0 && chart.houseSystem !== 'segni-interi') {
    warnings.push(
      `Il tema è domificato con ${chart.houseSystem}, ma il Jyotisha conta le case a ` +
        'segni interi dal lagna. Le posizioni dei graha sono giuste; le cuspidi non sono ' +
        'quelle che questo sistema intende.',
    );
  }

  const dasha = computeVimshottari(chart, options.dasha ?? { levels: 2 });
  const drishti = computeDrishti(chart, options.drishti ?? {});

  return {
    chart,
    nakshatras: chart.bodies.map((body) => ({
      id: body.id,
      name: grahaName(body.id, body.name),
      nakshatra: nakshatraOf(body.longitude),
    })),
    dasha,
    vargas: (options.vargas ?? ['d9']).map((id) => computeVarga(chart, id)),
    drishti,
    // Le avvertenze dei pezzi salgono qui: chi legge il tema vedico non deve
    // andarle a cercare dentro la catena delle dasha.
    warnings: [...warnings, ...dasha.warnings, ...drishti.warnings],
  };
}
