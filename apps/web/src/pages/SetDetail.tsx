import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { setsService, type CompleteSetCard } from '../services/sets.service';
import { wishlistService } from '../services/wishlist.service';
import { portfolioService } from '../services/portfolio.service';
import { useSetLogos, resolveLogoUrl } from '../hooks/useSetLogos';
import { useSetDetailPreferences } from '../hooks/useUserPreferences';
import { Checkbox } from '../components/ui/Checkbox';
import SearchBar from '../components/ui/Search';
import { WishlistHeart } from '../components/ui/WishlistHeart';
import { Toast } from '../components/ui/Toast';
import { ArrowLeft, Package, Ban } from 'lucide-react';
import UnifiedCardDetailsModal from '../components/cards/UnifiedCardDetailsModal';
import { CardOverlayButtons } from '../components/cards/CardOverlayButtons';
import { QuickAddModal } from '../components/cards/QuickAddModal';
import { AddCardModal } from '../components/cards/AddCardModal';
import { resolveImageUrl, handleImageError } from '../utils/imageUtils';
import styles from './SetDetail.module.css';

/**
 * Ordre de rareté des cartes Pokémon (de la moins rare à la plus rare)
 */
const RARITY_ORDER: Record<string, number> = {
  // Commune (niveau 1)
  Common: 1,
  Commune: 1,

  // Peu commune (niveau 2)
  Uncommon: 2,
  'Peu commune': 2,
  'Peu Commune': 2,

  // Rare (niveau 3)
  Rare: 3,

  // Holo Rare (niveau 4)
  'Holo Rare': 4,
  'Rare Holo': 4,
  'Rare holo': 4,

  // Reverse Holo (niveau 5)
  'Reverse Holo': 5,
  'Rare Reverse Holo': 5,

  // Holo (niveau 6)
  Holo: 6,

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
  const queryClient = useQueryClient();

  // Préférences persistantes
  const { showComplete: showCompleteSet, setShowComplete: setShowCompleteSet } =
    useSetDetailPreferences();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRarities, setSelectedRarities] = useState<Set<string>>(new Set());
  const [selectedCard, setSelectedCard] = useState<CompleteSetCard | null>(null);
  const [toast, setToast] = useState<{
    message: ReactNode;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Vérifier s'il y a un toast à afficher depuis localStorage (après reload)
  useEffect(() => {
    const storedToast = localStorage.getItem('toast');
    if (storedToast) {
      try {
        const { message, type } = JSON.parse(storedToast);
        setToast({ message, type });
        localStorage.removeItem('toast');
      } catch (e) {
        localStorage.removeItem('toast');
      }
    }
  }, []);

  // États pour l'ajout de carte
  const [quickAddCard, setQuickAddCard] = useState<CompleteSetCard | null>(null);
  const [addModalCard, setAddModalCard] = useState<CompleteSetCard | null>(null);

  const showToast = (message: ReactNode, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  // Fonction pour rafraîchir les données après ajout
  const refreshSetData = async () => {
    // Invalider le cache pour recharger les données
    await queryClient.invalidateQueries({ queryKey: ['portfolio', 'sets'] });
    await queryClient.invalidateQueries({ queryKey: ['complete-set', setId] });
    await queryClient.invalidateQueries({ queryKey: ['wishlist-check'] });
  };

  // Ajouter une carte directement (sans détails)
  const handleAddDirect = async (card: CompleteSetCard) => {
    try {
      await portfolioService.addCard({
        cardId: card.cardId,
        language: 'fr',
        name: card.name || 'Carte inconnue',
        setId: currentSet?.setId,
        setName: currentSet?.setName,
        number: card.number,
        rarity: card.rarity,
        imageUrl: card.imageUrl,
        quantity: 1,
      });
      setQuickAddCard(null);
      showToast(`${card.name || 'Carte'} a été ajoutée au portfolio`, 'success');
      await refreshSetData();
    } catch (error) {
      console.error("Erreur lors de l'ajout:", error);
      showToast("Erreur lors de l'ajout de la carte", 'error');
    }
  };

  // Ouvrir le modal d'ajout avec détails
  const handleAddWithDetails = (card: CompleteSetCard) => {
    setQuickAddCard(null);
    setAddModalCard(card);
  };

  // Après ajout réussi via le modal
  const handleAddModalSuccess = async () => {
    const cardName = addModalCard?.name || 'Carte';
    setAddModalCard(null);
    showToast(`${cardName} a été ajoutée au portfolio`, 'success');
    await refreshSetData();
  };

  // Toggle favori pour une carte possédée
  const handleToggleFavorite = async (card: CompleteSetCard) => {
    if (!card.itemId) return;

    try {
      const updated = await portfolioService.toggleFavorite(card.itemId);
      showToast(
        updated.isFavorite ? 'Carte ajoutée aux favoris' : 'Carte retirée des favoris',
        'success'
      );
      await refreshSetData();
    } catch (error) {
      console.error('Erreur toggle favorite:', error);
      showToast('Erreur lors de la modification du favori', 'error');
    }
  };

  // Récupérer les sets du portfolio
  const { data, isLoading, error } = useQuery({
    queryKey: ['portfolio', 'sets'],
    queryFn: () => setsService.getSets(),
  });

  // Récupérer les infos du set depuis TCGDex (pour les sets non possédés)
  const { data: tcgdexSetInfo } = useQuery({
    queryKey: ['tcgdex-set-info', setId],
    queryFn: async () => {
      if (!setId) return null;
      const response = await fetch(`https://api.tcgdex.net/v2/fr/sets/${setId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!setId,
  });

  const currentSet = useMemo(() => {
    const portfolioSet = data?.sets.find((s) => s.setId === setId);

    // Si on a le set dans le portfolio, l'utiliser
    if (portfolioSet) return portfolioSet;

    // Sinon, créer un set virtuel à partir des données TCGDex
    if (tcgdexSetInfo && setId) {
      return {
        setId,
        setName: tcgdexSetInfo.name,
        setLogo: tcgdexSetInfo.logo,
        setSymbol: tcgdexSetInfo.symbol,
        releaseDate: tcgdexSetInfo.releaseDate,
        cards: [],
        completion: {
          owned: 0,
          total: tcgdexSetInfo.cardCount?.total || tcgdexSetInfo.cardCount?.official,
          percentage: 0,
        },
        totalValue: 0,
        totalQuantity: 0,
      };
    }

    return undefined;
  }, [data?.sets, setId, tcgdexSetInfo]);

  // Récupérer le logo depuis TCGDex
  const setIdsForLogo = useMemo(() => (setId ? [setId] : []), [setId]);
  const logos = useSetLogos(setIdsForLogo);
  const logoUrl = setId ? resolveLogoUrl(logos[setId] || currentSet?.setLogo) : null;

  // Récupérer le set complet depuis TCGdex - toujours actif si on n'a pas de cartes du portfolio
  const shouldFetchCompleteSet = showCompleteSet || (currentSet && currentSet.cards.length === 0);
  const { data: completeSetData, isLoading: isLoadingCompleteSet } = useQuery({
    queryKey: ['complete-set', setId],
    queryFn: () => (setId ? setsService.getCompleteSet(setId) : Promise.resolve([])),
    enabled: shouldFetchCompleteSet && !!setId,
  });

  // Récupérer les statuts wishlist pour toutes les cartes affichées
  const cardIds = useMemo(() => {
    if ((showCompleteSet || shouldFetchCompleteSet) && completeSetData) {
      return completeSetData.map((card) => card.cardId);
    }
    return currentSet?.cards.map((card) => card.cardId) || [];
  }, [showCompleteSet, shouldFetchCompleteSet, completeSetData, currentSet]);

  const { data: wishlistStatuses } = useQuery({
    queryKey: ['wishlist-check', cardIds],
    queryFn: () => wishlistService.checkMultiple(cardIds),
    enabled: cardIds.length > 0,
  });

  // Extraire toutes les raretés disponibles
  const availableRarities = useMemo(() => {
    const rarities = new Set<string>();

    // Si on affiche le set complet ET qu'on a les données chargées
    if (
      (showCompleteSet || shouldFetchCompleteSet) &&
      completeSetData &&
      completeSetData.length > 0
    ) {
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
  }, [currentSet, completeSetData, showCompleteSet, shouldFetchCompleteSet]);

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

  // Définir le titre de la page avec le nom du set
  useEffect(() => {
    if (currentSet?.setName) {
      document.title = `PokéFolio - ${currentSet.setName}`;
    } else {
      document.title = 'PokéFolio - Set';
    }
  }, [currentSet?.setName]);

  // Filtrer les cartes (seulement possédées ou set complet)
  const filteredCards = useMemo(() => {
    if (!currentSet) return [];

    // Choisir la source de données selon showCompleteSet
    const sourceCards: CompleteSetCard[] =
      showCompleteSet && completeSetData
        ? completeSetData
        : currentSet.cards.map((card) => ({ ...card, owned: true }));

    let filtered = sourceCards;

    // Filtrage par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((card) => card.name?.toLowerCase().includes(query));
    }

    // Filtrage par rareté - afficher uniquement les cartes des raretés sélectionnées
    // Si aucune rareté n'est sélectionnée, afficher toutes les cartes
    if (selectedRarities.size > 0 && selectedRarities.size < availableRarities.length) {
      filtered = filtered.filter((card) => card.rarity && selectedRarities.has(card.rarity));
    }

    return filtered;
  }, [
    currentSet,
    completeSetData,
    searchQuery,
    selectedRarities,
    showCompleteSet,
    availableRarities.length,
  ]);

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

  // Afficher le chargement si on attend les données
  const isLoadingData =
    isLoading || (shouldFetchCompleteSet && isLoadingCompleteSet && !completeSetData);

  if (isLoadingData) {
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
          onClick={() => navigate('/portfolio', { state: { section: 'sets' } })}
          className={styles.backButton}
        >
          Retour aux sets
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
          {logoUrl && (
            <img
              src={logoUrl}
              alt={currentSet.setName || 'Set'}
              className={styles.setLogo}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
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
        {/* Note: Cette préférence est persistée globalement */}
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
            >
              <button
                type="button"
                className={styles.cardImageButton}
                onClick={() => setSelectedCard(card)}
                aria-label={`Voir les détails de ${card.name}`}
                title={`Voir les détails de ${card.name}`}
              >
                <img
                  src={resolveImageUrl(card.imageUrl)}
                  alt={card.name || card.cardId}
                  className={styles.cardImage}
                  loading="lazy"
                  width={245}
                  height={342}
                  onError={handleImageError}
                />
              </button>
              {/* Bouton favori ou wishlist selon si la carte est possédée */}
              {card.owned ? (
                <CardOverlayButtons
                  type="favorite"
                  isActive={card.isFavorite}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(card);
                  }}
                  cardName={card.name}
                />
              ) : (
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
              {/* Bouton d'ajout pour toutes les cartes */}
              <CardOverlayButtons
                type="add"
                isActive={false}
                onClick={(e) => {
                  e.stopPropagation();
                  setQuickAddCard(card);
                }}
                cardName={card.name}
                position="top-right-secondary"
              />
            </div>
          ))}
        </div>
      )}

      {/* Modal de détails de carte */}
      {selectedCard &&
        (() => {
          const currentIndex = filteredCards.findIndex((c) => c.itemId === selectedCard.itemId);
          const hasPrevious = currentIndex > 0;
          const hasNext = currentIndex < filteredCards.length - 1;

          const handleNavigatePrevious = () => {
            const prevCard = filteredCards[currentIndex - 1];
            if (hasPrevious && prevCard) {
              setSelectedCard(prevCard);
            }
          };

          const handleNavigateNext = () => {
            const nextCard = filteredCards[currentIndex + 1];
            if (hasNext && nextCard) {
              setSelectedCard(nextCard);
            }
          };

          return (
            <UnifiedCardDetailsModal
              mode="set"
              card={selectedCard}
              setName={currentSet.setName || 'Set inconnu'}
              setId={currentSet.setId}
              onClose={() => setSelectedCard(null)}
              onNavigatePrevious={handleNavigatePrevious}
              onNavigateNext={handleNavigateNext}
              hasPrevious={hasPrevious}
              hasNext={hasNext}
            />
          );
        })()}

      {/* Modal QuickAdd */}
      {quickAddCard && (
        <QuickAddModal
          cardName={quickAddCard.name || 'Carte inconnue'}
          setName={currentSet?.setName}
          onClose={() => setQuickAddCard(null)}
          onAddDirect={() => handleAddDirect(quickAddCard)}
          onAddWithDetails={() => handleAddWithDetails(quickAddCard)}
        />
      )}

      {/* Modal d'ajout avec détails */}
      {addModalCard && (
        <AddCardModal
          card={{
            id: addModalCard.cardId,
            localId: addModalCard.number || addModalCard.cardId,
            name: addModalCard.name || 'Carte inconnue',
            images: { small: addModalCard.imageUrl, large: addModalCard.imageUrl },
            set: {
              id: currentSet?.setId || '',
              name: currentSet?.setName || '',
              logo: currentSet?.setLogo,
            },
            rarity: addModalCard.rarity,
          }}
          onClose={() => setAddModalCard(null)}
          onSuccess={handleAddModalSuccess}
        />
      )}

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
