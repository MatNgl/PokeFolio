import { useState, useMemo, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wishlistService, type WishlistItem } from '../../services/wishlist.service';
import { portfolioService } from '../../services/portfolio.service';
import { type CompleteSetCard } from '../../services/sets.service';
import SearchBar from '../ui/Search';
import { FilterButton, type SortOption as FilterSortOption } from '../ui/FilterButton';
import { QuickAddModal } from '../cards/QuickAddModal';
import { AddCardModal } from '../cards/AddCardModal';
import SetCardDetailsModal from '../cards/SetCardDetailsModal';
import { Toast } from '../ui/Toast';
import { Heart, Package, PlusCircle } from 'lucide-react';
import styles from './WishlistView.module.css';
import type { Card } from '@pokefolio/types';

/**
 * Résout l'URL de l'image d'une carte
 */
const resolveImageUrl = (imageUrl?: string): string => {
  if (!imageUrl) return 'https://images.pokemontcg.io/swsh1/back.png';
  if (imageUrl.includes('assets.tcgdex.net') && !imageUrl.match(/\.(webp|png|jpg|jpeg)$/i)) {
    return `${imageUrl}/high.webp`;
  }
  return imageUrl;
};

export function WishlistView() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<FilterSortOption>({
    field: 'date',
    direction: 'desc',
  });
  const [selectedItemForQuickAdd, setSelectedItemForQuickAdd] = useState<WishlistItem | null>(null);
  const [selectedCardForDetails, setSelectedCardForDetails] = useState<WishlistItem | null>(null);
  const [selectedCardForDetailedAdd, setSelectedCardForDetailedAdd] = useState<Card | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showDetailedAdd, setShowDetailedAdd] = useState(false);
  const [toast, setToast] = useState<{
    message: ReactNode;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => wishlistService.getWishlist(),
  });

  const removeMutation = useMutation({
    mutationFn: (cardId: string) => wishlistService.removeFromWishlist(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-check'] });
    },
  });

  const addToPortfolioMutation = useMutation({
    mutationFn: (item: WishlistItem) =>
      portfolioService.addCard({
        cardId: item.cardId,
        language: 'fr',
        quantity: 1,
        // Métadonnées de la carte (directement depuis WishlistItem)
        name: item.name,
        setId: item.setId,
        setName: item.setName,
        setLogo: item.setLogo,
        setSymbol: item.setSymbol,
        setReleaseDate: item.releaseDate,
        number: item.number,
        rarity: item.rarity,
        imageUrl: item.imageUrl,
        imageUrlHiRes: item.imageUrlHiRes,
        types: item.types,
        supertype: item.category,
      }),
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      removeMutation.mutate(item.cardId);
    },
  });

  const filteredAndSortedItems = useMemo(() => {
    let filtered = data?.items || [];

    // 1. Filtrage par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => {
        if (item.name?.toLowerCase().includes(query)) return true;
        if (item.setName?.toLowerCase().includes(query)) return true;
        return false;
      });
    }

    // 2. Tri
    const items = [...filtered];
    const { field, direction } = sortOption;
    const multiplier = direction === 'asc' ? 1 : -1;

    return items.sort((a, b) => {
      switch (field) {
        case 'name':
          return multiplier * (a.name || '').localeCompare(b.name || '');
        case 'date':
          return multiplier * (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        default:
          return multiplier * (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    });
  }, [data?.items, searchQuery, sortOption]);

  const handleAddDirect = () => {
    if (!selectedItemForQuickAdd) return;
    const cardName = selectedItemForQuickAdd.name || selectedItemForQuickAdd.cardId;
    addToPortfolioMutation.mutate(selectedItemForQuickAdd);
    setShowQuickAdd(false);
    setSelectedItemForQuickAdd(null);
    setToast({
      message: (
        <>
          <strong>{cardName}</strong> a été ajouté au portfolio
        </>
      ),
      type: 'success',
    });
  };

  const handleAddWithDetails = () => {
    if (!selectedItemForQuickAdd) return;
    // Convertir WishlistItem en Card pour AddCardModal
    const cardForModal: Card = {
      id: selectedItemForQuickAdd.cardId,
      localId: selectedItemForQuickAdd.number || '',
      name: selectedItemForQuickAdd.name || selectedItemForQuickAdd.cardId,
      image: selectedItemForQuickAdd.imageUrl,
      images: {
        small: selectedItemForQuickAdd.imageUrl,
        large: selectedItemForQuickAdd.imageUrlHiRes,
      },
      set: {
        id: selectedItemForQuickAdd.setId || '',
        name: selectedItemForQuickAdd.setName,
        logo: selectedItemForQuickAdd.setLogo,
      },
      rarity: selectedItemForQuickAdd.rarity,
      types: selectedItemForQuickAdd.types,
      category: selectedItemForQuickAdd.category,
    };
    setSelectedCardForDetailedAdd(cardForModal);
    setShowQuickAdd(false);
    setShowDetailedAdd(true);
  };

  const handleAddSuccess = () => {
    if (!selectedItemForQuickAdd) return;
    const cardName = selectedItemForQuickAdd.name || selectedItemForQuickAdd.cardId;
    setShowDetailedAdd(false);
    removeMutation.mutate(selectedItemForQuickAdd.cardId);
    setSelectedItemForQuickAdd(null);
    setSelectedCardForDetailedAdd(null);
    queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    setToast({
      message: (
        <>
          <strong>{cardName}</strong> a été ajouté au portfolio
        </>
      ),
      type: 'success',
    });
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Chargement de votre wishlist...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>Erreur lors du chargement de la wishlist</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Controls */}
      <div className={styles.controls}>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher une carte..."
          ariaLabel="Rechercher dans votre wishlist"
          className={styles.searchBar}
        />
        <FilterButton onSortChange={setSortOption} currentSort={sortOption} context="discover" />
      </div>

      {/* Liste */}
      {filteredAndSortedItems.length === 0 ? (
        <div className={styles.emptyState}>
          <Package className={styles.emptyIcon} />
          <p className={styles.emptyText}>
            {searchQuery ? 'Aucune carte trouvée' : 'Votre wishlist est vide'}
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredAndSortedItems.map((item) => (
            <article key={item.id} className={styles.card}>
              <div
                className={styles.cardImageWrap}
                onClick={() => setSelectedCardForDetails(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedCardForDetails(item);
                  }
                }}
                aria-label={`Voir les détails de ${item.name}`}
                title={`Voir les détails de ${item.name}`}
              >
                <img
                  src={resolveImageUrl(item.imageUrl)}
                  alt={item.name || item.cardId}
                  className={styles.cardImage}
                  loading="lazy"
                  onError={(e) => {
                    const t = e.currentTarget as HTMLImageElement;
                    t.src = 'https://images.pokemontcg.io/swsh1/back.png';
                  }}
                />
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    const cardName = item.name || item.cardId;
                    removeMutation.mutate(item.cardId);
                    setToast({
                      message: (
                        <>
                          <strong>{cardName}</strong> a été retiré de la wishlist
                        </>
                      ),
                      type: 'info',
                    });
                  }}
                  aria-label="Retirer de la wishlist"
                  title="Retirer de la wishlist"
                >
                  <Heart size={18} fill="currentColor" />
                </button>
              </div>

              <div className={styles.cardInfo}>
                <h3 className={styles.cardName}>{item.name}</h3>
                <p className={styles.cardSet}>
                  {item.setName || item.setId?.toUpperCase() || 'Set inconnu'}
                  {item.number && ` · #${item.number}`}
                </p>
                {item.rarity && <p className={styles.cardRarity}>{item.rarity}</p>}
              </div>

              <button
                type="button"
                className={styles.addBtn}
                onClick={() => {
                  setSelectedItemForQuickAdd(item);
                  setShowQuickAdd(true);
                }}
                aria-label={`Ajouter ${item.name} au portfolio`}
              >
                <PlusCircle size={16} />
                Ajouter
              </button>
            </article>
          ))}
        </div>
      )}

      {/* Modals */}
      {showQuickAdd && selectedItemForQuickAdd && (
        <QuickAddModal
          cardName={selectedItemForQuickAdd.name || selectedItemForQuickAdd.cardId}
          setName={selectedItemForQuickAdd.setName}
          onClose={() => {
            setShowQuickAdd(false);
            setSelectedItemForQuickAdd(null);
          }}
          onAddDirect={handleAddDirect}
          onAddWithDetails={handleAddWithDetails}
        />
      )}

      {showDetailedAdd && selectedCardForDetailedAdd && (
        <AddCardModal
          card={selectedCardForDetailedAdd}
          onClose={() => {
            setShowDetailedAdd(false);
            setSelectedCardForDetailedAdd(null);
            setSelectedItemForQuickAdd(null);
          }}
          onSuccess={handleAddSuccess}
        />
      )}

      {selectedCardForDetails &&
        (() => {
          const currentIndex = filteredAndSortedItems.findIndex(
            (item) => item.id === selectedCardForDetails.id
          );
          const hasPrevious = currentIndex > 0;
          const hasNext = currentIndex < filteredAndSortedItems.length - 1;

          const handleNavigatePrevious = () => {
            const prevCard = filteredAndSortedItems[currentIndex - 1];
            if (hasPrevious && prevCard) {
              setSelectedCardForDetails(prevCard);
            }
          };

          const handleNavigateNext = () => {
            const nextCard = filteredAndSortedItems[currentIndex + 1];
            if (hasNext && nextCard) {
              setSelectedCardForDetails(nextCard);
            }
          };

          const completeSetCard: CompleteSetCard = {
            itemId: selectedCardForDetails.id,
            cardId: selectedCardForDetails.cardId,
            name: selectedCardForDetails.name,
            number: selectedCardForDetails.number,
            rarity: selectedCardForDetails.rarity,
            imageUrl: selectedCardForDetails.imageUrl,
            owned: false,
            quantity: 0,
          };

          return (
            <SetCardDetailsModal
              card={completeSetCard}
              setName={selectedCardForDetails.setName || 'Set inconnu'}
              onClose={() => setSelectedCardForDetails(null)}
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
