<script lang="ts">
  import { page } from '$app/state';
  import ColorSchemeToggle from '$lib/components/ColorSchemeToggle.svelte';
  import Wordmark from '$lib/components/Wordmark.svelte';
  import { isActive, SECTIONS } from '$lib/navigation';
  import { REPOSITORY_URL } from '$lib/project';
  import '../app.css';

  let { children } = $props();
</script>

<div class="guscio">
  <header>
    <div class="testata">
      <a class="marchio" href="/"><Wordmark /></a>
      <ColorSchemeToggle />
    </div>

    <nav aria-label="Sezioni">
      <ul>
        {#each SECTIONS as section (section.href)}
          {@const attiva = isActive(section.href, page.url.pathname)}
          <li>
            <a href={section.href} aria-current={attiva ? 'page' : undefined} class:attiva>
              {section.label}
            </a>
          </li>
        {/each}
      </ul>
    </nav>
  </header>

  <main>
    {@render children()}
  </main>

  <footer>
    <p>
      Dati astronomici <a href="https://www.astro.com/swisseph/">Swiss Ephemeris</a> ·
      località <a href="https://www.geonames.org/">GeoNames</a> (CC BY 4.0)
    </p>
    <p>
      <a href="/privacy">Privacy e cookie</a> ·
      {#if REPOSITORY_URL}
        <a href={REPOSITORY_URL}>codice sorgente</a>
      {:else}
        codice sorgente
      {/if}
      sotto licenza AGPL-3.0
    </p>
  </footer>
</div>

<style>
  .guscio {
    max-width: 72rem;
    margin: 0 auto;
    padding: 1.0rem 1.25rem 4rem;
  }

  header {
    margin-bottom: 2.5rem;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid var(--linea);
  }

  /* Il marchio non è il titolo della pagina: con più sezioni il titolo scende
     nelle pagine, che così hanno ciascuna il proprio `h1`. */
  .testata {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .marchio {
    display: inline-block;
    /* Il disegno è l'unico contenuto del link: senza questo la riga di testo
       che lo contiene gli lascia sotto qualche pixel di spazio. */
    line-height: 0;
  }

  .marchio:hover {
    opacity: 0.75;
  }

  nav ul {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    margin: 0.7rem 0 0;
    padding: 0;
    list-style: none;
  }

  nav a {
    display: block;
    padding-bottom: 0.5rem;
    font-size: 0.85rem;
    text-decoration: none;
    color: var(--testo-tenue);
    /* Il bordo c'è sempre, trasparente quando la voce non è attiva: così la
       riga non sobbalza di un pixel passando da una sezione all'altra. */
    border-bottom: 2px solid transparent;
    margin-bottom: -0.65rem;
  }

  nav a:hover {
    color: var(--testo);
  }

  nav a.attiva {
    color: var(--testo);
    border-bottom-color: var(--accento);
  }

  footer {
    margin-top: 4rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--linea);
    color: var(--testo-tenue);
    font-size: 0.85rem;
  }

  footer p {
    margin: 0;
  }

  footer p + p {
    margin-top: 0.3rem;
  }
</style>
