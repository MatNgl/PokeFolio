import { useEffect, useState } from 'react';
import type { Card, CardSearchResult } from '@pokefolio/types';
import { cardsService } from '../services/cards.service';
import { AddCardModal } from '../components/cards/AddCardModal';
import { CardDetailsModal } from '../components/cards/CardDetailsModal';
import { Button } from '../components/ui/Button';
import { Loader } from '../components/ui/Loader';
import { Toast } from '../components/ui/Toast';
import SearchBar from '../components/ui/Search';
import { FilterButton, type SortOption } from '../components/ui/FilterButton';
import styles from './Discover.module.css';
import { PlusCircle } from 'lucide-react';

export default function Discover() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CardSearchResult>({
    cards: [],
    total: 0,
    page: 1,
    limit: 20,
  });
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [detailsCard, setDetailsCard] = useState<Card | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Charger des cartes aléatoires au montage
  useEffect(() => {
    void loadRandomCards();
  }, []);

  // Gérer l'affichage du bouton scroll to top
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadRandomCards = async () => {
    try {
      setLoading(true);
      // Liste étendue de Pokémon populaires et variés
      const randomPokemons = [
        'Pikachu',
        'Dracaufeu',
        'Mewtwo',
        'Evoli',
        'Lucario',
        'Salamèche',
        'Rondoudou',
        'Florizarre',
        'Tortank',
        'Rayquaza',
        'Lugia',
        'Arceus',
        'Mew',
        'Celebi',
        'Darkrai',
        'Giratina',
        'Artikodin',
        'Electhor',
        'Sulfura',
        'Noctali',
        'Mentali',
        'Aquali',
        'Voltali',
        'Pyroli',
        'Phyllali',
        'Goupix',
        'Magicarpe',
        'Leviator',
        'Palkia',
        'Dialga',
        'Kyogre',
        'Groudon',
        'Reshiram',
        'Zekrom',
        'Kyurem',
        'Dracaufeu',
        'Lokhlass',
        'Ronflex',
        'Carapuce',
        'Bulbizarre',
      ];

      // Mélanger la liste
      const shuffled = [...randomPokemons].sort(() => Math.random() - 0.5);

      const cards: Card[] = [];
      let index = 0;

      // Continuer jusqu'à avoir 20 cartes ou épuiser la liste
      while (cards.length < 20 && index < shuffled.length) {
        const pokemon = shuffled[index];
        index++;

        try {
          const data = await cardsService.searchCards({ q: pokemon, limit: 10, lang: 'fr' });

          // Filtrer pour exclure les cartes TCGP
          const physicalCards = data.cards.filter((card) => {
            const setId = (card.set?.id || card.id?.split('-')[0] || '').toLowerCase();
            const setName = (card.set?.name || '').toLowerCase();
            return (
              !setId.includes('tcgp') &&
              !setName.includes('tcgp') &&
              !setName.includes('pocket') &&
              !setId.startsWith('a-')
            );
          });

          // Ajouter une carte aléatoire si disponible
          if (physicalCards.length > 0) {
            const randomIndex = Math.floor(Math.random() * physicalCards.length);
            const randomCard = physicalCards[randomIndex];
            if (randomCard) {
              cards.push(randomCard);
            }
          }
        } catch (error) {
          // Ignorer les erreurs et continuer avec le prochain Pokémon
          console.warn(`Erreur lors de la recherche de ${pokemon}:`, error);
        }
      }

      setResult({
        cards,
        total: cards.length,
        page: 1,
        limit: 20,
      });
    } catch (error) {
      console.error('Erreur lors du chargement des cartes:', error);
      setToast({
        message: 'Erreur lors du chargement des cartes aléatoires',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Recherche dynamique lors de la saisie
  useEffect(() => {
    const handleSearch = async () => {
      if (!searchQuery.trim()) {
        void loadRandomCards();
        return;
      }

      try {
        setLoading(true);
        const data = await cardsService.searchCards({ q: searchQuery, limit: 100, lang: 'fr' });

        // Filtrer pour exclure les cartes TCGP (jeu en ligne)
        const physicalCards = data.cards.filter((card) => {
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

        setResult({
          ...data,
          cards: physicalCards,
          total: physicalCards.length,
        });
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

  const handleAddCard = (card: Card) => {
    setSelectedCard(card);
  };

  const handleAddSuccess = () => {
    setSelectedCard(null);
    setToast({
      message: 'Carte ajoutée avec succès à votre portfolio',
      type: 'success',
    });
  };

  const getCardImageUrl = (card: Card): string => {
    let img = card.image || card.images?.small || '';

    // Si l'URL provient de assets.tcgdex.net et n'a pas d'extension, ajouter /high.webp
    if (img && img.includes('assets.tcgdex.net') && !img.match(/\.(webp|png|jpg|jpeg)$/i)) {
      img = `${img}/high.webp`;
    }

    // Image de dos de carte Pokémon par défaut
    return img || 'https://images.pokemontcg.io/swsh1/back.png';
  };

  // Trier les cartes selon l'option sélectionnée
  const getSortedCards = (): Card[] => {
    const cards = [...result.cards];

    if (sortOption === 'default') {
      return cards;
    }

    return cards.sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'quantity-asc':
        case 'quantity-desc':
        case 'price-asc':
        case 'price-desc':
        case 'date-asc':
        case 'date-desc':
          // Ces options n'ont pas de sens pour Discover (pas de quantité/prix/date)
          return 0;
        default:
          return 0;
      }
    });
  };

  const displayedCards = getSortedCards();

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
          placeholder="Rechercher une carte (ex: Pikachu, Dracaufeu...)"
          ariaLabel="Rechercher une carte Pokémon"
          className={styles.searchBar}
        />
        <FilterButton onSortChange={setSortOption} currentSort={sortOption} context="discover" />
      </div>

      {loading ? (
        <div className={styles.loading}>
          <Loader />
        </div>
      ) : displayedCards.length > 0 ? (
        <section className={styles.grid}>
          {displayedCards.map((card) => (
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
                    // Utiliser l'image de dos de carte Pokémon en cas d'erreur
                    target.src = 'https://images.pokemontcg.io/swsh1/back.png';
                  }}
                />
              </button>

              <div className={styles.cardInfo}>
                <h3 className={styles.cardName}>{card.name}</h3>
                <p className={styles.cardSet}>
                  {card.set?.name || card.id?.split('-')[0]?.toUpperCase() || 'Set inconnu'}
                  {card.localId && (
                    <>
                      {' · #'}
                      {card.localId.padStart(3, '0')}
                      {(card.set?.cardCount?.total || card.set?.cardCount?.official) &&
                        `/${String(
                          card.set?.cardCount?.total || card.set?.cardCount?.official
                        ).padStart(card.localId.length >= 3 ? 2 : 3, '0')}`}
                    </>
                  )}
                </p>
                {card.rarity && <p className={styles.cardRarity}>{card.rarity}</p>}
              </div>

              <Button
                onClick={() => handleAddCard(card)}
                className={styles.addBtn}
                aria-label={`Ajouter ${card.name} au portfolio`}
                variant="success"
                size="sm"
              >
                <PlusCircle size={18} aria-hidden />
                Ajouter
              </Button>
            </article>
          ))}
        </section>
      ) : (
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
      )}

      {selectedCard && (
        <AddCardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onSuccess={handleAddSuccess}
        />
      )}

      {detailsCard && (
        <CardDetailsModal
          card={detailsCard}
          onClose={() => setDetailsCard(null)}
          onAdd={(card) => {
            setSelectedCard(card);
            setDetailsCard(null);
          }}
        />
      )}

      {showScrollTop && (
        <button
          className={styles.scrollTopBtn}
          onClick={scrollToTop}
          aria-label="Retour en haut de la page"
        >
          ↑
        </button>
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
