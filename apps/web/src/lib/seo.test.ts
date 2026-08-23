import { describe, expect, it } from 'vitest';
import { SECTIONS } from './navigation';
import { PAGINE_PUBBLICHE, sitemapXml } from './seo';

const ORIGINE = 'https://esempio.it';

describe('PAGINE_PUBBLICHE', () => {
  it('contiene tutte le sezioni del menù', () => {
    for (const section of SECTIONS) {
      expect(PAGINE_PUBBLICHE).toContain(section.href);
    }
  });

  it('contiene l\'informativa, che sezione non è', () => {
    expect(PAGINE_PUBBLICHE).toContain('/privacy');
  });

  it('non elenca niente due volte', () => {
    expect(new Set(PAGINE_PUBBLICHE).size).toBe(PAGINE_PUBBLICHE.length);
  });

  it('non porta parametri: un tema non è una pagina', () => {
    for (const percorso of PAGINE_PUBBLICHE) {
      expect(percorso).not.toContain('?');
    }
  });
});

describe('sitemapXml', () => {
  it('elenca ogni pagina pubblica con un indirizzo assoluto', () => {
    const xml = sitemapXml(ORIGINE);

    for (const percorso of PAGINE_PUBBLICHE) {
      expect(xml).toContain(`<loc>${new URL(percorso, ORIGINE).href}</loc>`);
    }
  });

  it('conta tante <url> quante sono le pagine', () => {
    const xml = sitemapXml(ORIGINE);
    expect(xml.match(/<url>/g)).toHaveLength(PAGINE_PUBBLICHE.length);
  });

  it('segue l\'origine che gli si dà, senza costanti scritte dentro', () => {
    expect(sitemapXml('http://localhost:3000')).toContain('http://localhost:3000/');
    expect(sitemapXml('http://localhost:3000')).not.toContain('esempio.it');
  });

  it('non dichiara date di modifica né priorità', () => {
    const xml = sitemapXml(ORIGINE);
    expect(xml).not.toContain('lastmod');
    expect(xml).not.toContain('changefreq');
    expect(xml).not.toContain('priority');
  });

  it('è XML ben formato', () => {
    const xml = sitemapXml(ORIGINE);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
  });
});
