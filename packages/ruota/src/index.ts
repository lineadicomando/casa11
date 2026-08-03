/**
 * Il disegno del tema.
 *
 * Sta fuori sia da `core` sia da `apps/web` perché non è né calcolo né
 * interfaccia: è la resa grafica, e la vogliono tutte e quattro le superfici —
 * la pagina che la anima, la CLI che la salva, l'API che la serve, il server
 * MCP che la passa a un agente.
 *
 * Dal motore di calcolo non dipende affatto — vedi `types.ts` — e la cosa
 * dice anche il verso giusto: **il disegno non conosce il motore**, riceve una
 * carta già calcolata e non ha modo di calcolarne una.
 *
 * La rasterizzazione in PNG sta apposta in un punto d'ingresso separato,
 * `@undicesimacasa/ruota/png`: porta con sé un modulo nativo, e il browser non
 * deve avere modo di incontrarlo.
 */

export * from './glyphs.js';
export * from './palette.js';
export * from './svg.js';
export * from './types.js';
export * from './wheel.js';
