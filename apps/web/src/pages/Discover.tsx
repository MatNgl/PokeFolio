import { useEffect, useState } from 'react';
import type { Card, CardSearchResult } from '@pokefolio/types';
import { cardsService } from '../services/cards.service';
import { AddCardModal } from '../components/cards/AddCardModal';
import { CardDetailsModal } from '../components/cards/CardDetailsModal';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Loader } from '../components/ui/Loader';
import { Toast } from '../components/ui/Toast';
import styles from './Discover.module.css';

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
      // Recherche de cartes populaires pour afficher quelque chose au départ
      const randomSearches = ['Pikachu', 'Dracaufeu', 'Mewtwo', 'Evoli', 'Lucario', 'Salamèche'];
      const randomQuery = randomSearches[Math.floor(Math.random() * randomSearches.length)];
      const data = await cardsService.searchCards({ q: randomQuery, limit: 50, lang: 'fr' });

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
        cards: physicalCards.slice(0, 20),
        total: physicalCards.length,
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

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

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

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Découvrir</h1>
          <p className={styles.subtitle}>Recherchez et ajoutez des cartes à votre portfolio</p>
        </div>
      </header>

      <form onSubmit={handleSearch} className={styles.searchForm}>
        <Input
          type="text"
          placeholder="Rechercher une carte (ex: Pikachu, Dracaufeu...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button type="submit">Rechercher</Button>
        {searchQuery && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSearchQuery('');
              void loadRandomCards();
            }}
          >
            Effacer
          </Button>
        )}
      </form>

      {loading ? (
        <div className={styles.loading}>
          <Loader />
        </div>
      ) : result.cards.length > 0 ? (
        <section className={styles.grid}>
          {result.cards.map((card) => (
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
              >
                + Ajouter
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
