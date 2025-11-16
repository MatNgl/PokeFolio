import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { setsService, type CompleteSetCard } from '../services/sets.service';
import { wishlistService } from '../services/wishlist.service';
import { Checkbox } from '../components/ui/Checkbox';
import SearchBar from '../components/ui/Search';
import { WishlistHeart } from '../components/ui/WishlistHeart';
import { Toast } from '../components/ui/Toast';
import { ArrowLeft, Package, Ban } from 'lucide-react';
import SetCardDetailsModal from '../components/cards/SetCardDetailsModal';
import styles from './SetDetail.module.css';

/**
 * Résout l'URL de l'image d'une carte
 * Ajoute /high.webp si l'URL provient de assets.tcgdex.net sans extension
 */
const resolveImageUrl = (imageUrl?: string): string => {
  if (!imageUrl) return 'https://images.pokemontcg.io/swsh1/back.png';

  // Si l'URL provient de assets.tcgdex.net et n'a pas d'extension, ajouter /high.webp
  if (imageUrl.includes('assets.tcgdex.net') && !imageUrl.match(/\.(webp|png|jpg|jpeg)$/i)) {
    return `${imageUrl}/high.webp`;
  }

  return imageUrl;
};

/**
 * Ordre de rareté des cartes Pokémon (de la moins rare à la plus rare)
 */
const RARITY_ORDER: Record<string, number> = {
  // Commune (niveau 1)
  'Common': 1,
  'Commune': 1,

  // Peu commune (niveau 2)
  'Uncommon': 2,
  'Peu commune': 2,
  'Peu Commune': 2,

  // Rare (niveau 3)
  'Rare': 3,

  // Holo Rare (niveau 4)
  'Holo Rare': 4,
  'Rare Holo': 4,
  'Rare holo': 4,

  // Reverse Holo (niveau 5)
  'Reverse Holo': 5,
  'Rare Reverse Holo': 5,

  // Holo (niveau 6)
  'Holo': 6,

  // Double Rare (niveau 7)
  'Double Rare': 7,
  'Double rare': 7,

  // Rare Holo V/VMAX/VSTAR (niveau 8-10)
  'Rare Holo V': 8,
  'Rare Holo VMAX': 9,
  'Rare Holo VSTAR': 10,
  'Rare Holo ex': 11,

  // Ultra Rare (niveau 12)
  'Ultra Rare': 12,
  'Rare Ultra': 12,
  'Ultra rare': 12,

  // Illustration Rare (niveau 13)
  'Illustration Rare': 13,
  'Rare Illustration': 13,
  'Illustration rare': 13,

  // Special Illustration Rare (niveau 14)
  'Special Illustration Rare': 14,
  'Rare Special Illustration': 14,
  'Rare illustration spéciale': 14,

  // Hyper Rare (niveau 15)
  'Hyper Rare': 15,
  'Rare Hyper': 15,
  'Hyper rare': 15,

  // Secret Rare (niveau 16)
  'Rare Secret': 16,
  'Secret Rare': 16,
  'Secret rare': 16,

  // Rainbow Rare (niveau 17)
  'Rare Rainbow': 17,
  'Rainbow Rare': 17,

  // Shiny Rare (niveau 18)
  'Rare Shiny': 18,
  'Shiny Rare': 18,

  // Amazing Rare (niveau 19)
  'Amazing Rare': 19,

  // Radiant Rare (niveau 20)
  'Radiant Rare': 20,
  'Radiant rare': 20,

  // Trainer Gallery (niveau 21)
  'Trainer Gallery Rare Holo': 21,

  // ACE SPEC (niveau 22)
  'ACE SPEC Rare': 22,
};

/**
 * Trie les raretés de la moins rare à la plus rare
 */
const sortRarities = (rarities: string[]): string[] => {
  return rarities.sort((a, b) => {
    const orderA = RARITY_ORDER[a] || 999; // Si inconnu, mettre à la fin
    const orderB = RARITY_ORDER[b] || 999;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    // Si même ordre ou inconnu, tri alphabétique
    return a.localeCompare(b);
  });
};

export function SetDetail() {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCompleteSet, setShowCompleteSet] = useState(false);
  const [selectedRarities, setSelectedRarities] = useState<Set<string>>(new Set());
  const [selectedCard, setSelectedCard] = useState<CompleteSetCard | null>(null);
  const [toast, setToast] = useState<{
    message: ReactNode;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = (message: ReactNode, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  // Récupérer les sets du portfolio
  const { data, isLoading, error } = useQuery({
    queryKey: ['portfolio', 'sets'],
    queryFn: () => setsService.getSets(),
  });

  const currentSet = useMemo(() => {
    return data?.sets.find((s) => s.setId === setId);
  }, [data?.sets, setId]);

  // Récupérer le set complet depuis TCGdex si nécessaire
  const { data: completeSetData } = useQuery({
    queryKey: ['complete-set', setId],
    queryFn: () => (setId ? setsService.getCompleteSet(setId) : Promise.resolve([])),
    enabled: showCompleteSet && !!setId,
  });

  // Récupérer les statuts wishlist pour toutes les cartes affichées
  const cardIds = useMemo(() => {
    if (showCompleteSet && completeSetData) {
      return completeSetData.map((card) => card.cardId);
    }
    return currentSet?.cards.map((card) => card.cardId) || [];
  }, [showCompleteSet, completeSetData, currentSet]);

  const { data: wishlistStatuses } = useQuery({
    queryKey: ['wishlist-check', cardIds],
    queryFn: () => wishlistService.checkMultiple(cardIds),
    enabled: cardIds.length > 0,
  });

  // Extraire toutes les raretés disponibles
  const availableRarities = useMemo(() => {
    const rarities = new Set<string>();

    // Si on affiche le set complet ET qu'on a les données chargées
    if (showCompleteSet && completeSetData && completeSetData.length > 0) {
      // Utiliser les raretés du set complet
      completeSetData.forEach((card) => {
        if (card.rarity) rarities.add(card.rarity);
      });
    }
    // Toujours inclure les raretés des cartes possédées (pour avoir au moins quelque chose à afficher)
    else if (currentSet && currentSet.cards) {
      currentSet.cards.forEach((card) => {
        if (card.rarity) rarities.add(card.rarity);
      });
    }

    // Trier les raretés de la moins rare à la plus rare
    return sortRarities(Array.from(rarities));
  }, [currentSet, completeSetData, showCompleteSet]);

  // Sélectionner toutes les raretés par défaut quand elles changent
  useEffect(() => {
    if (availableRarities.length > 0) {
      setSelectedRarities(new Set(availableRarities));
    }
  }, [availableRarities]);

  // Scroller en haut de la page quand on entre dans le set
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setId]);

  // Filtrer les cartes (seulement possédées ou set complet)
  const filteredCards = useMemo(() => {
    if (!currentSet) return [];

    // Choisir la source de données selon showCompleteSet
    const sourceCards: CompleteSetCard[] = showCompleteSet && completeSetData
      ? completeSetData
      : currentSet.cards.map(card => ({ ...card, owned: true }));

    let filtered = sourceCards;

    // Filtrage par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((card) =>
        card.name?.toLowerCase().includes(query)
      );
    }

    // Filtrage par rareté - afficher uniquement les cartes des raretés sélectionnées
    // Si aucune rareté n'est sélectionnée, afficher toutes les cartes
    if (selectedRarities.size > 0 && selectedRarities.size < availableRarities.length) {
      filtered = filtered.filter((card) =>
        card.rarity && selectedRarities.has(card.rarity)
      );
    }

    return filtered;
  }, [currentSet, completeSetData, searchQuery, selectedRarities, showCompleteSet, availableRarities.length]);

  const toggleRarity = (rarity: string) => {
    setSelectedRarities((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rarity)) {
        newSet.delete(rarity);
      } else {
        newSet.add(rarity);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Chargement du set...</p>
      </div>
    );
  }

  if (error || !currentSet) {
    return (
      <div className={styles.error}>
        <Package className={styles.errorIcon} />
        <p>Erreur lors du chargement du set</p>
        <button
          type="button"
          onClick={() => navigate('/portfolio')}
          className={styles.backButton}
        >
          Retour au portfolio
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button
          type="button"
          onClick={() => navigate('/portfolio', { state: { section: 'sets' } })}
          className={styles.backBtn}
          aria-label="Retour aux sets"
        >
          <ArrowLeft size={20} />
          <span>Retour aux sets</span>
        </button>

        <div className={styles.setInfo}>
          {currentSet.setLogo && (
            <img
              src={currentSet.setLogo}
              alt={currentSet.setName || 'Set'}
              className={styles.setLogo}
            />
          )}
          <div>
            <h1 className={styles.title}>{currentSet.setName || 'Set inconnu'}</h1>
            <div className={styles.stats}>
              <span>
                {currentSet.completion.owned}
                {currentSet.completion.total && ` / ${currentSet.completion.total}`} cartes
              </span>
              {currentSet.completion.percentage !== undefined && (
                <span className={styles.badge}>{currentSet.completion.percentage}%</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className={styles.controls}>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher une carte..."
          ariaLabel="Rechercher dans ce set"
          className={styles.searchBar}
        />

        <Checkbox
          label="Afficher le set complet"
          checked={showCompleteSet}
          onChange={(e) => setShowCompleteSet(e.target.checked)}
        />
      </div>

      {/* Filtres de rareté */}
      {availableRarities.length > 0 && (
        <div className={styles.rarityFilters}>
          <span className={styles.filterLabel}>Raretés :</span>
          <div className={styles.rarityButtons}>
            {availableRarities.map((rarity) => {
              const isSelected = selectedRarities.has(rarity);
              return (
                <button
                  key={rarity}
                  type="button"
                  className={`${styles.rarityButton} ${
                    isSelected ? styles.rarityButtonActive : styles.rarityButtonInactive
                  }`}
                  onClick={() => toggleRarity(rarity)}
                >
                  {!isSelected && <Ban size={14} className={styles.banIcon} />}
                  <span>{rarity}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Grille de cartes */}
      {filteredCards.length === 0 ? (
        <div className={styles.emptyState}>
          <Package className={styles.emptyIcon} />
          <p>Aucune carte trouvée</p>
        </div>
      ) : (
        <div className={styles.cardsGrid}>
          {filteredCards.map((card) => (
            <div
              key={card.itemId}
              className={`${styles.card} ${!card.owned ? styles.cardNotOwned : ''}`}
              onClick={() => setSelectedCard(card)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setSelectedCard(card);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <img
                src={resolveImageUrl(card.imageUrl)}
                alt={card.name || card.cardId}
                className={styles.cardImage}
                loading="lazy"
                width={245}
                height={342}
                onError={(e) => {
                  const t = e.currentTarget as HTMLImageElement;
                  t.src = 'https://images.pokemontcg.io/swsh1/back.png';
                }}
              />
              {!card.owned && (
                <WishlistHeart
                  cardId={card.cardId}
                  isInWishlist={wishlistStatuses?.[card.cardId] || false}
                  cardData={{
                    name: card.name,
                    setId: currentSet?.setId,
                    setName: currentSet?.setName,
                    setLogo: currentSet?.setLogo,
                    setSymbol: currentSet?.setSymbol,
                    setReleaseDate: currentSet?.releaseDate,
                    number: card.number,
                    rarity: card.rarity,
                    imageUrl: card.imageUrl,
                  }}
                  onToast={showToast}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de détails de carte */}
      {selectedCard && (() => {
        const currentIndex = filteredCards.findIndex((c) => c.itemId === selectedCard.itemId);
        const hasPrevious = currentIndex > 0;
        const hasNext = currentIndex < filteredCards.length - 1;

        const handleNavigatePrevious = () => {
          if (hasPrevious) {
            setSelectedCard(filteredCards[currentIndex - 1]);
          }
        };

        const handleNavigateNext = () => {
          if (hasNext) {
            setSelectedCard(filteredCards[currentIndex + 1]);
          }
        };

        return (
          <SetCardDetailsModal
            card={selectedCard}
            setName={currentSet.setName || 'Set inconnu'}
            onClose={() => setSelectedCard(null)}
            onNavigatePrevious={handleNavigatePrevious}
            onNavigateNext={handleNavigateNext}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
          />
        );
      })()}

      {toast && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
          <Toast
            message={toast.message}
            type={toast.type}
            duration={3500}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
}
