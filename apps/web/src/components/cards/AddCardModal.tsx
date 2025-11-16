import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Card } from '@pokefolio/types';
import { cardsService } from '../../services/cards.service';
import { portfolioService } from '../../services/portfolio.service';
import { CardRecognition } from '../CardRecognition/CardRecognition';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { DatePicker } from '../ui/DatePicker';
import { Toast } from '../ui/Toast';
import { FullScreenLoader } from '../ui/FullScreenLoader';
import { Camera, Trash2, PlusCircle } from 'lucide-react';
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

// Sociétés de gradation et leurs barèmes (aligné avec le backend)
const GRADING_COMPANIES = [
  { id: 'PSA', name: 'PSA', grades: ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1'] },
  {
    id: 'PCA',
    name: 'PCA',
    grades: ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5'],
  },
  {
    id: 'COLLECT_AURA',
    name: 'Collect Aura',
    grades: ['10+', '10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6'],
  },
  {
    id: 'CGC',
    name: 'CGC',
    grades: ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5'],
  },
  {
    id: 'BGS',
    name: 'BGS',
    grades: ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5'],
  },
  {
    id: 'AGS',
    name: 'AGS',
    grades: ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5'],
  },
  {
    id: 'CCC',
    name: 'CCC',
    grades: ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5'],
  },
  {
    id: 'SGC',
    name: 'SGC',
    grades: ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5'],
  },
  {
    id: 'TAG',
    name: 'TAG',
    grades: ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5'],
  },
] as const;

export function AddCardModal({ onClose, onSuccess, card }: AddCardModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(card || null);
  const [showRecognition, setShowRecognition] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { register, handleSubmit, watch, setValue } = useForm<FormData>({
    defaultValues: { quantity: 1, isGraded: false, variants: [{}] }, // 1 variante par défaut
  });

  const quantity = watch('quantity');
  const selectedCompany = watch('gradeCompany');
  const variants = watch('variants') ?? [];

  // Focus auto dans le modal
  const dialogRef = useRef<HTMLElement>(null);

  // Fonction pour ajouter une nouvelle variante
  const handleAddVariant = () => {
    const currentVariants = watch('variants') ?? [];
    setValue('variants', [...currentVariants, {}], { shouldDirty: true });
  };

  // Fonction pour supprimer une variante
  const handleRemoveVariant = (index: number) => {
    const currentVariants = watch('variants') ?? [];
    if (currentVariants.length > 1) {
      const newVariants = currentVariants.filter((_, i) => i !== index);
      setValue('variants', newVariants, { shouldDirty: true });
    }
  };

  // Mettre à jour la quantité en fonction du nombre de variantes
  useEffect(() => {
    const currentVariants = watch('variants') ?? [];
    const variantCount = currentVariants.length;
    if (variantCount > 0) {
      setValue('quantity', variantCount, { shouldDirty: false });
    }
  }, [variants.length, setValue, watch]);

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
      const result = await cardsService.searchCards({ q: value, limit: 0 });
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
        setLogo?: string;
        setSymbol?: string;
        setReleaseDate?: string;
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
        setReleaseDate: (cardDetails.set as any)?.releaseDate,
        setLogo: (cardDetails.set as any)?.logo,
        setSymbol: (cardDetails.set as any)?.symbol,
        number: cardDetails.localId,
        setCardCount: cardDetails.set?.cardCount?.total || cardDetails.set?.cardCount?.official,
        rarity: cardDetails.rarity,
        imageUrl: cardDetails.image || cardDetails.images?.small,
        imageUrlHiRes: cardDetails.images?.large,
        types: cardDetails.types,
        supertype: cardDetails.category,
        subtypes: cardDetails.stage ? [cardDetails.stage] : undefined,
      };

      // Toujours utiliser le système de variantes
      if (data.variants && data.variants.length > 0) {
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
              {/* Barre de recherche sticky */}
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
                <button
                  type="button"
                  onClick={() => setShowRecognition(true)}
                  className={styles.scanButton}
                  aria-label="Scanner une carte avec la caméra"
                >
                  <Camera size={18} aria-hidden />
                </button>
              </form>
              {loading && <span className={styles.searching}>🔍 Recherche...</span>}

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

              {/* Quantité (lecture seule - calculée automatiquement) */}
              <Input
                label="Quantité"
                type="number"
                value={variants.length}
                readOnly
                disabled
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />

              {/* Formulaire de variantes */}
              <div className={styles.variants}>
                <div className={styles.variantsHeader}>
                  <h4>
                    {variants.length === 1
                      ? 'Informations de la carte'
                      : `Variantes (${variants.length})`}
                  </h4>
                  <div className={styles.variantsHeaderActions}>
                    {variants.length > 1 && (
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
                    )}
                    <button
                      type="button"
                      className={styles.addVariantBtn}
                      onClick={handleAddVariant}
                    >
                      <PlusCircle size={16} />
                      Ajouter une variante
                    </button>
                  </div>
                </div>

                {variants.map((v, i) => (
                  <fieldset key={i} className={styles.variantRow}>
                    <div className={styles.variantRowHeader}>
                      <legend>{variants.length === 1 ? 'Carte' : `Carte #${i + 1}`}</legend>
                      {variants.length > 1 && (
                        <button
                          type="button"
                          className={styles.deleteVariantBtn}
                          onClick={() => handleRemoveVariant(i)}
                          aria-label={`Supprimer la variante #${i + 1}`}
                          title={`Supprimer la variante #${i + 1}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <Checkbox
                      label="Carte gradée"
                      checked={Boolean(v?.isGraded)}
                      onChange={(e) => {
                        const list = [...(watch('variants') ?? [])];
                        list[i] = {
                          ...(list[i] || {}),
                          isGraded: e.target.checked,
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
                                GRADING_COMPANIES.find((c) => c.id === v.gradeCompany)?.grades ?? []
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


              <div className={styles.actions}>
                <Button type="button" variant="secondary" onClick={onClose}>
                  Annuler
                </Button>
                <Button type="submit">
                  Ajouter au portfolio
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Toast de notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Modal de reconnaissance de carte */}
      {showRecognition && (
        <CardRecognition
          onCardSelected={(card) => {
            setShowRecognition(false);
            handleSelectCard(card);
          }}
          onClose={() => setShowRecognition(false)}
        />
      )}

      {/* FullScreenLoader pendant la sauvegarde */}
      {saving && <FullScreenLoader message="Ajout de la carte en cours..." />}
    </div>
  );
}
