import { useEffect, useRef, useState } from 'react';
import type { Card } from '@pokefolio/types';
import type { PortfolioCard } from '../../services/portfolio.service';
import { cardsService } from '../../services/cards.service';
import { portfolioService } from '../../services/portfolio.service';
import { Button } from '../ui/Button';
import { Loader } from '../ui/FullScreenLoader';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './PortfolioCardDetailsModal.module.css';
import GradedCardFrame from '../grading/GradedCardFrame';
import CardPriceChart from '../pricing/CardPriceChart';

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

type Props = {
  entry: PortfolioCard;
  onClose: () => void;
  onEdit: (entry: PortfolioCard) => void;
  onDelete: (entry: PortfolioCard) => void;
  onRefresh?: () => void;
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
};

function euro(n?: number | null) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  return `${n.toFixed(2)} €`;
}

function withHiRes(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.includes('assets.tcgdex.net') && !url.match(/\.(webp|png|jpg|jpeg)$/i)) {
    return `${url}/high.webp`;
  }
  return url;
}

export default function PortfolioCardDetailsModal({
  entry,
  onClose,
  onEdit,
  onDelete,
  onRefresh,
  onToast,
  onNavigatePrevious,
  onNavigateNext,
  hasPrevious = false,
  hasNext = false,
}: Props) {
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingVariant, setDeletingVariant] = useState<number | null>(null);
  const dialogRef = useRef<HTMLElement>(null);

  const handleDeleteVariant = async (variantIndex: number) => {
    if (!entry._id && !entry.id) return;
    const itemId = (entry._id || entry.id) as string;

    try {
      setDeletingVariant(variantIndex);
      const result = await portfolioService.deleteVariant(itemId, variantIndex);

      // Si result est null, la carte a été complètement supprimée
      if (result === null || (result as any).deleted) {
        if (onToast) onToast('Variante supprimée avec succès (dernière variante)', 'success');
      } else {
        // Sinon, variante supprimée avec succès
        if (onToast) onToast('Variante supprimée avec succès', 'success');
      }

      // Toujours fermer le modal et rafraîchir pour voir les changements
      onClose();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Erreur lors de la suppression de la variante:', error);
      if (onToast) {
        onToast('Erreur lors de la suppression de la variante', 'error');
      } else {
        alert('Erreur lors de la suppression de la variante');
      }
    } finally {
      setDeletingVariant(null);
    }
  };

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

  // ESC pour fermer, flèches pour naviguer
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

  // Fetch des métadonnées TCG
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await cardsService.getCardById(entry.cardId);
        if (mounted) setCard(data ?? null);
      } catch {
        if (mounted) setCard(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [entry.cardId]);

  const title = card?.name || entry.name;
  const setLabel =
    card?.set?.name || entry.setName || card?.id?.split('-')[0]?.toUpperCase() || 'Set inconnu';
  const number = entry.number ?? card?.localId ?? '—';
  const rarity = entry.rarity ?? card?.rarity;

  const imageHi =
    withHiRes(entry.imageUrlHiRes) ||
    withHiRes(card?.images?.large) ||
    withHiRes(card?.image) ||
    entry.imageUrl ||
    card?.images?.small ||
    'https://images.pokemontcg.io/swsh1/back.png';

  // Gérer les variantes vs mode simple
  const entryWithVariants = entry as PortfolioCardWithVariants;
  const hasVariants =
    entryWithVariants.variants &&
    Array.isArray(entryWithVariants.variants) &&
    entryWithVariants.variants.length > 0;
  const variants = hasVariants ? entryWithVariants.variants : null;

  const qty = entry.quantity ?? 0;
  const unit = entry.purchasePrice ?? null;

  // Calculer le prix total en fonction des variantes ou du mode simple
  let total: number | null = null;
  if (hasVariants && variants) {
    // Somme des prix de toutes les variantes
    total = variants.reduce((sum: number, v: PortfolioVariant) => {
      const price = v.purchasePrice ?? 0;
      return sum + price;
    }, 0);
  } else if (typeof unit === 'number') {
    // Mode simple : prix unitaire × quantité
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
        aria-labelledby="portfolioCardDetailsTitle"
        tabIndex={-1}
      >
        <header className={styles.header}>
          <h2 id="portfolioCardDetailsTitle">Détails de la carte</h2>
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
              {entry.isGraded && entry.gradeCompany && entry.gradeScore ? (
                <GradedCardFrame
                  company={entry.gradeCompany as any}
                  grade={entry.gradeScore}
                  size="large"
                >
                  <img
                    className={styles.image}
                    src={imageHi}
                    alt={title}
                    onError={(e) => {
                      const t = e.currentTarget as HTMLImageElement;
                      t.src = 'https://images.pokemontcg.io/swsh1/back.png';
                    }}
                  />
                </GradedCardFrame>
              ) : (
                <img
                  className={styles.image}
                  src={imageHi}
                  alt={title}
                  onError={(e) => {
                    const t = e.currentTarget as HTMLImageElement;
                    t.src = 'https://images.pokemontcg.io/swsh1/back.png';
                  }}
                />
              )}
            </div>

            <div className={styles.right}>
              {/* --- En-tête : nom et série --- */}
              <h3 className={styles.name}>{title}</h3>
              <div className={styles.tags}>
                <span className={styles.tag}>{setLabel}</span>
                <span className={styles.tag}>#{number}</span>
                {rarity && <span className={styles.tag}>{rarity}</span>}
              </div>

              {/* --- Carte unique (quantité = 1) --- */}
              {qty === 1 && !hasVariants ? (
                <section className={styles.block}>
                  <h4 className={styles.blockTitle}>Informations de la carte</h4>
                  <div className={styles.grid}>
                    {entry.purchaseDate && (
                      <div className={styles.item}>
                        <span className={styles.label}>Date d&apos;achat</span>
                        <span className={styles.value}>
                          {new Date(entry.purchaseDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {unit !== null && (
                      <div className={styles.item}>
                        <span className={styles.label}>Prix d&apos;achat</span>
                        <span className={styles.value}>{euro(unit)}</span>
                      </div>
                    )}
                    {entry.isGraded && (
                      <>
                        {entry.gradeCompany && (
                          <div className={styles.item}>
                            <span className={styles.label}>Société de gradation</span>
                            <span className={styles.value}>{entry.gradeCompany}</span>
                          </div>
                        )}
                        {typeof entry.gradeScore !== 'undefined' && (
                          <div className={styles.item}>
                            <span className={styles.label}>Note</span>
                            <span className={styles.value}>{entry.gradeScore}</span>
                          </div>
                        )}
                      </>
                    )}
                    {entry.notes && (
                      <div className={styles.item} style={{ gridColumn: '1 / -1' }}>
                        <span className={styles.label}>Notes</span>
                        <p className={styles.noteText}>{entry.notes}</p>
                      </div>
                    )}
                  </div>
                </section>
              ) : (
                /* --- Cartes multiples (quantité >= 2) --- */
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
                          <button
                            type="button"
                            className={styles.deleteVariantBtn}
                            onClick={() => handleDeleteVariant(i)}
                            disabled={deletingVariant === i}
                            aria-label={`Supprimer la variante #${i + 1}`}
                            title={`Supprimer la variante #${i + 1}`}
                          >
                            <Trash2 size={18} />
                          </button>
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
                        {entry.purchaseDate && (
                          <div className={styles.item}>
                            <span className={styles.label}>Date d&apos;achat</span>
                            <span className={styles.value}>
                              {new Date(entry.purchaseDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {entry.isGraded && (
                          <>
                            {entry.gradeCompany && (
                              <div className={styles.item}>
                                <span className={styles.label}>Société de gradation</span>
                                <span className={styles.value}>{entry.gradeCompany}</span>
                              </div>
                            )}
                            {typeof entry.gradeScore !== 'undefined' && (
                              <div className={styles.item}>
                                <span className={styles.label}>Note</span>
                                <span className={styles.value}>{entry.gradeScore}</span>
                              </div>
                            )}
                          </>
                        )}
                        {entry.notes && (
                          <div className={styles.item} style={{ gridColumn: '1 / -1' }}>
                            <span className={styles.label}>Notes</span>
                            <p className={styles.noteText}>{entry.notes}</p>
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                </>
              )}

              {/* --- Évolution des prix --- */}
              {entry.cardId && <CardPriceChart cardId={entry.cardId} />}

              {/* --- Actions --- */}
              <div className={styles.actions}>
                <Button variant="secondary" onClick={() => onEdit(entry)}>
                  Modifier
                </Button>
                <Button
                  variant="danger"
                  onClick={() => onDelete(entry)}
                >
                  Supprimer
                </Button>
                <Button onClick={onClose}>Fermer</Button>
              </div>
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
