import { useEffect, useRef, useState } from 'react';
import type { Card } from '@pokefolio/types';
import type { PortfolioCard } from '../../services/portfolio.service';
import { cardsService } from '../../services/cards.service';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import styles from './PortfolioCardDetailsModal.module.css';

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
};

type GroupedVariant = {
  variant: PortfolioVariant;
  count: number;
};

function euro(n?: number | null) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  return `${n.toFixed(2)} €`;
}

/**
 * Groupe les variantes identiques ensemble
 * Deux variantes sont identiques si elles ont les mêmes propriétés
 */
function groupVariants(variants: PortfolioVariant[]): GroupedVariant[] {
  const grouped: GroupedVariant[] = [];

  for (const variant of variants) {
    // Chercher si une variante identique existe déjà
    const existing = grouped.find((g) => {
      const v = g.variant;
      return (
        v.purchasePrice === variant.purchasePrice &&
        v.purchaseDate === variant.purchaseDate &&
        v.isGraded === variant.isGraded &&
        v.gradeCompany === variant.gradeCompany &&
        v.gradeScore === variant.gradeScore &&
        v.notes === variant.notes
      );
    });

    if (existing) {
      existing.count += 1;
    } else {
      grouped.push({ variant, count: 1 });
    }
  }

  return grouped;
}

function withHiRes(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.includes('assets.tcgdex.net') && !url.match(/\.(webp|png|jpg|jpeg)$/i)) {
    return `${url}/high.webp`;
  }
  return url;
}

export default function PortfolioCardDetailsModal({ entry, onClose, onEdit, onDelete }: Props) {
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const dialogRef = useRef<HTMLElement>(null);

  // Focus auto
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // ESC pour fermer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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

  // Overlay: close on click backdrop
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick} aria-hidden="true">
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
              <img
                className={styles.image}
                src={imageHi}
                alt={title}
                onError={(e) => {
                  const t = e.currentTarget as HTMLImageElement;
                  t.src = 'https://images.pokemontcg.io/swsh1/back.png';
                }}
              />
            </div>

            <div className={styles.right}>
              {/* --- Bloc Résumé (si variantes, sinon header simple) --- */}
              {hasVariants ? (
                <section className={styles.summaryBlock}>
                  <h4 className={styles.blockTitle}>Résumé</h4>
                  <div className={styles.summaryGrid}>
                    <div className={styles.summaryItem}>
                      <span className={styles.label}>Carte</span>
                      <span className={styles.value}>{title}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.label}>Série</span>
                      <span className={styles.value}>
                        {setLabel} · #{number}
                      </span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.label}>Nombre de cartes</span>
                      <span className={styles.value}>{qty}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.label}>Prix total</span>
                      <span className={styles.value}>{euro(total ?? undefined)}</span>
                    </div>
                    {rarity && (
                      <div className={styles.summaryItem}>
                        <span className={styles.label}>Rareté</span>
                        <span className={styles.value}>{rarity}</span>
                      </div>
                    )}
                  </div>
                </section>
              ) : (
                <>
                  <h3 className={styles.name}>{title}</h3>
                  <div className={styles.tags}>
                    <span className={styles.tag}>{setLabel}</span>
                    <span className={styles.tag}>#{number}</span>
                    {rarity && <span className={styles.tag}>{rarity}</span>}
                  </div>
                </>
              )}

              {/* --- Variantes détaillées --- */}
              {hasVariants && variants ? (
                <section className={styles.block}>
                  <h4 className={styles.blockTitle}>Variantes de la carte</h4>
                  {groupVariants(variants).map((group: GroupedVariant, i: number) => {
                    const v = group.variant;
                    const count = group.count;
                    return (
                      <div key={i} className={styles.variantCard}>
                        <div className={styles.variantHeader}>
                          <span className={styles.variantTitle}>
                            {count > 1 ? `${count} cartes identiques` : `Carte #${i + 1}`}
                          </span>
                        </div>
                        <div className={styles.grid}>
                          {v.purchasePrice !== undefined && (
                            <div className={styles.item}>
                              <span className={styles.label}>Prix d&apos;achat unitaire</span>
                              <span className={styles.value}>{euro(v.purchasePrice)}</span>
                            </div>
                          )}
                          {count > 1 && v.purchasePrice !== undefined && (
                            <div className={styles.item}>
                              <span className={styles.label}>Prix total (×{count})</span>
                              <span className={styles.value}>{euro(v.purchasePrice * count)}</span>
                            </div>
                          )}
                          {v.purchaseDate && (
                            <div className={styles.item}>
                              <span className={styles.label}>Date d&apos;achat</span>
                              <span className={styles.value}>
                                {new Date(v.purchaseDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {v.isGraded && (
                            <>
                              <div className={styles.item}>
                                <span className={styles.label}>Gradée</span>
                                <span className={styles.value}>Oui</span>
                              </div>
                              {v.gradeCompany && (
                                <div className={styles.item}>
                                  <span className={styles.label}>Société</span>
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
                    );
                  })}
                </section>
              ) : (
                /* --- Bloc Portfolio (mode simple) --- */
                <section className={styles.block}>
                  <h4 className={styles.blockTitle}>Dans votre portfolio</h4>
                  <div className={styles.grid}>
                    <div className={styles.item}>
                      <span className={styles.label}>Quantité</span>
                      <span className={styles.value}>{qty}</span>
                    </div>
                    <div className={styles.item}>
                      <span className={styles.label}>Prix d&apos;achat (unitaire)</span>
                      <span className={styles.value}>{euro(unit)}</span>
                    </div>
                    <div className={styles.item}>
                      <span className={styles.label}>Total dépensé</span>
                      <span className={styles.value}>{euro(total ?? undefined)}</span>
                    </div>
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
                        <div className={styles.item}>
                          <span className={styles.label}>Gradée</span>
                          <span className={styles.value}>Oui</span>
                        </div>
                        {entry.gradeCompany && (
                          <div className={styles.item}>
                            <span className={styles.label}>Société</span>
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
                    {entry.currentValue !== undefined && (
                      <div className={styles.item}>
                        <span className={styles.label}>Valeur estimée</span>
                        <span className={styles.value}>{euro(entry.currentValue)}</span>
                      </div>
                    )}
                  </div>

                  {entry.notes && (
                    <div className={styles.notes}>
                      <span className={styles.label}>Notes</span>
                      <p className={styles.noteText}>{entry.notes}</p>
                    </div>
                  )}
                </section>
              )}

              {/* --- Actions --- */}
              <div className={styles.actions}>
                <Button variant="secondary" onClick={() => onEdit(entry)}>
                  Modifier
                </Button>
                <Button
                  variant="secondary"
                  className={styles.dangerBtn}
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
    </div>
  );
}
