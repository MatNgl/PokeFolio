// apps/web/src/pages/Search.tsx
import { useEffect, useId, useMemo, useState } from 'react';
import styles from './Search.module.css';
import { cardsService } from '../services/cards.service';
import CardItem from '../components/cards/CardItem';
import type { Card, CardLanguage, CardSearchResult } from '@pokefolio/types';

const LANGS: CardLanguage[] = ['fr', 'en', 'ja', 'zh'];

export default function Search() {
  const [q, setQ] = useState<string>('');
  const [lang, setLang] = useState<CardLanguage>('fr');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CardSearchResult>({
    cards: [],
    total: 0,
    page: 1,
    limit: 20,
  });

  const qId = useId();
  const langId = useId();

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(result.total / limit)),
    [result.total, limit]
  );

  useEffect(() => {
    // auto-search when page/lang/limit change if q present
    if (!q) return;
    void doSearch(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, lang, limit]);

  async function doSearch(resetPage = true) {
    try {
      setLoading(true);
      setError(null);
      if (resetPage) setPage(1);

      const params = { q, lang, page: resetPage ? 1 : page, limit };
      const data = await cardsService.searchCards(params);
      setResult(data);
    } catch (e) {
      setError('Erreur lors de la recherche. Réessaie dans un instant.');
    } finally {
      setLoading(false);
    }
  }

  function onAdd(card: Card) {
    // Sera branché sur le modal Add Portfolio à la PR#2/#3
    // Pour l’instant, on affiche une notification simple.
    // eslint-disable-next-line no-alert
    alert(`Préremplir l'ajout avec: ${card.name} (${card.set?.name ?? 'Set ?'})`);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Recherche de cartes</h1>
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            void doSearch();
          }}
          role="search"
          aria-label="Recherche TCGdex"
        >
          <div className={styles.field}>
            <label htmlFor={qId}>Nom</label>
            <input
              id={qId}
              name="q"
              placeholder="Ex: Pikachu, Dracaufeu…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoCapitalize="none"
              spellCheck={false}
              autoComplete="off"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor={langId}>Langue</label>
            <select
              id={langId}
              value={lang}
              onChange={(e) => setLang(e.target.value as CardLanguage)}
            >
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.submitBtn} aria-label="Lancer la recherche">
              Rechercher
            </button>
          </div>
        </form>
      </header>

      {error && (
        <div role="alert" className={styles.error}>
          {error}
        </div>
      )}

      {loading ? (
        <section className={styles.grid} aria-busy="true" aria-live="polite">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.skel} />
          ))}
        </section>
      ) : (
        <section className={styles.grid} aria-live="polite">
          {result.cards.map((c) => (
            <CardItem key={`${c.id}-${c.localId}`} card={c} onAdd={onAdd} />
          ))}
          {result.total === 0 && q && <p className={styles.empty}>Aucun résultat.</p>}
        </section>
      )}

      <footer className={styles.footer}>
        <div className={styles.pagination} role="navigation" aria-label="Pagination">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className={styles.pageBtn}
          >
            Précédent
          </button>
          <span className={styles.pageInfo}>
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className={styles.pageBtn}
          >
            Suivant
          </button>

          <label className={styles.limitLabel}>
            Par page
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10))}
              disabled={loading}
              aria-label="Nombre de résultats par page"
            >
              {[10, 20, 30, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      </footer>
    </main>
  );
}
