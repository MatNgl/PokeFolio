import { useEffect, useRef } from 'react';
import type { Card } from '@pokefolio/types';
import { Button } from '../ui/Button';
import styles from './CardDetailsModal.module.css';

interface CardDetailsModalProps {
  card: Card;
  onClose: () => void;
  onAdd: (card: Card) => void;
}

export function CardDetailsModal({ card, onClose, onAdd }: CardDetailsModalProps) {
  const dialogRef = useRef<HTMLElement>(null);

  // Focus auto dans le modal
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // Fermer avec ESC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const getCardImageUrl = (cardData: Card): string => {
    let img = cardData.image || cardData.images?.large || cardData.images?.small || '';

    // Si l'URL provient de assets.tcgdex.net et n'a pas d'extension, ajouter /high.webp
    if (img && img.includes('assets.tcgdex.net') && !img.match(/\.(webp|png|jpg|jpeg)$/i)) {
      img = `${img}/high.webp`;
    }

    return img || 'https://images.pokemontcg.io/swsh1/back.png';
  };

  // Accessibilité overlay
  const handleOverlayKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ' && e.target === e.currentTarget) {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleOverlayKeyDown}
      role="button"
      aria-label="Fermer la fenêtre modale"
      tabIndex={0}
    >
      <section
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cardDetailsTitle"
        tabIndex={-1}
      >
        <div className={styles.header}>
          <h2 id="cardDetailsTitle">Détails de la carte</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.imageSection}>
            <img
              src={getCardImageUrl(card)}
              alt={card.name}
              className={styles.cardImage}
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.src = 'https://images.pokemontcg.io/swsh1/back.png';
              }}
            />
          </div>

          <div className={styles.infoSection}>
            <h3 className={styles.cardName}>{card.name}</h3>

            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Série</span>
                <span className={styles.infoValue}>
                  {card.set?.name || card.id?.split('-')[0]?.toUpperCase() || 'Inconnue'}
                </span>
              </div>

              {card.localId && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Numéro</span>
                  <span className={styles.infoValue}>
                    {card.localId.padStart(3, '0')}
                    {(card.set?.cardCount?.total || card.set?.cardCount?.official) &&
                      `/${String(
                        card.set?.cardCount?.total || card.set?.cardCount?.official
                      ).padStart(2, '0')}`}
                  </span>
                </div>
              )}

              {card.rarity && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Rareté</span>
                  <span className={styles.infoValue}>{card.rarity}</span>
                </div>
              )}

              {card.category && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Type</span>
                  <span className={styles.infoValue}>{card.category}</span>
                </div>
              )}

              {card.types && card.types.length > 0 && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Éléments</span>
                  <span className={styles.infoValue}>{card.types.join(', ')}</span>
                </div>
              )}

              {card.hp && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>HP</span>
                  <span className={styles.infoValue}>{card.hp}</span>
                </div>
              )}

              {card.stage && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Stade</span>
                  <span className={styles.infoValue}>{card.stage}</span>
                </div>
              )}

              {card.evolveFrom && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Évolue de</span>
                  <span className={styles.infoValue}>{card.evolveFrom}</span>
                </div>
              )}
            </div>

            <div className={styles.actions}>
              <Button variant="secondary" onClick={onClose}>
                Fermer
              </Button>
              <Button
                onClick={() => {
                  onAdd(card);
                  onClose();
                }}
              >
                + Ajouter au portfolio
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
