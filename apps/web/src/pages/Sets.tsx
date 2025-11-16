import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setsService, type PortfolioSet } from '../services/sets.service';
import styles from './Sets.module.css';
import { Package } from 'lucide-react';

export default function Sets() {
  const navigate = useNavigate();
  const [showMissingCards, setShowMissingCards] = useState(false);

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['portfolio', 'sets'],
    queryFn: () => setsService.getSets(),
  });

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Chargement de vos sets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <p>Erreur lors du chargement des sets</p>
        </div>
      </div>
    );
  }

  const sets = data?.sets || [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Mes Sets</h1>
          <p className={styles.subtitle}>
            Consultez votre collection organisée par sets
          </p>
        </div>
        <div className={styles.headerActions}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showMissingCards}
              onChange={(e) => setShowMissingCards(e.target.checked)}
              className={styles.toggleInput}
            />
            <span>Afficher les cartes manquantes</span>
          </label>
        </div>
      </header>

      {sets.length === 0 ? (
        <div className={styles.emptyState}>
          <Package className={styles.emptyIcon} />
          <p className={styles.emptyText}>Aucun set dans votre collection</p>
          <p className={styles.emptyHint}>Ajoutez des cartes pour commencer</p>
        </div>
      ) : (
        <div className={styles.setsGrid}>
          {sets.map((set: PortfolioSet) => (
            <div
              key={set.setId}
              className={styles.setCard}
              onClick={() => navigate(`/sets/${set.setId}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  navigate(`/sets/${set.setId}`);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className={styles.setHeader}>
                <h3 className={styles.setName}>{set.setName || 'Set inconnu'}</h3>
                {set.completion.percentage !== undefined && (
                  <span className={styles.completionBadge}>
                    {set.completion.percentage}%
                  </span>
                )}
              </div>

              <div className={styles.setStats}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Cartes</span>
                  <span className={styles.statValue}>
                    {set.completion.owned}
                    {set.completion.total && ` / ${set.completion.total}`}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Quantité</span>
                  <span className={styles.statValue}>{set.totalQuantity || 0}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Valeur</span>
                  <span className={styles.statValue}>{set.totalValue.toFixed(2)}€</span>
                </div>
              </div>

              {set.completion.total && (
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${set.completion.percentage || 0}%` }}
                  />
                </div>
              )}

              <div className={styles.cardPreview}>
                {set.cards.slice(0, 4).map((card) => (
                  <div key={card.itemId} className={styles.previewCard}>
                    {card.imageUrl && (
                      <img
                        src={card.imageUrl}
                        alt={card.name || card.cardId}
                        className={styles.previewImage}
                      />
                    )}
                  </div>
                ))}
                {set.cards.length > 4 && (
                  <div className={styles.moreCards}>
                    +{set.cards.length - 4}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
