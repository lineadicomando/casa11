import { BODIES, NATAL_POINT_NAMES } from './constants.js';
import { formatDegrees, formatZodiacal } from './math.js';
import { grahaName, nakshatraOf, requireSidereal } from './nakshatra.js';
import { computeVimshottari } from './dasha.js';
import { computeDrishti } from './drishti.js';
import { computeVarga } from './varga.js';
import type {
  Angles,
  Aspect,
  AyanamsaInfo,
  BodyId,
  CelestialBody,
  Distribution,
  DashaPeriod,
  DistributionGroup,
  DrishtiChart,
  ElectionResult,
  House,
  JyotishaFormatOptions,
  NatalChart,
  NatalPointId,
  Panchanga,
  PassageRange,
  Place,
  SignIngress,
  SkyChart,
  SkyPassage,
  Station,
  TransitChart,
  TransitingBody,
  TransitingPointId,
  TransitPassage,
  VargaChart,
  VimshottariDasha,
  Zodiac,
} from './types.js';

/**
 * Rende il tema in forma tabellare compatta.
 *
 * Pensata per essere consumata da un modello linguistico: circa un ottavo
 * dei token del JSON completo, a parità di informazione astrologica.
 * Per le integrazioni programmatiche usare direttamente l'oggetto `NatalChart`.
 */
export function formatChartCompact(chart: NatalChart): string {
  const lines: string[] = [];
  const { input, time } = chart;

  const place = formatPlace(input);
  const when = time.timeKnown
    ? `${input.date} ${input.time} (${input.timezone}, UTC${formatOffset(time.offsetMinutes)})`
    : `${input.date} (ora ignota)`;

  lines.push(`TEMA NATALE — ${when} — ${place}`);
  lines.push(
    `Case: ${chart.houseSystem} | ${zodiacLine(chart)} | Effemeridi: ${chart.ephemerisMode} | UT: ${time.utc}`,
  );
  lines.push(
    `Tempo siderale locale: ${chart.siderealTime.formatted}` +
      (chart.sect ? ` | Settore: ${chart.sect}` : ''),
  );

  lines.push('', 'CORPI', ...bodyLines(chart.bodies));

  if (chart.partOfFortune) {
    const house =
      chart.partOfFortune.house !== undefined ? ` casa ${chart.partOfFortune.house}` : '';
    lines.push(
      `${'Fortuna'.padEnd(11)} ${formatZodiacal(chart.partOfFortune.longitude).padEnd(11)}  ${house}`,
    );
  }

  if (chart.angles) lines.push('', 'ASSI', ...angleLines(chart.angles));
  if (chart.houses.length > 0) lines.push('', 'CUSPIDI', ...cuspLines(chart.houses));

  lines.push('', 'ASPETTI', ...aspectLines(chart));
  lines.push('', 'DISTRIBUZIONE', ...distributionLines(chart.distribution));
  lines.push(...warningLines(chart.warnings));

  return lines.join('\n');
}

/**
 * Rende in forma tabellare il cielo di un istante.
 *
 * L'intestazione dice che cosa manca e perché: senza luogo non ci sono assi
 * né case, e chi legge non deve chiedersi se siano stati dimenticati.
 */
export function formatSkyCompact(sky: SkyChart): string {
  const { input, time } = sky;

  const when = time.timeKnown
    ? `${input.date} ${input.time} (${input.timezone}, UTC${formatOffset(time.offsetMinutes)})`
    : `${input.date} (ora non indicata, mezzogiorno locale)`;

  const lines = [
    `CIELO — ${when}`,
    `${zodiacLine(sky)} | Effemeridi: ${sky.ephemerisMode} | UT: ${time.utc}`,
  ];

  if (sky.place) {
    const details = [`Luogo: ${formatPlace(sky.place)}`];
    if (sky.houseSystem) details.push(`Case: ${sky.houseSystem}`);
    if (sky.siderealTime) details.push(`Tempo siderale: ${sky.siderealTime.formatted}`);
    if (sky.sect) details.push(`Settore: ${sky.sect}`);
    lines.push(details.join(' | '));
  } else {
    lines.push('Senza luogo: posizioni valide ovunque, nessun asse e nessuna casa.');
  }

  lines.push('', 'CORPI', ...bodyLines(sky.bodies));

  if (sky.angles) lines.push('', 'ASSI', ...angleLines(sky.angles));
  if (sky.houses.length > 0) lines.push('', 'CUSPIDI', ...cuspLines(sky.houses));

  lines.push('', 'ASPETTI', ...aspectLines(sky));
  lines.push('', 'DISTRIBUZIONE', ...distributionLines(sky.distribution));
  lines.push(...warningLines(sky.warnings));

  return lines.join('\n');
}

/**
 * Rende i transiti in forma tabellare compatta.
 *
 * Prende anche il tema natale perché senza non si possono nominare i
 * bersagli, e perché chi legge deve vedere su quale nascita sta lavorando:
 * un quadro di transiti senza la data di nascita è un cielo qualsiasi.
 */
export function formatTransitsCompact(natal: NatalChart, transits: TransitChart): string {
  const lines: string[] = [];
  const { input, time } = transits;

  const when = time.timeKnown
    ? `${input.date} ${input.time} (${input.timezone}, UTC${formatOffset(time.offsetMinutes)})`
    : `${input.date} (ora non indicata, mezzogiorno locale)`;
  const birth = natal.time.timeKnown
    ? `${natal.input.date} ${natal.input.time}`
    : `${natal.input.date} (ora ignota)`;

  lines.push(`TRANSITI — ${when}`);
  lines.push(`Tema natale: ${birth} — ${formatPlace(natal.input)}`);
  lines.push(
    `Case natali: ${natal.houseSystem} | ${zodiacLine(transits)} | Effemeridi: ${transits.ephemerisMode} | UT: ${time.utc}`,
  );
  if (transits.place) {
    const siderale = transits.siderealTime ? ` | TSL: ${transits.siderealTime.formatted}` : '';
    const domificazione = transits.houseSystem ? ` | Case dell'istante: ${transits.houseSystem}` : '';
    lines.push(`Luogo del transito: ${formatPlace(transits.place)}${siderale}${domificazione}`);
  }

  // Due case per corpo vanno spiegate una volta sola, in cima alla colonna:
  // ripeterlo su ogni riga costerebbe più di quanto chiarisca.
  const intestazione = transits.houses.length > 0
    ? "IN TRANSITO (casa natale, fra parentesi la casa dell'istante)"
    : 'IN TRANSITO';
  lines.push('', intestazione, ...transitingLines(transits.transiting));

  if (transits.angles) lines.push('', "ASSI DELL'ISTANTE", ...angleLines(transits.angles));
  if (transits.houses.length > 0) {
    lines.push('', "CUSPIDI DELL'ISTANTE", ...cuspLines(transits.houses));
  }

  lines.push('', 'ASPETTI (in transito → natale)');
  if (transits.aspects.length === 0) {
    lines.push('(nessuno entro le orbite dei transiti)');
  }
  for (const aspect of transits.aspects) {
    const direction = aspect.applying ? 'applicativo' : 'separativo';
    lines.push(
      `${transitingName(transits, aspect.transiting).padEnd(11)} ${aspect.aspect.padEnd(15)} ` +
        `${natalPointName(natal, aspect.natal).padEnd(11)} ` +
        `${formatDegrees(aspect.orb).padStart(7)}  ${direction}${aspect.retrograde ? '  R' : ''}`,
    );
  }

  lines.push(...warningLines(transits.warnings));

  return lines.join('\n');
}

/**
 * Rende in forma tabellare il calendario degli incontri in cielo.
 *
 * Una riga per aspetto esatto, in ordine di tempo, con il moto di **entrambi**
 * i corpi: è quello a spiegare perché uno stesso incontro possa comparire tre
 * volte a poche settimane di distanza.
 */
export function formatSkyPassagesCompact(
  passages: readonly SkyPassage[],
  range: PassageRange,
  warnings: readonly string[] = [],
): string {
  const lines = [`INCONTRI IN CIELO — dal ${range.from} al ${range.to} (${range.timezone})`, ''];

  if (passages.length === 0) {
    lines.push('(nessun aspetto si perfeziona in questo arco di tempo)');
    return lines.join('\n');
  }

  lines.push('Data e ora locali | più veloce | aspetto | più lento | moto | finestra');
  for (const passage of passages) {
    const window = passage.window
      ? `${passage.window.start.slice(0, 10)} → ${passage.window.end.slice(0, 10)}`
      : 'oltre i tre anni';
    const motion = `${passage.retrograde.faster ? 'R' : 'D'}/${passage.retrograde.slower ? 'R' : 'D'}`;

    lines.push(
      `${passage.local.slice(0, 16).replace('T', ' ')} ` +
        `${bodyName(passage.faster).padEnd(11)} ${passage.aspect.padEnd(15)} ` +
        `${bodyName(passage.slower).padEnd(11)} ${motion}  ${window}`,
    );
  }

  lines.push(...warningLines(warnings));

  return lines.join('\n');
}

/**
 * Rende in forma tabellare ingressi e stazioni.
 *
 * Le due tabelle stanno insieme perché rispondono alla stessa domanda — che
 * cosa cambia nel cielo in questo periodo — e perché spesso si spiegano a
 * vicenda: un pianeta che si ferma appena dentro un segno lo lascerà di nuovo.
 */
export function formatSkyEventsCompact(
  ingresses: readonly SignIngress[],
  stations: readonly Station[],
  range: PassageRange,
  warnings: readonly string[] = [],
): string {
  const lines = [`EVENTI DEL CIELO — dal ${range.from} al ${range.to} (${range.timezone})`];

  lines.push('', 'INGRESSI NEI SEGNI');
  if (ingresses.length === 0) {
    lines.push('(nessuno in questo arco di tempo)');
  }
  for (const ingress of ingresses) {
    lines.push(
      `${ingress.local.slice(0, 16).replace('T', ' ')} ` +
        `${bodyName(ingress.body).padEnd(11)} ${ingress.from} → ${ingress.sign}` +
        `${ingress.retrograde ? '  (all\'indietro)' : ''}`,
    );
  }

  lines.push('', 'STAZIONI');
  if (stations.length === 0) {
    lines.push('(nessuna in questo arco di tempo)');
  }
  for (const station of stations) {
    lines.push(
      `${station.local.slice(0, 16).replace('T', ' ')} ` +
        `${bodyName(station.body).padEnd(11)} ${station.direction.padEnd(11)} ` +
        `${formatZodiacal(station.longitude)}`,
    );
  }

  lines.push(...warningLines(warnings));

  return lines.join('\n');
}

/**
 * Rende in forma tabellare il calendario dei passaggi.
 *
 * Una riga per aspetto esatto, in ordine di tempo. La colonna del moto è
 * quella che dà senso all'elenco: tre righe uguali a mesi di distanza, con
 * una `R` in mezzo, sono un pianeta lento che passa e ripassa — e si legge
 * come un periodo unico, non come tre fatti separati.
 */
export function formatPassagesCompact(
  natal: NatalChart,
  passages: readonly TransitPassage[],
  range: PassageRange,
  warnings: readonly string[] = [],
): string {
  const birth = natal.time.timeKnown
    ? `${natal.input.date} ${natal.input.time}`
    : `${natal.input.date} (ora ignota)`;

  const lines = [
    `PASSAGGI — dal ${range.from} al ${range.to} (${range.timezone})`,
    `Tema natale: ${birth} — ${formatPlace(natal.input)}`,
    '',
  ];

  if (passages.length === 0) {
    lines.push('(nessun aspetto si perfeziona in questo arco di tempo)');
    return lines.join('\n');
  }

  lines.push('Data e ora locali | transitante | aspetto | punto natale | moto | finestra');
  for (const passage of passages) {
    const window = passage.window
      ? `${passage.window.start.slice(0, 10)} → ${passage.window.end.slice(0, 10)}`
      : 'oltre i tre anni';

    lines.push(
      `${passage.local.slice(0, 16).replace('T', ' ')} ` +
        `${nameOf(natal, passage.transiting).padEnd(11)} ${passage.aspect.padEnd(15)} ` +
        `${natalPointName(natal, passage.natal).padEnd(11)} ` +
        `${passage.retrograde ? 'R' : 'D'}  ${window}`,
    );
  }

  lines.push(...warningLines(warnings));

  return lines.join('\n');
}

/**
 * Rende in forma tabellare il calendario elettivo.
 *
 * Le ore vanno raggruppate per giorno perché è così che si consultano, e la
 * durata va scritta accanto a ciascuna: sono ore che non durano un'ora, e
 * vederne una da settantotto minuti accanto a una da quarantadue dice della
 * stagione più di qualunque didascalia.
 *
 * I vuoti di corso stanno in coda e non dentro le righe: sono intervalli loro,
 * che tagliano le ore invece di allinearvisi.
 */
export function formatElectionCompact(election: ElectionResult): string {
  const { range, place, hours, voids, filters } = election;
  const lines = [
    `ELEZIONE — dal ${range.from} al ${range.to} (${range.timezone})`,
    `Luogo: ${formatPlace(place)}`,
  ];

  // Il filtro va dichiarato subito: chi legge deve sapere che le ore mancanti
  // non sono state omesse dal calcolo ma escluse su richiesta.
  if (filters) {
    const criteri: string[] = [];
    if (filters.rulers) criteri.push(`solo le ore di ${filters.rulers.map(bodyName).join(', ')}`);
    if (filters.skipMoonVoid) criteri.push('escluse quelle con la Luna vuota di corso');
    lines.push(`Elenco filtrato: ${criteri.join('; ')}`);
  }

  if (hours.length === 0) {
    lines.push('', '(nessuna ora planetaria calcolabile in questo arco)');
    lines.push(...warningLines(election.warnings));
    return lines.join('\n');
  }

  lines.push('', 'ORE PLANETARIE');
  lines.push('Ora locale | reggitore | d/n | durata | Ascendente | Luna');

  let day = '';
  for (const hour of hours) {
    const current = hour.local.start.slice(0, 10);
    if (current !== day) {
      day = current;
      lines.push(`— ${day}`);
    }

    lines.push(
      `${hour.local.start.slice(11, 16)}-${hour.local.end.slice(11, 16)} ` +
        `${bodyName(hour.ruler).padEnd(10)} ` +
        `${hour.diurnal ? 'd' : 'n'}${String(hour.index).padStart(2)} ` +
        `${String(hour.minutes).padStart(3)}m ` +
        `${formatZodiacal(hour.ascendant.longitude).padEnd(11)} ` +
        `${hour.moonVoid ? 'vuota' : ''}`.trimEnd(),
    );
  }

  lines.push('', 'LUNA VUOTA DI CORSO');
  if (voids.length === 0) {
    lines.push('(nessun tratto in questo arco di tempo)');
  }
  for (const period of voids) {
    const last = period.lastAspect
      ? `dopo ${period.lastAspect.aspect} a ${bodyName(period.lastAspect.body)}`
      : 'dall\'ingresso, senza aspetti nel segno';
    lines.push(
      `${period.local.start.slice(0, 16).replace('T', ' ')} → ` +
        `${period.local.end.slice(0, 16).replace('T', ' ')} ` +
        `(${period.minutes} min) in ${period.sign}, ${last}, poi ${period.nextSign}`,
    );
  }

  lines.push(...warningLines(election.warnings));

  return lines.join('\n');
}

/** Una riga per corpo: nome, posizione zodiacale, moto, casa se c'è. */
function bodyLines(bodies: readonly CelestialBody[]): string[] {
  return bodies.map((body) => {
    const retro = body.retrograde ? ' R' : '  ';
    const house = body.house !== undefined ? ` casa ${String(body.house).padStart(2)}` : '';
    return `${body.name.padEnd(11)} ${formatZodiacal(body.longitude).padEnd(11)}${retro}${house}`;
  });
}

/**
 * I transitanti, con una casa o con due.
 *
 * La colonna natale resta dov'è sempre stata e quella dell'istante si aggiunge
 * dopo, fra parentesi: senza un luogo la riga è identica a prima, e con un
 * luogo l'ordine dice da sé quale delle due si legge per prima.
 */
function transitingLines(bodies: readonly TransitingBody[]): string[] {
  const conLuogo = bodies.some((body) => body.transitHouse !== undefined);

  return bodies.map((body) => {
    const retro = body.retrograde ? ' R' : '  ';
    const natale = body.house !== undefined ? ` casa ${String(body.house).padStart(2)}` : '';
    const istante = conLuogo ? `  (${String(body.transitHouse ?? '—').padStart(2)})` : '';
    return (
      `${body.name.padEnd(11)} ${formatZodiacal(body.longitude).padEnd(11)}` +
      `${retro}${natale}${istante}`
    );
  });
}

function angleLines(angles: Angles): string[] {
  return [
    `ASC ${formatZodiacal(angles.ascendant)}   MC  ${formatZodiacal(angles.midheaven)}`,
    `DSC ${formatZodiacal(angles.descendant)}   IC  ${formatZodiacal(angles.imumCoeli)}`,
  ];
}

/** Le dodici cuspidi, tre per riga: dodici righe da sole occuperebbero uno schermo. */
function cuspLines(houses: readonly House[]): string[] {
  const lines: string[] = [];
  for (let i = 0; i < houses.length; i += 3) {
    lines.push(
      houses
        .slice(i, i + 3)
        .map((h) => `${String(h.number).padStart(2)}. ${formatZodiacal(h.longitude).padEnd(11)}`)
        .join(' '),
    );
  }
  return lines;
}

function aspectLines(chart: { bodies: readonly CelestialBody[]; aspects: readonly Aspect[] }): string[] {
  if (chart.aspects.length === 0) return ['(nessuno entro le orbite previste)'];

  return chart.aspects.map((aspect) => {
    const direction = aspect.applying ? 'applicativo' : 'separativo';
    return (
      `${nameOf(chart, aspect.from).padEnd(11)} ${aspect.aspect.padEnd(15)} ` +
      `${nameOf(chart, aspect.to).padEnd(11)} ` +
      `${formatDegrees(aspect.orb).padStart(7)}  ${direction}`
    );
  });
}

/**
 * La distribuzione, in tre righe.
 *
 * I gruppi restano distinti anche qui, e il totale non viene scritto: sommarli
 * vorrebbe dire scegliere una convenzione, che è proprio ciò che il conteggio
 * spezzato evita. Chi legge somma le righe che gli servono.
 *
 * I gruppi vuoti si saltano: un tema senza ora non ha assi, e una riga di zeri
 * si leggerebbe come «nessun asse in nessun elemento» invece che «non pervenuti».
 */
function distributionLines(distribution: Distribution): string[] {
  const gruppi: [string, DistributionGroup][] = [
    ['Pianeti', distribution.planets],
    ['Punti', distribution.points],
    ['Assi', distribution.angles],
  ];

  return gruppi
    .filter(([, gruppo]) => gruppo.counted.length > 0)
    .map(([nome, gruppo]) => {
      const elementi = (['fuoco', 'terra', 'aria', 'acqua'] as const)
        .map((elemento) => `${elemento} ${gruppo.elements[elemento]}`)
        .join('  ');
      const modalita = (['cardinale', 'fisso', 'mobile'] as const)
        .map((modo) => `${modo} ${gruppo.modalities[modo]}`)
        .join('  ');
      return `${nome.padEnd(8)} ${elementi.padEnd(38)} | ${modalita}`;
    });
}

/**
 * Da dove sono contati i gradi, detto sempre e non solo quando è insolito.
 *
 * Un tema siderale che tacesse si leggerebbe come tropicale, e sbaglierebbe di
 * quasi un segno; ma anche il tropicale lo dichiara, perché un'assenza non è
 * un'affermazione — chi non trova la riga non sa se sia tropicale o se sia
 * stata dimenticata. Con l'ayanamsa in chiaro, chi segue un'altra scuola rifà
 * il conto invece di doverci credere.
 */
function zodiacLine(chart: { zodiac: Zodiac; ayanamsa?: AyanamsaInfo }): string {
  if (!chart.ayanamsa) return `Zodiaco: ${chart.zodiac}`;
  return `Zodiaco: ${chart.zodiac} (${chart.ayanamsa.name} ${formatDegrees(chart.ayanamsa.degrees)})`;
}

/**
 * I nakshatra dei corpi di un tema siderale.
 *
 * Una tabella a parte e non una colonna in più fra i corpi: la divisione in
 * ventisette è un'altra lettura dello stesso cielo, e appiccicarla di fianco ai
 * segni farebbe una riga in cui due sistemi si contendono lo spazio. Chi la
 * vuole la chiede.
 *
 * Ci sono dentro anche Urano, Nettuno e Plutone, che **graha non sono**: il
 * Jyotisha ne conta nove ed è più vecchio di loro di qualche millennio. Ma un
 * nakshatra è una divisione del cerchio, e ogni longitudine ne ha una: toglierli
 * sarebbe il motore che decide chi conta, che è esattamente ciò che non fa.
 * Quali corpi compaiano lo sceglie chi chiede il tema, con `options.bodies`.
 */
export function formatNakshatraCompact(chart: NatalChart): string {
  requireSidereal(chart.zodiac, 'La tabella dei nakshatra');

  const lines: string[] = ['NAKSHATRA'];

  for (const body of chart.bodies) {
    const nakshatra = nakshatraOf(body.longitude);
    lines.push(
      `${grahaName(body.id, body.name).padEnd(11)} ` +
        `${formatZodiacal(body.longitude).padEnd(11)} ` +
        `${nakshatra.name.padEnd(18)} ` +
        `pada ${nakshatra.pada}  ` +
        `sig. ${grahaName(nakshatra.lord, nakshatra.lord)}`,
    );
  }

  return lines.join('\n');
}

/**
 * Il panchanga in cinque righe, più le due longitudini da cui discende.
 *
 * Le longitudini non sono un di più: sono ciò che rende il resto
 * ricontrollabile senza fidarsi, come `counted` per la distribuzione. Da Sole
 * e Luna si rifanno tutte e cinque le parti con un'aritmetica che sta in tre
 * righe.
 */
export function formatPanchangaCompact(panchanga: Panchanga): string {
  const { input, time, tithi, vara, nakshatra, yoga, karana } = panchanga;

  const quando = time.timeKnown
    ? `${input.date} ${input.time} (${input.timezone})`
    : `${input.date} (ora non indicata, mezzogiorno locale)`;

  const lines = [
    `PANCHANGA — ${quando} — ${formatPlace(panchanga.place)}`,
    `Ayanamsa: ${panchanga.ayanamsa.name} ${formatDegrees(panchanga.ayanamsa.degrees)} | ` +
      `Effemeridi: ${panchanga.ephemerisMode} | UT: ${time.utc}`,
    `Sole ${formatZodiacal(panchanga.sun)} | Luna ${formatZodiacal(panchanga.moon)}`,
    '',
    `Tithi     ${tithi.name} (${tithi.paksha}, ${tithi.numberInPaksha}º) — ${tithi.index}/30`,
    vara
      ? `Vara      ${vara.name}, retto da ${grahaName(vara.lord, vara.lord)} — alba ${vara.local.slice(11, 16)}`
      : 'Vara      non calcolabile: qui il Sole non sorge',
    `Nakshatra ${nakshatra.name}, pada ${nakshatra.pada} — ${nakshatra.index}/27, ` +
      `signore ${grahaName(nakshatra.lord, nakshatra.lord)}`,
    `Yoga      ${yoga.name} — ${yoga.index}/27`,
    `Karana    ${karana.name} — ${karana.index}/60${karana.movable ? '' : ', fisso'}`,
  ];

  lines.push(...warningLines(panchanga.warnings));

  return lines.join('\n');
}

/**
 * La catena delle dasha, un periodo per riga e i sotto-periodi rientrati.
 *
 * Il saldo alla nascita in testa: è il numero che si riporta per primo in ogni
 * lettura, e quello con cui si verifica a colpo d'occhio che il conto torni.
 *
 * Le date sono locali. Un periodo di Saturno che comincia il 12 novembre è un
 * fatto del calendario di chi lo vive, non un istante UTC — quello resta nel
 * JSON per chi deve rifare i conti.
 */
export function formatDashaCompact(dasha: VimshottariDasha): string {
  const lines = [
    `DASHA VIMSHOTTARI — Luna in ${dasha.nakshatra.name} pada ${dasha.nakshatra.pada}, ` +
      `signore ${grahaName(dasha.nakshatra.lord, dasha.nakshatra.lord)}`,
    `Saldo alla nascita: ${dasha.balance.toFixed(2)} anni | ` +
      `anno ${dasha.yearLength} (${dasha.daysPerYear} giorni) | ` +
      `${dasha.levels} ${dasha.levels === 1 ? 'ordine' : 'ordini'}`,
    '',
  ];

  const righe = (periods: readonly DashaPeriod[], rientro: string): void => {
    for (const period of periods) {
      lines.push(
        `${rientro}${grahaName(period.lord, period.lord).padEnd(11 - rientro.length)} ` +
          `${period.local.start.slice(0, 10)} → ${period.local.end.slice(0, 10)}  ` +
          `${formatDashaYears(period.years)}`,
      );
      if (period.periods) righe(period.periods, `${rientro}  `);
    }
  };

  righe(dasha.periods, '');
  lines.push(...warningLines(dasha.warnings));

  return lines.join('\n');
}

/**
 * La durata di un periodo, nell'unità in cui si legge meglio.
 *
 * Mesi sotto l'anno, anni sopra, e senza decimale quando è tondo: le durate dei
 * mahadasha sono numeri interi per costruzione, e «7.0 anni» fa sembrare
 * approssimato ciò che è esatto. La soglia sta sotto l'anno e non a un anno
 * netto, o un periodo di undici mesi e mezzo si leggerebbe «12 mesi».
 */
function formatDashaYears(years: number): string {
  const tondo = Math.round(years);
  if (Math.abs(years - tondo) < 0.05) return `${tondo} ${tondo === 1 ? 'anno' : 'anni'}`;
  if (years < 0.95) return `${Math.round(years * 12)} mesi`;
  return `${years.toFixed(1)} anni`;
}

/**
 * Una carta divisionale: una riga per corpo, e la regola in testa.
 *
 * La regola non è un commento ma parte del dato. Un D-9 senza la sua regola è
 * un elenco di segni di cui non si può dire se sia quello che si voleva:
 * fra le sedici divisioni le scuole divergono, e chi ne segue un'altra deve
 * poterlo vedere prima di confrontare i numeri.
 */
export function formatVargaCompact(varga: VargaChart): string {
  // Nell'intestazione niente «N parti per segno»: nel trimsamsa sarebbe falso,
  // e la riga sotto lo smentirebbe. Quanto e come si divida lo dice la regola,
  // che è l'unica a poterlo dire per tutti.
  const lines = [
    `${varga.name.toUpperCase()} (${varga.varga.toUpperCase()})`,
    `Regola: ${varga.rule}`,
    '',
  ];

  if (varga.ascendant) lines.push(`${'Lagna'.padEnd(11)} ${varga.ascendant}`);
  for (const position of varga.positions) {
    lines.push(`${position.name.padEnd(11)} ${position.sign}`);
  }

  return lines.join('\n');
}

/**
 * Gli sguardi di un tema: chi guarda chi, e su quali segni cadono.
 *
 * Le due tabelle non sono una il riassunto dell'altra. La prima dice i
 * contatti fra graha; la seconda dove lo sguardo arriva, **anche dove non
 * trova nessuno**, che in questo sistema è un dato e non un'assenza.
 *
 * La freccia è nel verso giusto e non si scambia: le case si contano in avanti,
 * quindi che uno guardi l'altro non implica il contrario.
 */
export function formatDrishtiCompact(drishti: DrishtiChart): string {
  const lines = [
    'DRISHTI',
    `Nodi: ${drishti.nodes === 'gioviana' ? 'quinta, settima e nona come Giove' : 'nessuno sguardo (forma classica)'}`,
    '',
  ];

  if (drishti.aspects.length === 0) {
    lines.push('(nessuno sguardo trova un graha o il lagna)');
  }
  for (const aspect of drishti.aspects) {
    lines.push(
      `${aspect.fromName.padEnd(11)} → ${aspect.toName.padEnd(11)} ${aspect.house}ª casa`,
    );
  }

  lines.push('', 'SEGNI GUARDATI');
  for (const cast of drishti.signs) {
    lines.push(`${cast.fromName.padEnd(11)} ${cast.house}ª  ${cast.sign}`);
  }

  lines.push(...warningLines(drishti.warnings));

  return lines.join('\n');
}

/**
 * Il tema vedico per intero: la carta, i nakshatra, le dasha, il navamsa e le
 * drishti, in un testo solo.
 *
 * Esiste perché i chiamanti sono più d'uno — la riga di comando e il prompt
 * MCP, e domani una rotta — e cinque chiamate copiate in tre posti divergono
 * al primo cambiamento. Che cosa sia «il tema vedico» va deciso in un posto.
 *
 * Le case le vuole a **segni interi**, e non è una preferenza: in questo
 * sistema si contano così, e un tema con le cuspidi di Placidus accanto a
 * istruzioni che dicono di contarle a segni interi sarebbe una contraddizione
 * consegnata a chi legge. Chi passa un tema domificato altrimenti riceve
 * un'avvertenza, non un rifiuto: le posizioni restano giuste, sono le case a
 * non essere quelle che il sistema intende.
 */
export function formatJyotishaCompact(
  chart: NatalChart,
  options: JyotishaFormatOptions = {},
): string {
  requireSidereal(chart.zodiac, 'Il tema vedico');

  const parti = [formatChartCompact(chart)];

  if (chart.houses.length > 0 && chart.houseSystem !== 'segni-interi') {
    parti.push(
      `AVVERTENZA SULLE CASE\nIl tema è domificato con ${chart.houseSystem}, ma il Jyotisha ` +
        'conta le case a segni interi dal lagna. Le posizioni dei graha sono giuste; le ' +
        'cuspidi qui sopra non sono quelle che questo sistema intende.',
    );
  }

  parti.push(formatNakshatraCompact(chart));
  parti.push(formatDashaCompact(computeVimshottari(chart, options.dasha ?? { levels: 2 })));

  for (const id of options.vargas ?? ['d9']) {
    parti.push(formatVargaCompact(computeVarga(chart, id)));
  }

  parti.push(formatDrishtiCompact(computeDrishti(chart, options.drishti ?? {})));

  return parti.join('\n\n');
}

function warningLines(warnings: readonly string[]): string[] {
  if (warnings.length === 0) return [];
  return ['', 'AVVERTENZE', ...warnings.map((warning) => `- ${warning}`)];
}

function nameOf(chart: { bodies: readonly CelestialBody[] }, id: string): string {
  return chart.bodies.find((body) => body.id === id)?.name ?? id;
}

/** Il nome di un corpo quando non c'è nessuna carta da cui ricavarlo. */
function bodyName(id: BodyId): string {
  return BODIES.find((body) => body.id === id)?.name ?? id;
}

/** Gli stessi nomi visti come mappa parziale su tutti i bersagli possibili. */
const POINT_NAMES: Readonly<Partial<Record<NatalPointId, string>>> = NATAL_POINT_NAMES;

/** Il nome di un bersaglio natale: un corpo del tema, oppure un asse. */
function natalPointName(chart: NatalChart, id: NatalPointId): string {
  return POINT_NAMES[id] ?? nameOf(chart, id);
}

/**
 * Il nome di un transitante: un corpo del cielo, oppure un asse dell'istante.
 *
 * Gli assi non stanno fra i corpi calcolati — non lo sono — e cercarveli
 * lascerebbe nella tabella l'identificatore grezzo al posto del nome.
 */
function transitingName(transits: TransitChart, id: TransitingPointId): string {
  return POINT_NAMES[id] ?? nameOf({ bodies: transits.transiting }, id);
}

function formatPlace(place: Place): string {
  return `${formatCoordinate(place.latitude, 'N', 'S')} ${formatCoordinate(place.longitude, 'E', 'O')}`;
}

function formatCoordinate(value: number, positive: string, negative: string): string {
  const hemisphere = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(4)}${hemisphere}`;
}

function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-';
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const rest = Math.round(absolute % 60);
  return `${sign}${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}
