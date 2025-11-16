import { useEffect, useState, useRef, type ReactNode } from 'react';
import type { Card } from '@pokefolio/types';
import { useQuery } from '@tanstack/react-query';
import { cardsService } from '../services/cards.service';
import { wishlistService } from '../services/wishlist.service';
import { AddCardModal } from '../components/cards/AddCardModal';
import { CardDetailsModal } from '../components/cards/CardDetailsModal';
import { QuickAddModal } from '../components/cards/QuickAddModal';
import { CardRecognition } from '../components/CardRecognition/CardRecognition';
import { FullScreenLoader } from '../components/ui/FullScreenLoader';
import { Toast } from '../components/ui/Toast';
import SearchBar from '../components/ui/Search';
import { FilterButton, type SortOption } from '../components/ui/FilterButton';
import { WishlistHeart } from '../components/ui/WishlistHeart';
import styles from './Discover.module.css';
import { PlusCircle, Camera } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { portfolioService } from '../services/portfolio.service';

export default function Discover() {
  // Définir le titre de la page
  useEffect(() => {
    document.title = 'PokéFolio - Découvrir';
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [displayedCards, setDisplayedCards] = useState<Card[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [detailsCard, setDetailsCard] = useState<Card | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>({ field: 'default', direction: 'asc' });
  const [showRecognition, setShowRecognition] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showDetailedAdd, setShowDetailedAdd] = useState(false);
  const isInitialLoadRef = useRef(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{
    message: ReactNode;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const queryClient = useQueryClient();

  const CARDS_PER_PAGE = 15;

  // Récupérer les statuts wishlist pour les cartes affichées
  const displayedCardIds = displayedCards.map((card) => card.id);
  const { data: wishlistStatuses } = useQuery({
    queryKey: ['wishlist-check', displayedCardIds],
    queryFn: () => wishlistService.checkMultiple(displayedCardIds),
    enabled: displayedCardIds.length > 0,
  });

  // Charger des cartes aléatoires au montage
  useEffect(() => {
    const load = async () => {
      await loadRandomCards();
      isInitialLoadRef.current = false;
    };
    void load();
  }, []);

  const loadRandomCards = async () => {
    try {
      setLoading(true);
      setDisplayedCards([]); // Réinitialiser pour l'affichage progressif

      // Liste de 40 Pokémon populaires pour garantir une variété
      const randomPokemons = [
        'Pikachu',
        'Dracaufeu',
        'Mewtwo',
        'Evoli',
        'Lucario',
        'Salamèche',
        'Ronflex',
        'Lokhlass',
        'Florizarre',
        'Tortank',
        'Drattak',
        'Suicune',
        'Raikou',
        'Entei',
        'Lugia',
        'Ho-Oh',
        'Celebi',
        'Rayquaza',
        'Kyogre',
        'Groudon',
        'Latias',
        'Latios',
        'Jirachi',
        'Deoxys',
        'Dialga',
        'Palkia',
        'Giratina',
        'Arceus',
        'Reshiram',
        'Zekrom',
        'Kyurem',
        'Xerneas',
        'Yveltal',
        'Zygarde',
        'Solgaleo',
        'Lunala',
        'Necrozma',
        'Zacian',
        'Zamazenta',
      ];

      // Mélanger et sélectionner 15 Pokémon différents pour le chargement initial
      const shuffled = [...randomPokemons].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, CARDS_PER_PAGE);

      let loadedCount = 0;
      const loadedCards: Card[] = [];

      // Charger les cartes progressivement (affichage au fur et à mesure)
      selected.forEach((pokemon) => {
        cardsService
          .searchCards({ q: pokemon, limit: 10, lang: 'fr' })
          .then((data) => {
            // Filtrer pour exclure les cartes TCGP (jeu en ligne)
            const physicalCards = data.cards.filter((card: Card) => {
              const setId = (card.set?.id || card.id?.split('-')[0] || '').toLowerCase();
              const setName = (card.set?.name || '').toLowerCase();
              return (
                !setId.includes('tcgp') &&
                !setName.includes('tcgp') &&
                !setName.includes('pocket') &&
                !setId.startsWith('a-')
              );
            });

            // Sélectionner une carte aléatoire
            if (physicalCards.length > 0) {
              const randomCard = physicalCards[Math.floor(Math.random() * physicalCards.length)];
              if (randomCard) {
                loadedCards.push(randomCard);
                // Afficher immédiatement la carte (affichage progressif)
                setDisplayedCards([...loadedCards]);
              }
            }

            // Vérifier si toutes les requêtes sont terminées
            loadedCount++;
            if (loadedCount >= selected.length) {
              setAllCards(loadedCards);
              setCurrentPage(1);
              setHasMore(true);
              setLoading(false);
            }
          })
          .catch((err) => {
            console.error(`Erreur chargement ${pokemon}:`, err);
            loadedCount++;
            // Retirer le loader même si certaines requêtes échouent
            if (loadedCount >= selected.length) {
              setAllCards(loadedCards);
              setCurrentPage(1);
              setHasMore(true);
              setLoading(false);
            }
          });
      });
    } catch (error) {
      console.error('Erreur lors du chargement des cartes:', error);
      setToast({
        message: 'Erreur lors du chargement des cartes aléatoires',
        type: 'error',
      });
      setLoading(false);
    }
  };

  // Recherche dynamique lors de la saisie (skip initial load)
  useEffect(() => {
    // Ignorer le premier rendu (déjà géré par loadRandomCards)
    if (isInitialLoadRef.current) {
      return;
    }

    const handleSearch = async () => {
      if (!searchQuery.trim()) {
        void loadRandomCards();
        return;
      }

      try {
        setLoading(true);
        const data = await cardsService.searchCards({ q: searchQuery, limit: 0, lang: 'fr' });

        // Filtrer pour exclure les cartes TCGP (jeu en ligne)
        const physicalCards = data.cards.filter((card: Card) => {
          const setId = (card.set?.id || card.id?.split('-')[0] || '').toLowerCase();
          const setName = (card.set?.name || '').toLowerCase();
          // Exclure les sets TCGP (Pokemon Trading Card Game Pocket)
          return (
            !setId.includes('tcgp') &&
            !setName.includes('tcgp') &&
            !setName.includes('pocket') &&
            !setId.startsWith('a-')
          );
        });

        // Stocker toutes les cartes et n'afficher que les 15 premières
        setAllCards(physicalCards);
        setDisplayedCards(physicalCards.slice(0, CARDS_PER_PAGE));
        setCurrentPage(1);
        setHasMore(physicalCards.length > CARDS_PER_PAGE);
      } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        setToast({
          message: 'Erreur lors de la recherche de cartes',
          type: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      void handleSearch();
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Charger plus de cartes (pagination)
  const loadMoreCards = () => {
    if (!hasMore || loadingMore) return;

    const nextPage = currentPage + 1;
    const startIndex = currentPage * CARDS_PER_PAGE;
    const endIndex = startIndex + CARDS_PER_PAGE;

    // Si on est en mode recherche, charger depuis allCards
    if (allCards.length > 0) {
      setLoadingMore(true);
      // Simuler un délai pour une meilleure UX
      setTimeout(() => {
        const moreCards = allCards.slice(startIndex, endIndex);
        if (moreCards.length > 0) {
          setDisplayedCards((prev) => [...prev, ...moreCards]);
          setCurrentPage(nextPage);
          setHasMore(endIndex < allCards.length);
        } else {
          setHasMore(false);
        }
        setLoadingMore(false);
      }, 300);
    } else {
      // Mode cartes aléatoires : charger de nouvelles cartes aléatoires
      setLoadingMore(true);
      void loadRandomCardsMore();
    }
  };

  // Charger plus de cartes aléatoires
  const loadRandomCardsMore = async () => {
    try {
      const randomPokemons = [
        'Pikachu',
        'Dracaufeu',
        'Mewtwo',
        'Evoli',
        'Lucario',
        'Salamèche',
        'Ronflex',
        'Lokhlass',
        'Florizarre',
        'Tortank',
        'Drattak',
        'Suicune',
        'Raikou',
        'Entei',
        'Lugia',
        'Ho-Oh',
        'Celebi',
        'Rayquaza',
        'Kyogre',
        'Groudon',
      ];

      const shuffled = [...randomPokemons].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, CARDS_PER_PAGE);

      const promises = selected.map((pokemon) =>
        cardsService
          .searchCards({ q: pokemon, limit: 10, lang: 'fr' })
          .then((data) => {
            const physicalCards = data.cards.filter((card: Card) => {
              const setId = (card.set?.id || card.id?.split('-')[0] || '').toLowerCase();
              const setName = (card.set?.name || '').toLowerCase();
              return (
                !setId.includes('tcgp') &&
                !setName.includes('tcgp') &&
                !setName.includes('pocket') &&
                !setId.startsWith('a-')
              );
            });

            // Sélectionner une carte aléatoire et la retourner directement
            if (physicalCards.length > 0) {
              const randomCard = physicalCards[Math.floor(Math.random() * physicalCards.length)];
              return randomCard || null;
            }
            return null;
          })
          .catch(() => null)
      );

      const cards = (await Promise.all(promises)).filter(
        (card: Card | null): card is Card => card !== null
      );

      setDisplayedCards((prev) => [...prev, ...cards]);
      setCurrentPage((prev) => prev + 1);
    } catch (error) {
      console.error('Erreur lors du chargement de plus de cartes:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const addToPortfolioMutation = useMutation({
    mutationFn: (card: Card) =>
      portfolioService.addCard({
        cardId: card.id,
        language: 'fr',
        quantity: 1,
        // Métadonnées de la carte
        name: card.name,
        setId: card.set?.id,
        setName: card.set?.name,
        setLogo: card.set?.logo,
        setSymbol: card.set?.symbol,
        setReleaseDate: card.set?.releaseDate,
        number: card.localId,
        setCardCount: card.set?.cardCount?.total,
        rarity: card.rarity,
        imageUrl: card.image || card.images?.small,
        imageUrlHiRes: card.images?.large,
        types: card.types,
        supertype: card.category,
        subtypes: card.subtypes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });

  const handleAddCard = (card: Card) => {
    setSelectedCard(card);
    setShowQuickAdd(true);
  };

  const handleAddDirect = () => {
    if (!selectedCard) return;
    const cardName = selectedCard.name || selectedCard.id;
    addToPortfolioMutation.mutate(selectedCard);
    setShowQuickAdd(false);
    setSelectedCard(null);
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
    setShowQuickAdd(false);
    setShowDetailedAdd(true);
  };

  const handleAddSuccess = () => {
    if (!selectedCard) return;
    const cardName = selectedCard.name || selectedCard.id;
    setShowDetailedAdd(false);
    setSelectedCard(null);
    setToast({
      message: (
        <>
          <strong>{cardName}</strong> a été ajouté au portfolio
        </>
      ),
      type: 'success',
    });
    queryClient.invalidateQueries({ queryKey: ['portfolio'] });
  };

  const showToast = (message: React.ReactNode, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  const getCardImageUrl = (card: Card): string => {
    let img = card.image || card.images?.small || '';

    // Si l'URL provient de assets.tcgdex.net et n'a pas d'extension
    if (img && img.includes('assets.tcgdex.net') && !img.match(/\.(webp|png|jpg|jpeg)$/i)) {
      // Priorité: PNG puis WebP
      img = `${img}/high.png`;
    }

    // Image de dos de carte Pokémon par défaut
    return img || 'https://images.pokemontcg.io/swsh1/back.png';
  };

  // Trier les cartes selon l'option sélectionnée
  const getSortedCards = (): Card[] => {
    const cards = [...displayedCards];

    if (sortOption.field === 'default') {
      return cards;
    }

    return cards.sort((a, b) => {
      let comparison = 0;

      switch (sortOption.field) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        default:
          comparison = 0;
      }

      return sortOption.direction === 'desc' ? -comparison : comparison;
    });
  };

  const sortedCards = getSortedCards();

  // IntersectionObserver pour détecter quand l'utilisateur arrive en bas
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting && hasMore && !loading && !loadingMore) {
          loadMoreCards();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, loadingMore]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Découvrir</h1>
          <p className={styles.subtitle}>Recherchez et ajoutez des cartes à votre portfolio</p>
        </div>
      </header>

      <div className={styles.searchForm}>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher une carte ou un set (ex: Pikachu, Destinées Occultes...)"
          ariaLabel="Rechercher une carte Pokémon ou un set"
          className={styles.searchBar}
        />
        <button
          type="button"
          onClick={() => setShowRecognition(true)}
          className={styles.scanButton}
          aria-label="Scanner une carte avec la caméra"
        >
          <Camera size={18} aria-hidden />
        </button>
        <FilterButton onSortChange={setSortOption} currentSort={sortOption} context="discover" />
      </div>

      {loading && <FullScreenLoader message="Recherche de cartes..." />}

      {!loading && sortedCards.length > 0 ? (
        <>
          <section className={styles.grid}>
            {sortedCards.map((card) => (
              <article key={`${card.id}-${card.localId}`} className={styles.card}>
                {/* ⬇️ Remplacement du div cliquable par un vrai bouton accessible */}
                <button
                  type="button"
                  className={styles.cardImageWrap}
                  onClick={() => setDetailsCard(card)}
                  aria-label={`Voir les détails de ${card.name}`}
                  title={`Voir les détails de ${card.name}`}
                >
                  <img
                    src={getCardImageUrl(card)}
                    alt={card.name}
                    className={styles.cardImage}
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      const currentSrc = target.src;

                      // Si l'URL contient "high.png", essayer avec "high.webp"
                      if (currentSrc.includes('/high.png')) {
                        target.src = currentSrc.replace('/high.png', '/high.webp');
                      }
                      // Si WebP échoue aussi, utiliser l'image de dos
                      else if (currentSrc.includes('/high.webp')) {
                        target.src = 'https://images.pokemontcg.io/swsh1/back.png';
                      }
                      // Sinon, directement l'image de dos
                      else {
                        target.src = 'https://images.pokemontcg.io/swsh1/back.png';
                      }
                    }}
                  />
                  <WishlistHeart
                    cardId={card.id}
                    isInWishlist={wishlistStatuses?.[card.id] || false}
                    cardData={{
                      name: card.name,
                      setId: card.set?.id,
                      setName: card.set?.name,
                      setLogo: card.set?.logo,
                      setSymbol: card.set?.symbol,
                      setReleaseDate: card.set?.releaseDate,
                      number: card.localId,
                      rarity: card.rarity,
                      imageUrl: card.image || card.images?.small,
                      imageUrlHiRes: card.images?.large,
                      types: card.types,
                      category: card.category,
                    }}
                    onToast={showToast}
                  />
                </button>

                <div className={styles.cardInfo}>
                  <h3 className={styles.cardName}>{card.name}</h3>
                  <p className={styles.cardSet}>
                    {card.set?.name || card.id?.split('-')[0]?.toUpperCase() || 'Set inconnu'}
                    {card.localId && ` · #${card.localId.padStart(3, '0')}`}
                    {card.set?.cardCount?.total &&
                      `/${String(card.set.cardCount.total).padStart(3, '0')}`}
                  </p>
                  {card.rarity && <p className={styles.cardRarity}>{card.rarity}</p>}
                </div>

                <button
                  type="button"
                  onClick={() => handleAddCard(card)}
                  className={styles.addBtn}
                  aria-label={`Ajouter ${card.name} au portfolio`}
                >
                  <PlusCircle size={16} />
                  Ajouter
                </button>
              </article>
            ))}
          </section>

          {/* Loader pour charger plus de cartes */}
          {hasMore && (
            <div
              ref={loadMoreRef}
              style={{
                padding: '2rem',
                textAlign: 'center',
                minHeight: '100px',
              }}
            >
              {loadingMore && (
                <div
                  style={{
                    display: 'inline-block',
                    width: '40px',
                    height: '40px',
                    border: '4px solid rgba(0, 0, 0, 0.1)',
                    borderTopColor: '#3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
              )}
            </div>
          )}
        </>
      ) : !loading ? (
        <div className={styles.empty}>
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <h2>Aucune carte trouvée</h2>
          <p>Essayez une autre recherche</p>
        </div>
      ) : null}

      {showQuickAdd && selectedCard && (
        <QuickAddModal
          cardName={selectedCard.name || selectedCard.id}
          setName={selectedCard.set?.name}
          onClose={() => {
            setShowQuickAdd(false);
            setSelectedCard(null);
          }}
          onAddDirect={handleAddDirect}
          onAddWithDetails={handleAddWithDetails}
        />
      )}

      {showDetailedAdd && selectedCard && (
        <AddCardModal
          card={selectedCard}
          onClose={() => {
            setShowDetailedAdd(false);
            setSelectedCard(null);
          }}
          onSuccess={handleAddSuccess}
        />
      )}

      {detailsCard && (
        <CardDetailsModal
          card={detailsCard}
          onClose={() => setDetailsCard(null)}
          onAdd={(card) => {
            setSelectedCard(card);
            setShowQuickAdd(true);
            setDetailsCard(null);
          }}
        />
      )}

      {showRecognition && (
        <CardRecognition
          onCardSelected={(card) => {
            setShowRecognition(false);
            setSelectedCard(card);
          }}
          onClose={() => setShowRecognition(false)}
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
    </main>
  );
}
