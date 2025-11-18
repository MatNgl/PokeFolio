import { useMemo } from 'react';
import { Package } from 'lucide-react';
import type { TopSets } from '../types/dashboard.types';
import { useSetLogos, resolveLogoUrl } from '../../../hooks/useSetLogos';
import styles from './TopSetsList.module.css';

export interface TopSetsListProps {
  data: TopSets | undefined;
  loading?: boolean;
}

export function TopSetsList({ data, loading = false }: TopSetsListProps): JSX.Element {
  // Récupérer les logos depuis TCGDex
  const setIds = useMemo(() => data?.sets.map((s) => s.setId) || [], [data?.sets]);
  const logos = useSetLogos(setIds);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.title}>
            <div className={styles.iconWrapper} aria-hidden="true">
              <Package size={16} />
            </div>
            Top Sets
          </div>
        </div>
        <div className={styles.list}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className={styles.skeletonItem}>
              <div className={styles.skeletonName} />
              <div className={styles.skeletonValue} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.sets.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.title}>
            <div className={styles.iconWrapper} aria-hidden="true">
              <Package size={16} />
            </div>
            Top Sets
          </div>
        </div>
        <div className={styles.emptyState}>
          <Package className={styles.emptyIcon} aria-hidden="true" />
          <p className={styles.emptyText}>Aucun set disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <div className={styles.iconWrapper} aria-hidden="true">
            <Package size={16} />
          </div>
          Top Sets
        </div>
        <div className={styles.badge} aria-label={`${data.totalSets} sets total`}>
          {data.totalSets} sets
        </div>
      </div>

      <div className={styles.list} role="list">
        {data.sets.map((set, index) => {
          const logoUrl = resolveLogoUrl(logos[set.setId] || set.setLogo);
          return (
            <div key={set.setId} className={styles.item} role="listitem">
              <div className={styles.rank} aria-label={`Rank ${index + 1}`}>
                #{index + 1}
              </div>
              <div className={styles.logoWrapper}>
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={set.setName}
                    className={styles.setLogo}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className={styles.logoFallback}
                  style={{ display: logoUrl ? 'none' : 'flex' }}
                  aria-hidden="true"
                >
                  <Package size={16} />
                </div>
              </div>
              <div className={styles.info}>
                <div className={styles.setName} title={set.setName}>
                  {set.setName}
                </div>
                <div className={styles.stats}>
                  <span className={styles.count} aria-label={`${set.cardCount} cards`}>
                    {set.cardCount} cartes
                  </span>
                  {set.totalValue > 0 && (
                    <>
                      <span className={styles.separator}>•</span>
                      <span className={styles.value} aria-label={`Value: ${set.totalValue}€`}>
                        {set.totalValue.toFixed(2)}€
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
