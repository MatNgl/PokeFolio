import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Card } from '@pokefolio/types';
import { cardsService } from '../../services/cards.service';
import { portfolioService } from '../../services/portfolio.service';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { DatePicker } from '../ui/DatePicker';
import { Toast } from '../ui/Toast';
import styles from './AddCardModal.module.css';

interface AddCardModalProps {
  onClose: () => void;
  onSuccess: () => void;
  card?: Card; // Carte pré-sélectionnée (optionnel)
}

type VariantForm = {
  isGraded?: boolean;
  gradeCompany?: string;
  gradeScore?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  notes?: string;
};

interface FormData {
  quantity: number;
  sameForAll: boolean;
  isGraded: boolean;
  gradeCompany?: string;
  gradeScore?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  notes?: string;
  variants?: VariantForm[];
}

// Sociétés de gradation et leurs barèmes
const GRADING_COMPANIES = [
  { id: 'PSA', name: 'PSA', grades: ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1'] },
  {
    id: 'PCA',
    name: 'PCA (Pokémon Card Authentication)',
    grades: ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5'],
  },
  {
    id: 'COLLECT_AURA',
    name: 'Collect Aura',
    grades: ['10+', '10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6'],
  },
  {
    id: 'CGC',
    name: 'CGC (Certified Guaranty Company)',
    grades: ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5'],
  },
  {
    id: 'BGS',
    name: 'BGS (Beckett Grading Services)',
    grades: ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5'],
  },
  {
    id: 'AGS',
    name: 'AGS (ACE Grading)',
    grades: ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5'],
  },
  {
    id: 'CCC',
    name: 'CCC (Certified Collectibles Group)',
    grades: ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5'],
  },
  {
    id: 'SGC',
    name: 'SGC (Sportscard Guaranty)',
    grades: ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5'],
  },
  {
    id: 'TAG',
    name: 'TAG (The Authentication Group)',
    grades: ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5'],
  },
  {
    id: 'MNT',
    name: 'MNT (Mint Grading)',
    grades: ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5'],
  },
] as const;

export function AddCardModal({ onClose, onSuccess, card }: AddCardModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(card || null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { register, handleSubmit, watch, setValue } = useForm<FormData>({
    defaultValues: { quantity: 1, isGraded: false, variants: [] },
  });

  const quantity = watch('quantity');
  const selectedCompany = watch('gradeCompany');

  // Focus auto dans le modal
  const dialogRef = useRef<HTMLElement>(null);

  // Initialiser automatiquement les variantes quand quantity >= 2
  useEffect(() => {
    const currentQuantity = quantity ?? 1;
    const currentVariants = watch('variants') ?? [];

    // Si quantity >= 2, s'assurer qu'on a le bon nombre de variantes
    if (currentQuantity >= 2) {
      if (currentVariants.length !== currentQuantity) {
        setValue(
          'variants',
          Array.from(
            { length: currentQuantity },
            (_, i) => currentVariants[i] || ({} as VariantForm)
          ),
          { shouldDirty: true }
        );
      }
    } else {
      // Si quantity === 1, vider les variantes
      if (currentVariants.length > 0) {
        setValue('variants', [], { shouldDirty: true });
      }
    }
  }, [quantity, setValue, watch]);

  // Bloquer le scroll du body quand le modal est ouvert
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // Fermer avec ESC (listener global)
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

  // Enregistrer purchaseDate pour pouvoir le piloter via setValue
  useEffect(() => {
    register('purchaseDate');
  }, [register]);

  const getCardImageUrl = (card: Card): string => {
    let img = card.image || card.images?.small || '';

    // Si l'URL provient de assets.tcgdex.net et n'a pas d'extension, ajouter /high.webp
    if (img && img.includes('assets.tcgdex.net') && !img.match(/\.(webp|png|jpg|jpeg)$/i)) {
      img = `${img}/high.webp`;
    }

    // Image de dos de carte Pokémon par défaut
    return img || 'https://images.pokemontcg.io/swsh1/back.png';
  };

  // Recherche dynamique
  const handleSearchChange = async (value: string) => {
    setSearchQuery(value);
    if (value.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      const result = await cardsService.searchCards({ q: value, limit: 20 });
      setSearchResults(result.cards);
    } catch (error) {
      console.error('Erreur de recherche:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!searchQuery.trim()) return;
    await handleSearchChange(searchQuery);
  };

  const handleSelectCard = (card: Card) => {
    setSelectedCard(card);
    setSearchResults([]);
    setSearchQuery('');
  };

  const onSubmit = async (data: FormData) => {
    if (!selectedCard) return;
    setSaving(true);
    try {
      // Récupérer les détails complets de la carte pour avoir le set.name
      let cardDetails = selectedCard;
      if (!selectedCard.set?.name) {
        try {
          const fullCard = await cardsService.getCardById(selectedCard.id);
          if (fullCard) {
            cardDetails = fullCard;
          }
        } catch (err) {
          console.warn('Could not fetch full card details:', err);
        }
      }

      // Construire les données pour l'API portfolio
      // Note: Les prix sont stockés en EUROS (float accepté: ex. 149.99)
      interface PortfolioApiPayload {
        // Champs obligatoires
        cardId: string;
        language: string;
        // Métadonnées de la carte (pour affichage)
        name?: string;
        setId?: string;
        setName?: string;
        number?: string;
        setCardCount?: number;
        rarity?: string;
        imageUrl?: string;
        imageUrlHiRes?: string;
        types?: string[];
        supertype?: string;
        subtypes?: string[];
        // Données utilisateur
        quantity?: number;
        booster?: boolean;
        graded?: boolean;
        grading?: {
          company?: string;
          grade?: string;
        };
        purchasePrice?: number; // En euros (float)
        purchaseDate?: string;
        notes?: string;
        // Variantes (pour quantity >= 2)
        variants?: Array<{
          purchasePrice?: number;
          purchaseDate?: string;
          booster?: boolean;
          graded?: boolean;
          grading?: {
            company?: string;
            grade?: string;
          };
          notes?: string;
        }>;
      }

      const portfolioData: PortfolioApiPayload = {
        // Champs obligatoires
        cardId: cardDetails.id,
        language: 'fr', // Langue par défaut (requis par le backend)
        // Métadonnées de la carte
        name: cardDetails.name,
        setId: cardDetails.set?.id,
        setName: cardDetails.set?.name,
        number: cardDetails.localId,
        setCardCount: cardDetails.set?.cardCount?.total || cardDetails.set?.cardCount?.official,
        rarity: cardDetails.rarity,
        imageUrl: cardDetails.image || cardDetails.images?.small,
        imageUrlHiRes: cardDetails.images?.large,
        types: cardDetails.types,
        supertype: cardDetails.category,
        subtypes: cardDetails.stage ? [cardDetails.stage] : undefined,
      };

      // Mode variantes si quantity >= 2
      if (data.quantity >= 2 && data.variants && data.variants.length > 0) {
        portfolioData.variants = data.variants.map((v) => ({
          purchasePrice: v.purchasePrice,
          purchaseDate: v.purchaseDate,
          graded: v.isGraded,
          grading:
            v.isGraded && (v.gradeCompany || v.gradeScore)
              ? {
                  company: v.gradeCompany,
                  grade: v.gradeScore?.toString(),
                }
              : undefined,
          notes: v.notes,
        }));
      } else {
        // Mode simple (quantité = 1 ou pas de variantes)
        portfolioData.quantity = data.quantity || 1;

        // Ajouter les champs optionnels seulement s'ils sont définis
        if (data.isGraded) {
          portfolioData.graded = true;
          if (data.gradeCompany || data.gradeScore) {
            portfolioData.grading = {
              company: data.gradeCompany,
              grade: data.gradeScore?.toString(),
            };
          }
        }
        if (data.purchasePrice !== undefined && data.purchasePrice !== null) {
          portfolioData.purchasePrice = data.purchasePrice;
        }
        if (data.purchaseDate) {
          portfolioData.purchaseDate = data.purchaseDate;
        }
        if (data.notes) {
          portfolioData.notes = data.notes;
        }
      }

      await portfolioService.addCard(portfolioData as unknown as Record<string, unknown>);
      // Fermer immédiatement et notifier le succès
      onSuccess();
      onClose();
    } catch (error) {
      console.error("❌ Erreur lors de l'ajout:", error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: unknown } };
        console.error("📋 Détails de l'erreur:", {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
        });
      }
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "Impossible d'ajouter la carte. Vérifiez les informations saisies.",
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <section
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="addCardTitle"
        tabIndex={-1}
      >
        <div className={styles.header}>
          <h2 id="addCardTitle">Ajouter une carte</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {!selectedCard ? (
            <>
              <form onSubmit={handleSearch} className={styles.searchForm}>
                <Input
                  type="text"
                  placeholder="Tapez au moins 3 caractères..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    // Empêcher la propagation de Enter pour éviter de fermer le modal
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                    }
                  }}
                />
                {loading && <span className={styles.searching}>🔍 Recherche...</span>}
              </form>

              {searchResults.length > 0 && (
                <div className={styles.results}>
                  {searchResults.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      className={styles.resultCard}
                      onClick={() => handleSelectCard(card)}
                      aria-label={`Sélectionner ${card.name}`}
                    >
                      <img
                        src={getCardImageUrl(card)}
                        alt={card.name}
                        className={styles.cardImage}
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          target.src = 'https://images.pokemontcg.io/swsh1/back.png';
                        }}
                      />
                      <div className={styles.cardInfo}>
                        <h4>{card.name}</h4>
                        <p>
                          {card.set?.name || card.id?.split('-')[0]?.toUpperCase() || 'Set inconnu'}
                        </p>
                        <span className={styles.cardNumber}>#{card.localId}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className={styles.detailsForm}>
              <div className={styles.selectedCard}>
                <img
                  src={getCardImageUrl(selectedCard)}
                  alt={selectedCard.name}
                  className={styles.selectedCardImage}
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.src = 'https://images.pokemontcg.io/swsh1/back.png';
                  }}
                />
                <div>
                  <h3>{selectedCard.name}</h3>
                  <p>
                    {selectedCard.set?.name ||
                      selectedCard.id?.split('-')[0]?.toUpperCase() ||
                      'Set inconnu'}
                  </p>
                  <p className={styles.cardNumber}>#{selectedCard.localId}</p>
                  <button
                    type="button"
                    className={styles.changeBtn}
                    onClick={() => setSelectedCard(null)}
                  >
                    Changer de carte
                  </button>
                </div>
              </div>

              {/* Quantité */}
              <Input
                label="Quantité"
                type="number"
                min="1"
                {...register('quantity', { valueAsNumber: true })}
              />

              {/* Champs simples si quantity === 1 */}
              {quantity === 1 && (
                <>
                  {/* Checkbox gradée */}
                  <Checkbox label="Carte gradée" {...register('isGraded')} />

                  {/* Société + note (affichés seulement si gradée) */}
                  {watch('isGraded') && (
                    <>
                      <div className={styles.formGroup}>
                        <span className={styles.label}>Société de gradation</span>
                        <select
                          className={styles.select}
                          {...register('gradeCompany')}
                          onChange={(e) => {
                            setValue('gradeCompany', e.target.value || undefined);
                            setValue('gradeScore', undefined);
                          }}
                        >
                          <option value="">Sélectionnez une société</option>
                          {GRADING_COMPANIES.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {watch('gradeCompany') && (
                        <div className={styles.formGroup}>
                          <span className={styles.label}>Note</span>
                          <select className={styles.select} {...register('gradeScore')}>
                            <option value="">Sélectionnez une note</option>
                            {(
                              GRADING_COMPANIES.find((c) => c.id === watch('gradeCompany'))
                                ?.grades ?? []
                            ).map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}

                  <Input
                    label="Prix d'achat (€)"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Optionnel"
                    {...register('purchasePrice', {
                      setValueAs: (v) => (v === '' || v === null ? undefined : parseFloat(v)),
                    })}
                  />

                  <DatePicker
                    label="Date d'achat"
                    placeholder="Sélectionnez une date"
                    value={watch('purchaseDate') || ''}
                    onChange={(value: string) =>
                      setValue('purchaseDate', value, { shouldValidate: true, shouldDirty: true })
                    }
                  />

                  <div className={styles.formGroup}>
                    <label htmlFor="notes" className={styles.label}>
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      className={styles.textarea}
                      placeholder="Notes personnelles..."
                      rows={3}
                      {...register('notes')}
                    />
                  </div>
                </>
              )}

              {/* Form variantes si quantity >= 2 */}
              {quantity >= 2 && (
                <div className={styles.variants}>
                  <div className={styles.variantsHeader}>
                    <h4>Données par carte ({quantity})</h4>
                    <button
                      type="button"
                      className={styles.copyFirstBtn}
                      onClick={() => {
                        const list = watch('variants') ?? [];
                        if (list.length > 1) {
                          const first = list[0] ?? {};
                          setValue(
                            'variants',
                            list.map(() => ({ ...first })),
                            { shouldDirty: true }
                          );
                        }
                      }}
                    >
                      Copier la 1ʳᵉ sur toutes
                    </button>
                  </div>

                  {(watch('variants') ?? []).map((v, i) => (
                    <fieldset key={i} className={styles.variantRow}>
                      <legend>Carte #{i + 1}</legend>

                      <Checkbox
                        label="Carte gradée"
                        checked={Boolean(v?.isGraded)}
                        onChange={(e) => {
                          const list = [...(watch('variants') ?? [])];
                          list[i] = {
                            ...(list[i] || {}),
                            isGraded: e.target.checked,
                            // Réinitialiser les données de gradation si on décoche
                            gradeCompany: e.target.checked ? list[i]?.gradeCompany : undefined,
                            gradeScore: e.target.checked ? list[i]?.gradeScore : undefined,
                          };
                          setValue('variants', list, { shouldDirty: true });
                        }}
                      />

                      {/* Société + note (affichés seulement si gradée) */}
                      {v?.isGraded && (
                        <>
                          <div className={styles.formGroup}>
                            <span className={styles.label}>Société</span>
                            <select
                              className={styles.select}
                              value={v?.gradeCompany ?? ''}
                              onChange={(e) => {
                                const list = [...(watch('variants') ?? [])];
                                list[i] = {
                                  ...(list[i] || {}),
                                  gradeCompany: e.target.value || undefined,
                                  gradeScore: undefined,
                                };
                                setValue('variants', list, { shouldDirty: true });
                              }}
                            >
                              <option value="">—</option>
                              {GRADING_COMPANIES.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {v?.gradeCompany && (
                            <div className={styles.formGroup}>
                              <span className={styles.label}>Note</span>
                              <select
                                className={styles.select}
                                value={v?.gradeScore ?? ''}
                                onChange={(e) => {
                                  const list = [...(watch('variants') ?? [])];
                                  list[i] = {
                                    ...(list[i] || {}),
                                    gradeScore: e.target.value || undefined,
                                  };
                                  setValue('variants', list, { shouldDirty: true });
                                }}
                              >
                                <option value="">—</option>
                                {(
                                  GRADING_COMPANIES.find((c) => c.id === v.gradeCompany)?.grades ??
                                  []
                                ).map((g) => (
                                  <option key={g} value={g}>
                                    {g}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </>
                      )}

                      <Input
                        label="Prix d'achat (€)"
                        type="number"
                        min="0"
                        step="0.01"
                        value={v?.purchasePrice ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const list = [...(watch('variants') ?? [])];
                          list[i] = {
                            ...(list[i] || {}),
                            purchasePrice: val === '' ? undefined : Number(val),
                          };
                          setValue('variants', list, { shouldDirty: true });
                        }}
                      />

                      <DatePicker
                        label="Date d'achat"
                        value={v?.purchaseDate ?? ''}
                        onChange={(val) => {
                          const list = [...(watch('variants') ?? [])];
                          list[i] = { ...(list[i] || {}), purchaseDate: val || undefined };
                          setValue('variants', list, { shouldDirty: true });
                        }}
                      />

                      <div className={styles.formGroup}>
                        <span className={styles.label}>Notes</span>
                        <textarea
                          className={styles.textarea}
                          rows={2}
                          value={v?.notes ?? ''}
                          onChange={(e) => {
                            const list = [...(watch('variants') ?? [])];
                            list[i] = { ...(list[i] || {}), notes: e.target.value || undefined };
                            setValue('variants', list, { shouldDirty: true });
                          }}
                        />
                      </div>
                    </fieldset>
                  ))}
                </div>
              )}

              <div className={styles.actions}>
                <Button type="button" variant="secondary" onClick={onClose}>
                  Annuler
                </Button>
                <Button type="submit" loading={saving}>
                  Ajouter au portfolio
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Toast de notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
