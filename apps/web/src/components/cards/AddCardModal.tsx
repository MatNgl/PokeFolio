import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Card, AddCardDto } from '@pokefolio/types';
import { cardsService } from '../../services/cards.service';
import { portfolioService } from '../../services/portfolio.service';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { DatePicker } from '../ui/DatePicker';
import { Toast } from '../ui/Toast';
import styles from './AddCardModal.module.css';

interface AddCardModalProps {
  onClose: () => void;
  onSuccess: () => void;
  card?: Card; // Carte pré-sélectionnée (optionnel)
}

interface FormData {
  quantity: number;
  isGraded: boolean;
  gradeCompany?: string;
  gradeScore?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  notes?: string;
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
    defaultValues: { quantity: 1, isGraded: false },
  });

  const isGraded = watch('isGraded');
  const selectedCompany = watch('gradeCompany');

  // Focus auto dans le modal
  const dialogRef = useRef<HTMLElement>(null);
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

  // Grades disponibles
  const availableGrades = selectedCompany
    ? GRADING_COMPANIES.find((c) => c.id === selectedCompany)?.grades || []
    : [];

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

      // Préparer les URLs d'images avec extension .webp
      const prepareImageUrl = (url: string | undefined): string | undefined => {
        if (!url) return undefined;
        if (url.includes('assets.tcgdex.net') && !url.match(/\.(webp|png|jpg|jpeg)$/i)) {
          return `${url}/high.webp`;
        }
        return url;
      };

      const cardData: AddCardDto = {
        cardId: cardDetails.id,
        name: cardDetails.name,
        setId: cardDetails.set?.id,
        setName: cardDetails.set?.name,
        number: cardDetails.localId,
        setCardCount: cardDetails.set?.cardCount?.total || cardDetails.set?.cardCount?.official,
        rarity: cardDetails.rarity,
        imageUrl: prepareImageUrl(cardDetails.image || cardDetails.images?.small),
        imageUrlHiRes: prepareImageUrl(cardDetails.images?.large),
        types: cardDetails.types,
        supertype: cardDetails.category,
        subtypes: cardDetails.stage ? [cardDetails.stage] : undefined,
        quantity: data.quantity,
        isGraded: data.isGraded,
        gradeCompany: data.gradeCompany,
        gradeScore: data.gradeScore,
        purchasePrice: data.purchasePrice,
        purchaseDate: data.purchaseDate,
        notes: data.notes,
      };

      await portfolioService.addCard(cardData);
      // Fermer immédiatement et notifier le succès
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erreur lors de l'ajout:", error);
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

  // Accessibilité overlay : uniquement Espace (pas Enter pour éviter de fermer pendant la recherche)
  const handleOverlayKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ' && e.target === e.currentTarget) {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className={styles.overlay}
      // Fermer uniquement si clic direct sur l'overlay
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

              <Input
                label="Quantité"
                type="number"
                min="1"
                {...register('quantity', { valueAsNumber: true })}
              />

              <label className={styles.checkbox}>
                <input type="checkbox" {...register('isGraded')} />
                <span>Carte gradée</span>
              </label>

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
                      <select id="gradeScore" className={styles.select} {...register('gradeScore')}>
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
