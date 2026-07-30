<script lang="ts">
  import '../app.css';

  let { children } = $props();
</script>

<div class="guscio">
  <header>
    <h1>Tema natale</h1>
    <p class="sottotitolo">
      Posizioni planetarie, case e aspetti. Calcolo con Swiss Ephemeris, fusi orari storici.
    </p>
  </header>

  <main>
    {@render children()}
  </main>

  <footer>
    <p>
      Dati astronomici <a href="https://www.astro.com/swisseph/">Swiss Ephemeris</a> ·
      località <a href="https://www.geonames.org/">GeoNames</a> (CC BY 4.0) ·
      codice sotto licenza AGPL-3.0
    </p>
  </footer>
</div>

<style>
  .guscio {
    max-width: 72rem;
    margin: 0 auto;
    padding: 2.5rem 1.25rem 4rem;
  }

  header {
    margin-bottom: 2.5rem;
  }

  h1 {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: clamp(2rem, 5vw, 2.75rem);
    font-weight: 400;
    letter-spacing: -0.01em;
    margin: 0 0 0.35rem;
  }

  .sottotitolo {
    margin: 0;
    color: var(--testo-tenue);
    font-size: 0.95rem;
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
</style>
