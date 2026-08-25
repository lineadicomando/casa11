import type { Aspect, CelestialBody, House, NatalChart } from '@dodicisegni/core';
import { describe, expect, it } from 'vitest';
import { CHIARA, SCURA } from '../src/palette.js';
import { ruotaSvg } from '../src/svg.js';
import type { WheelChart } from '../src/wheel.js';

function body(id: string, longitude: number, extra: Partial<CelestialBody> = {}): CelestialBody {
  return {
    id,
    name: id,
    longitude,
    latitude: 0,
    distance: 1,
    speed: 1,
    retrograde: false,
    sign: 'ariete',
    signDegree: longitude % 30,
    ...extra,
  } as CelestialBody;
}

/** Dodici cuspidi equidistanti: bastano a far disegnare le case. */
function houses(from = 0): House[] {
  return Array.from({ length: 12 }, (_, i) => ({
    number: i + 1,
    longitude: (from + i * 30) % 360,
    sign: 'ariete',
    signDegree: 0,
  })) as House[];
}

function chart(extra: Partial<WheelChart> = {}): WheelChart {
  return {
    bodies: [body('sole', 10), body('luna', 200)],
    houses: houses(),
    angles: { ascendant: 0, midheaven: 270, descendant: 180, imumCoeli: 90 } as NatalChart['angles'],
    aspects: [],
    ...extra,
  };
}

describe('ruotaSvg', () => {
  it('produce un documento autosufficiente', () => {
    const svg = ruotaSvg(chart());

    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  });

  it('non lascia nessuna var() da risolvere', () => {
    // È il difetto per cui questo modulo esiste: fuori dalla pagina una
    // custom property non è un colore sbagliato, è nessun colore.
    const svg = ruotaSvg(chart(), { palette: SCURA });

    expect(svg).not.toContain('var(--');
  });

  it('dipinge il fondo, perché un file trasparente perde i glifi', () => {
    expect(ruotaSvg(chart(), { palette: SCURA })).toContain(`fill="${SCURA.sfondo}"`);
    expect(ruotaSvg(chart(), { palette: CHIARA })).toContain(`fill="${CHIARA.sfondo}"`);
  });

  it('non porta con sé i bersagli del tocco', () => {
    // In un file non c'è nessun dito, e `transparent` non sopravvivrebbe.
    const svg = ruotaSvg(chart());

    expect(svg).not.toContain('data-bersaglio');
    expect(svg).not.toContain('transparent');
  });

  it('disegna le case quando ci sono gli assi', () => {
    const svg = ruotaSvg(chart());

    for (const sigla of ['ASC', 'MC', 'DSC', 'IC']) {
      expect(svg).toContain(`>${sigla}</text>`);
    }
  });

  it('tace su assi e case quando l\'ora di nascita è ignota', () => {
    // Senza ora non esistono: non vanno disegnati a mezzogiorno implicito.
    const svg = ruotaSvg(chart({ houses: [], angles: undefined }));

    expect(svg).not.toContain('>ASC</text>');
    expect(svg).not.toContain('>MC</text>');
  });

  it('marca i retrogradi e non gli altri', () => {
    const conR = ruotaSvg(chart({ bodies: [body('urano', 40, { retrograde: true })] }));
    const senzaR = ruotaSvg(chart({ bodies: [body('urano', 40)] }));

    expect(conR).toContain('℞');
    expect(senzaR).not.toContain('℞');
  });

  it('lascia fuori gli aspetti minori se non li si vuole', () => {
    const aspetti = [
      { from: 'sole', to: 'luna', aspect: 'trigono', angle: 120, orb: 1, applying: true },
      { from: 'sole', to: 'luna', aspect: 'semisestile', angle: 30, orb: 1, applying: true },
    ] as Aspect[];

    const con = ruotaSvg(chart({ aspects: aspetti }), { aspettiMinori: true });
    const senza = ruotaSvg(chart({ aspects: aspetti }), { aspettiMinori: false });

    expect(righe(con, 'line')).toBeGreaterThan(righe(senza, 'line'));
    expect(senza).toContain(CHIARA.aspetti.trigono);
    expect(senza).not.toContain(CHIARA.aspetti.semisestile);
  });

  it('non tira linee verso il centro quando un capo non esiste', () => {
    // Un aspetto all'Ascendente in un tema senza ora: il bersaglio non c'è.
    const svg = ruotaSvg(
      chart({
        houses: [],
        angles: undefined,
        aspects: [
          { from: 'sole', to: 'ascendente', aspect: 'quadrato', angle: 90, orb: 1, applying: true },
        ] as unknown as Aspect[],
      }),
    );

    expect(svg).not.toContain(CHIARA.aspetti.quadrato);
  });

  it('arrotonda le coordinate invece di stendere diciassette decimali', () => {
    const svg = ruotaSvg(chart());

    expect(svg).not.toMatch(/\d\.\d{3,}/);
  });

  it('nomina un font che esista anche in un contenitore', () => {
    // `system-ui` da solo, in un'immagine slim, non risolve niente e i glifi
    // escono come caselle vuote.
    expect(ruotaSvg(chart())).toContain('DejaVu Sans');
  });
});

function righe(svg: string, tag: string): number {
  return svg.split(`<${tag} `).length - 1;
}
