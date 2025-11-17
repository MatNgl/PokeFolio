import { useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CompleteSetCard } from '../../services/sets.service';
import styles from './SetCardDetailsModal.module.css';

type Props = {
  card: CompleteSetCard;
  setName: string;
  onClose: () => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
};

function resolveImageUrl(url?: string): string {
  if (!url) return 'https://images.pokemontcg.io/swsh1/back.png';
  if (url.includes('assets.tcgdex.net') && !url.match(/\.(webp|png|jpg|jpeg)$/i)) {
    return `${url}/high.webp`;
  }
  return url;
}

export default function SetCardDetailsModal({
  card,
  setName,
  onClose,
  onNavigatePrevious,
  onNavigateNext,
  hasPrevious,
  hasNext,
}: Props) {
  const dialogRef = useRef<HTMLElement>(null);

  // Bloquer le scroll du body quand le modal est ouvert
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Focus auto
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // ESC pour fermer + navigation au clavier
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onNavigatePrevious, onNavigateNext, hasPrevious, hasNext]);

  const imageUrl = resolveImageUrl(card.imageUrl);

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
        aria-labelledby="setCardDetailsTitle"
        tabIndex={-1}
      >
        <header className={styles.header}>
          <h2 id="setCardDetailsTitle">Détails de la carte</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>

        <div className={styles.content}>
          <div className={styles.left}>
            <img
              className={styles.image}
              src={imageUrl}
              alt={card.name || card.cardId}
              onError={(e) => {
                const t = e.currentTarget as HTMLImageElement;
                t.src = 'https://images.pokemontcg.io/swsh1/back.png';
              }}
            />
          </div>

          <div className={styles.right}>
            <h3 className={styles.name}>{card.name}</h3>

            <div className={styles.tags}>
              <span className={styles.tag}>{setName}</span>
              {card.number && <span className={styles.tag}>#{card.number}</span>}
              {card.rarity && <span className={styles.tag}>{card.rarity}</span>}
            </div>

            <section className={styles.block}>
              <h4 className={styles.blockTitle}>Statut dans votre collection</h4>
              {card.owned ? (
                <div className={styles.statusOwned}>
                  <span className={styles.statusIcon}>✓</span>
                  <span>Vous possédez cette carte</span>
                  {card.quantity > 1 && <span className={styles.quantity}>×{card.quantity}</span>}
                </div>
              ) : (
                <div className={styles.statusNotOwned}>
                  <span>Carte non possédée</span>
                </div>
              )}
            </section>
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
