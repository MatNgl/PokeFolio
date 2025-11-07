import { DollarSign } from 'lucide-react';
import type { ExpensiveCards } from '../types/dashboard.types';
import styles from './TopSetsList.module.css';

export interface TopExpensiveCardsProps {
  data: ExpensiveCards | undefined;
  loading?: boolean;
}

export function TopExpensiveCards({ data, loading = false }: TopExpensiveCardsProps): JSX.Element {
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.title}>
            <div className={styles.iconWrapper} aria-hidden="true">
              <DollarSign size={16} />
            </div>
            Top Cartes les Plus Chères
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

  if (!data || data.cards.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.title}>
            <div className={styles.iconWrapper} aria-hidden="true">
              <DollarSign size={16} />
            </div>
            Top Cartes les Plus Chères
          </div>
        </div>
        <div className={styles.emptyState}>
          <DollarSign className={styles.emptyIcon} aria-hidden="true" />
          <p className={styles.emptyText}>Aucune carte disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <div className={styles.iconWrapper} aria-hidden="true">
            <DollarSign size={16} />
          </div>
          Top Cartes les Plus Chères
        </div>
      </div>

      <div className={styles.list} role="list">
        {data.cards.map((card, index) => (
          <div key={card.itemId} className={styles.item} role="listitem">
            <div className={styles.rank} aria-label={`Rank ${index + 1}`}>
              #{index + 1}
            </div>
            <div className={styles.info}>
              <div className={styles.setName} title={card.cardName || card.cardId}>
                {card.cardName || card.cardId}
              </div>
              <div className={styles.stats}>
                <span className={styles.value} aria-label={`Price: ${card.price.toFixed(2)}€`}>
                  {card.price.toFixed(2)}€
                </span>
                {card.isGraded && card.gradeCompany && (
                  <>
                    <span className={styles.separator}>•</span>
                    <span className={styles.count} aria-label={`Grade: ${card.gradeCompany}`}>
                      {card.gradeCompany}
                      {card.gradeScore ? ` ${card.gradeScore}` : ''}
                    </span>
                  </>
                )}
                {card.setName && (
                  <>
                    <span className={styles.separator}>•</span>
                    <span className={styles.count} aria-label={`Set: ${card.setName}`}>
                      {card.setName}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
