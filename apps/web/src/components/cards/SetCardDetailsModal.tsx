import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CompleteSetCard } from '../../services/sets.service';
import { portfolioService, type PortfolioCard } from '../../services/portfolio.service';
import GradedCardFrame from '../grading/GradedCardFrame';
import CardPriceChart from '../pricing/CardPriceChart';
import { Loader } from '../ui/FullScreenLoader';
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

type PortfolioVariant = {
  purchasePrice?: number;
  purchaseDate?: string | Date;
  isGraded?: boolean;
  gradeCompany?: string;
  gradeScore?: string | number;
  notes?: string;
};

type PortfolioCardWithVariants = PortfolioCard & {
  variants?: PortfolioVariant[];
};

function resolveImageUrl(url?: string): string {
  if (!url) return 'https://images.pokemontcg.io/swsh1/back.png';
  if (url.includes('assets.tcgdex.net') && !url.match(/\.(webp|png|jpg|jpeg)$/i)) {
    return `${url}/high.webp`;
  }
  return url;
}

function euro(n?: number | null) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  return `${n.toFixed(2)} €`;
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
  const [portfolioEntry, setPortfolioEntry] = useState<PortfolioCard | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Fetch portfolio data pour cette carte
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const allCards = await portfolioService.getCards();
        // Chercher la carte correspondante par cardId
        const found = allCards.find((c) => c.cardId === card.cardId);
        if (mounted) setPortfolioEntry(found || null);
      } catch (error) {
        console.error('Erreur lors de la récupération du portfolio:', error);
        if (mounted) setPortfolioEntry(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [card.cardId]);

  const imageUrl = resolveImageUrl(card.imageUrl);

  // Gérer les variantes vs mode simple
  const entryWithVariants = portfolioEntry as PortfolioCardWithVariants;
  const hasVariants =
    entryWithVariants?.variants &&
    Array.isArray(entryWithVariants.variants) &&
    entryWithVariants.variants.length > 0;
  const variants = hasVariants ? entryWithVariants.variants : null;

  const qty = portfolioEntry?.quantity ?? 0;
  const unit = portfolioEntry?.purchasePrice ?? null;

  // Calculer le prix total en fonction des variantes ou du mode simple
  let total: number | null = null;
  if (hasVariants && variants) {
    total = variants.reduce((sum: number, v: PortfolioVariant) => {
      const price = v.purchasePrice ?? 0;
      return sum + price;
    }, 0);
  } else if (typeof unit === 'number') {
    total = unit * qty;
  }

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

        {loading ? (
          <div className={styles.loading}>
            <Loader />
          </div>
        ) : (
          <div className={styles.content}>
            <div className={styles.left}>
              {portfolioEntry?.isGraded && portfolioEntry.gradeCompany && portfolioEntry.gradeScore ? (
                <GradedCardFrame
                  company={
                    portfolioEntry.gradeCompany as
                      | 'PSA'
                      | 'BGS'
                      | 'CGC'
                      | 'PCA'
                      | 'CollectAura'
                      | 'AGS'
                      | 'CCC'
                      | 'SGC'
                      | 'TAG'
                      | 'Other'
                  }
                  grade={portfolioEntry.gradeScore}
                  size="large"
                >
                  <img
                    className={styles.image}
                    src={imageUrl}
                    alt={card.name || card.cardId}
                    onError={(e) => {
                      const t = e.currentTarget as HTMLImageElement;
                      t.src = 'https://images.pokemontcg.io/swsh1/back.png';
                    }}
                  />
                </GradedCardFrame>
              ) : (
                <img
                  className={styles.image}
                  src={imageUrl}
                  alt={card.name || card.cardId}
                  onError={(e) => {
                    const t = e.currentTarget as HTMLImageElement;
                    t.src = 'https://images.pokemontcg.io/swsh1/back.png';
                  }}
                />
              )}
            </div>

            <div className={styles.right}>
              <h3 className={styles.name}>{card.name}</h3>

              <div className={styles.tags}>
                <span className={styles.tag}>{setName}</span>
                {card.number && <span className={styles.tag}>#{card.number}</span>}
                {card.rarity && <span className={styles.tag}>{card.rarity}</span>}
              </div>

              {/* Si la carte est possédée */}
              {portfolioEntry ? (
                <>
                  {/* Carte unique (quantité = 1) */}
                  {qty === 1 && !hasVariants ? (
                    <section className={styles.block}>
                      <h4 className={styles.blockTitle}>Informations de la carte</h4>
                      <div className={styles.grid}>
                        {portfolioEntry.purchaseDate && (
                          <div className={styles.item}>
                            <span className={styles.label}>Date d&apos;achat</span>
                            <span className={styles.value}>
                              {new Date(portfolioEntry.purchaseDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {unit !== null && (
                          <div className={styles.item}>
                            <span className={styles.label}>Prix d&apos;achat</span>
                            <span className={styles.value}>{euro(unit)}</span>
                          </div>
                        )}
                        {portfolioEntry.isGraded && (
                          <>
                            {portfolioEntry.gradeCompany && (
                              <div className={styles.item}>
                                <span className={styles.label}>Société de gradation</span>
                                <span className={styles.value}>{portfolioEntry.gradeCompany}</span>
                              </div>
                            )}
                            {typeof portfolioEntry.gradeScore !== 'undefined' && (
                              <div className={styles.item}>
                                <span className={styles.label}>Note</span>
                                <span className={styles.value}>{portfolioEntry.gradeScore}</span>
                              </div>
                            )}
                          </>
                        )}
                        {portfolioEntry.notes && (
                          <div className={styles.item} style={{ gridColumn: '1 / -1' }}>
                            <span className={styles.label}>Notes</span>
                            <p className={styles.noteText}>{portfolioEntry.notes}</p>
                          </div>
                        )}
                      </div>
                    </section>
                  ) : (
                    /* Cartes multiples (quantité >= 2) */
                    <>
                      {/* Box résumé en haut */}
                      <section className={styles.summaryBlock}>
                        <h4 className={styles.blockTitle}>Résumé</h4>
                        <div className={styles.summaryGrid}>
                          <div className={styles.summaryItem}>
                            <span className={styles.label}>Nombre de cartes</span>
                            <span className={styles.value}>{qty}</span>
                          </div>
                          <div className={styles.summaryItem}>
                            <span className={styles.label}>Prix total d&apos;achat</span>
                            <span className={styles.value}>{euro(total ?? undefined)}</span>
                          </div>
                        </div>
                      </section>

                      {/* Variantes différentes */}
                      {hasVariants && variants ? (
                        <section className={styles.block}>
                          <h4 className={styles.blockTitle}>Détails des variantes</h4>
                          {variants.map((v: PortfolioVariant, i: number) => (
                            <div key={i} className={styles.variantCard}>
                              <div className={styles.variantHeader}>
                                <span className={styles.variantTitle}>Variante #{i + 1}</span>
                              </div>
                              <div className={styles.grid}>
                                {v.purchaseDate && (
                                  <div className={styles.item}>
                                    <span className={styles.label}>Date d&apos;achat</span>
                                    <span className={styles.value}>
                                      {new Date(v.purchaseDate).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                                {v.purchasePrice !== undefined && (
                                  <div className={styles.item}>
                                    <span className={styles.label}>Prix d&apos;achat</span>
                                    <span className={styles.value}>{euro(v.purchasePrice)}</span>
                                  </div>
                                )}
                                {v.isGraded && (
                                  <>
                                    {v.gradeCompany && (
                                      <div className={styles.item}>
                                        <span className={styles.label}>Société de gradation</span>
                                        <span className={styles.value}>{v.gradeCompany}</span>
                                      </div>
                                    )}
                                    {v.gradeScore !== undefined && (
                                      <div className={styles.item}>
                                        <span className={styles.label}>Note</span>
                                        <span className={styles.value}>{v.gradeScore}</span>
                                      </div>
                                    )}
                                  </>
                                )}
                                {v.notes && (
                                  <div className={styles.item} style={{ gridColumn: '1 / -1' }}>
                                    <span className={styles.label}>Notes</span>
                                    <p className={styles.noteText}>{v.notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </section>
                      ) : (
                        /* Mode simple sans variantes mais quantité > 1 */
                        <section className={styles.block}>
                          <h4 className={styles.blockTitle}>Informations</h4>
                          <div className={styles.grid}>
                            {unit !== null && (
                              <div className={styles.item}>
                                <span className={styles.label}>Prix unitaire</span>
                                <span className={styles.value}>{euro(unit)}</span>
                              </div>
                            )}
                            {portfolioEntry.purchaseDate && (
                              <div className={styles.item}>
                                <span className={styles.label}>Date d&apos;achat</span>
                                <span className={styles.value}>
                                  {new Date(portfolioEntry.purchaseDate).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {portfolioEntry.isGraded && (
                              <>
                                {portfolioEntry.gradeCompany && (
                                  <div className={styles.item}>
                                    <span className={styles.label}>Société de gradation</span>
                                    <span className={styles.value}>
                                      {portfolioEntry.gradeCompany}
                                    </span>
                                  </div>
                                )}
                                {typeof portfolioEntry.gradeScore !== 'undefined' && (
                                  <div className={styles.item}>
                                    <span className={styles.label}>Note</span>
                                    <span className={styles.value}>{portfolioEntry.gradeScore}</span>
                                  </div>
                                )}
                              </>
                            )}
                            {portfolioEntry.notes && (
                              <div className={styles.item} style={{ gridColumn: '1 / -1' }}>
                                <span className={styles.label}>Notes</span>
                                <p className={styles.noteText}>{portfolioEntry.notes}</p>
                              </div>
                            )}
                          </div>
                        </section>
                      )}
                    </>
                  )}
                </>
              ) : (
                /* Carte non possédée */
                <section className={styles.block}>
                  <h4 className={styles.blockTitle}>Statut dans votre collection</h4>
                  <div className={styles.statusNotOwned}>
                    <span>Carte non possédée</span>
                  </div>
                </section>
              )}

              {/* Évolution des prix */}
              {card.cardId && <CardPriceChart cardId={card.cardId} />}
            </div>
          </div>
        )}
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
