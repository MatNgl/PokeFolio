import { useEffect, useRef } from 'react';
import type { Card } from '@pokefolio/types';
import { Button } from '../ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './CardDetailsModal.module.css';

interface CardDetailsModalProps {
  card: Card;
  onClose: () => void;
  onAdd: (card: Card) => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export function CardDetailsModal({
  card,
  onClose,
  onAdd,
  onNavigatePrevious,
  onNavigateNext,
  hasPrevious,
  hasNext,
}: CardDetailsModalProps) {
  const dialogRef = useRef<HTMLElement>(null);

  // Focus auto dans le modal
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // Fermer avec ESC + navigation au clavier
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrevious && onNavigatePrevious) {
        e.preventDefault();
        onNavigatePrevious();
      } else if (e.key === 'ArrowRight' && hasNext && onNavigateNext) {
        e.preventDefault();
        onNavigateNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, onNavigatePrevious, onNavigateNext, hasPrevious, hasNext]);

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
    <div className={styles.overlay}>
      {/* Flèche gauche */}
      {hasPrevious && onNavigatePrevious && (
        <button
          className={styles.navBtnLeft}
          onClick={onNavigatePrevious}
          aria-label="Carte précédente"
          title="Carte précédente (←)"
        >
          <ChevronLeft size={28} />
        </button>
      )}

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
          <div className={styles.left}>
            <img
              src={getCardImageUrl(card)}
              alt={card.name}
              className={styles.image}
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.src = 'https://images.pokemontcg.io/swsh1/back.png';
              }}
            />
          </div>

          <div className={styles.right}>
            <h3 className={styles.name}>{card.name}</h3>

            <div className={styles.tags}>
              <span className={styles.tag}>
                {card.set?.name || card.id?.split('-')[0]?.toUpperCase() || 'Inconnue'}
              </span>
              {card.localId && (
                <span className={styles.tag}>
                  #{card.localId.padStart(3, '0')}
                  {(card.set?.cardCount?.total || card.set?.cardCount?.official) &&
                    `/${String(
                      card.set?.cardCount?.total || card.set?.cardCount?.official
                    ).padStart(2, '0')}`}
                </span>
              )}
              {card.rarity && <span className={styles.tag}>{card.rarity}</span>}
            </div>

            <section className={styles.block}>
              <h4 className={styles.blockTitle}>Informations de la carte</h4>
              <div className={styles.grid}>
                {card.category && (
                  <div className={styles.item}>
                    <span className={styles.label}>Type</span>
                    <span className={styles.value}>{card.category}</span>
                  </div>
                )}

                {card.types && card.types.length > 0 && (
                  <div className={styles.item}>
                    <span className={styles.label}>Éléments</span>
                    <span className={styles.value}>{card.types.join(', ')}</span>
                  </div>
                )}

                {card.hp && (
                  <div className={styles.item}>
                    <span className={styles.label}>HP</span>
                    <span className={styles.value}>{card.hp}</span>
                  </div>
                )}

                {card.stage && (
                  <div className={styles.item}>
                    <span className={styles.label}>Stade</span>
                    <span className={styles.value}>{card.stage}</span>
                  </div>
                )}

                {card.evolveFrom && (
                  <div className={styles.item}>
                    <span className={styles.label}>Évolue de</span>
                    <span className={styles.value}>{card.evolveFrom}</span>
                  </div>
                )}
              </div>
            </section>

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

      {/* Flèche droite */}
      {hasNext && onNavigateNext && (
        <button
          className={styles.navBtnRight}
          onClick={onNavigateNext}
          aria-label="Carte suivante"
          title="Carte suivante (→)"
        >
          <ChevronRight size={28} />
        </button>
      )}
    </div>
  );
}
