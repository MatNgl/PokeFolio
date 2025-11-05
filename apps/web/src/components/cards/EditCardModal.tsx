import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { UserCard } from '@pokefolio/types';
import { portfolioService } from '../../services/portfolio.service';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { DatePicker } from '../ui/DatePicker';
import { Toast } from '../ui/Toast';
import styles from './AddCardModal.module.css';

interface EditCardModalProps {
  card: UserCard;
  onClose: () => void;
  onSuccess: () => void;
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

export function EditCardModal({ card, onClose, onSuccess }: EditCardModalProps) {
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Préparer les variantes initiales si elles existent
  const initialVariants: VariantForm[] =
    card.variants && Array.isArray(card.variants) && card.variants.length > 0
      ? card.variants.map((v) => ({
          isGraded: v.isGraded,
          gradeCompany: v.gradeCompany,
          gradeScore: v.gradeScore,
          purchasePrice: v.purchasePrice,
          purchaseDate: v.purchaseDate
            ? new Date(v.purchaseDate).toISOString().split('T')[0]
            : undefined,
          notes: v.notes,
        }))
      : [];

  const { register, handleSubmit, watch, setValue } = useForm<FormData>({
    defaultValues: {
      quantity: card.quantity,
      isGraded: card.isGraded,
      gradeCompany: card.gradeCompany,
      gradeScore: card.gradeScore,
      purchasePrice: card.purchasePrice,
      purchaseDate: card.purchaseDate
        ? new Date(card.purchaseDate).toISOString().split('T')[0]
        : undefined,
      notes: card.notes,
      variants: initialVariants,
    },
  });

  const quantity = watch('quantity');
  const isGraded = watch('isGraded');
  const selectedCompany = watch('gradeCompany');

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

  // Focus auto dans le modal
  const dialogRef = useRef<HTMLElement>(null);
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

  // Enregistrer purchaseDate pour pouvoir le piloter via setValue
  useEffect(() => {
    register('purchaseDate');
  }, [register]);

  // Grades disponibles
  const availableGrades = selectedCompany
    ? GRADING_COMPANIES.find((c) => c.id === selectedCompany)?.grades || []
    : [];

  const getCardImageUrl = (cardData: UserCard): string => {
    let img = cardData.imageUrl || '';

    // Si l'URL provient de assets.tcgdex.net et n'a pas d'extension, ajouter /high.webp
    if (img && img.includes('assets.tcgdex.net') && !img.match(/\.(webp|png|jpg|jpeg)$/i)) {
      img = `${img}/high.webp`;
    }

    // Image de dos de carte Pokémon par défaut
    return img || 'https://images.pokemontcg.io/swsh1/back.png';
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      // Construire les données de mise à jour
      const updateData: any = {};

      // Mode variantes si quantity >= 2
      if (data.quantity >= 2 && data.variants && data.variants.length > 0) {
        updateData.variants = data.variants.map((v) => ({
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
        updateData.quantity = data.quantity;
        updateData.graded = data.isGraded;
        updateData.grading =
          data.isGraded && (data.gradeCompany || data.gradeScore)
            ? {
                company: data.gradeCompany,
                grade: data.gradeScore?.toString(),
              }
            : undefined;
        updateData.purchasePrice = data.purchasePrice;
        updateData.purchaseDate = data.purchaseDate;
        updateData.notes = data.notes;
      }

      await portfolioService.updateCard(card._id, updateData);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      setToast({
        message:
          error instanceof Error
            ? error.message
            : 'Impossible de modifier la carte. Vérifiez les informations saisies.',
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
        aria-labelledby="editCardTitle"
        tabIndex={-1}
      >
        <div className={styles.header}>
          <h2 id="editCardTitle">Modifier la carte</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className={styles.content}>
          <form onSubmit={handleSubmit(onSubmit)} className={styles.detailsForm}>
            <div className={styles.selectedCard}>
              <img
                src={getCardImageUrl(card)}
                alt={card.name}
                className={styles.selectedCardImage}
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.src = 'https://images.pokemontcg.io/swsh1/back.png';
                }}
              />
              <div>
                <h3>{card.name}</h3>
                <p>{card.setName || 'Set inconnu'}</p>
                <p className={styles.cardNumber}>#{card.number}</p>
              </div>
            </div>

            <Input
              label="Quantité"
              type="number"
              min="1"
              {...register('quantity', { valueAsNumber: true })}
            />

            {/* Champs simples si quantity === 1 */}
            {quantity === 1 && (
              <>
                <Checkbox label="Carte gradée" {...register('isGraded')} />

                {isGraded && (
                  <>
                    <div className={styles.formGroup}>
                      <label htmlFor="gradeCompany" className={styles.label}>
                        Société de gradation
                      </label>
                      <select
                        id="gradeCompany"
                        className={styles.select}
                        {...register('gradeCompany', {
                          onChange: () => setValue('gradeScore', undefined),
                        })}
                      >
                        <option value="">Sélectionner une société</option>
                        {GRADING_COMPANIES.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedCompany && availableGrades.length > 0 && (
                      <div className={styles.formGroup}>
                        <label htmlFor="gradeScore" className={styles.label}>
                          Note
                        </label>
                        <select
                          id="gradeScore"
                          className={styles.select}
                          {...register('gradeScore')}
                        >
                          <option value="">Sélectionner une note</option>
                          {availableGrades.map((grade) => (
                            <option key={grade} value={grade}>
                              {grade}
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
                          gradeCompany: e.target.checked ? list[i]?.gradeCompany : undefined,
                          gradeScore: e.target.checked ? list[i]?.gradeScore : undefined,
                        };
                        setValue('variants', list, { shouldDirty: true });
                      }}
                    />

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
            )}

            <div className={styles.actions}>
              <Button type="button" variant="secondary" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" loading={saving}>
                Enregistrer les modifications
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Toast de notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
