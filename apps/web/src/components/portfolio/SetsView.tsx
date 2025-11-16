import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { setsService, type PortfolioSet, type SetCard } from '../../services/sets.service';
import { FilterButton, type SortOption as FilterSortOption } from '../ui/FilterButton';
import SearchBar from '../ui/Search';
import SetCardDetailsModal from '../cards/SetCardDetailsModal';
import styles from './SetsView.module.css';
import { Package, ChevronRight } from 'lucide-react';

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

export function SetsView() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<FilterSortOption>({
    field: 'date',
    direction: 'desc'
  });
  const [selectedCard, setSelectedCard] = useState<{ card: SetCard; setName: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['portfolio', 'sets'],
    queryFn: () => setsService.getSets(),
  });

  // Filtrage et tri des sets
  const filteredAndSortedSets = useMemo(() => {
    if (!data?.sets) return [];

    // 1. Filtrage par recherche (nom du set ou nom des cartes Pokémon)
    let filtered = data.sets;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = data.sets.filter((set) => {
        // Recherche dans le nom du set
        if (set.setName?.toLowerCase().includes(query)) return true;
        // Recherche dans les noms des cartes du set
        return set.cards.some((card) => card.name?.toLowerCase().includes(query));
      });
    }

    // 2. Tri
    const sets = [...filtered];
    const { field, direction } = sortOption;
    const multiplier = direction === 'asc' ? 1 : -1;

    return sets.sort((a, b) => {
      switch (field) {
        case 'quantity': // Nombre de cartes possédées
          return multiplier * (b.completion.owned - a.completion.owned);
        case 'date': // Date de sortie
          if (!a.releaseDate) return 1;
          if (!b.releaseDate) return -1;
          return multiplier * (new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
        case 'name': // Nom du set
          return multiplier * (a.setName || '').localeCompare(b.setName || '');
        case 'default':
        default:
          return multiplier * (b.completion.owned - a.completion.owned); // Par défaut: tri par nb cartes
      }
    });
  }, [data?.sets, searchQuery, sortOption]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Chargement de vos sets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>Erreur lors du chargement des sets</p>
      </div>
    );
  }

  if (!data?.sets.length) {
    return (
      <div className={styles.emptyState}>
        <Package className={styles.emptyIcon} />
        <p className={styles.emptyText}>Aucun set dans votre collection</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Search and Filter */}
      <div className={styles.controls}>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher un set ou un Pokémon..."
          ariaLabel="Rechercher dans vos sets"
          className={styles.searchBar}
        />
        <FilterButton
          onSortChange={setSortOption}
          currentSort={sortOption}
          context="sets"
        />
      </div>

      {filteredAndSortedSets.length === 0 ? (
        <div className={styles.emptyState}>
          <Package className={styles.emptyIcon} />
          <p className={styles.emptyText}>Aucun résultat pour &quot;{searchQuery}&quot;</p>
        </div>
      ) : (
        <div className={styles.setsList}>
          {filteredAndSortedSets.map((set: PortfolioSet) => (
          <div key={set.setId} className={styles.setCard}>
            <div className={styles.setHeader}>
              {set.setLogo ? (
                <img src={set.setLogo} alt={set.setName || 'Set'} className={styles.setLogo} />
              ) : (
                <div className={styles.setLogoPlaceholder}>
                  <Package size={32} />
                </div>
              )}
              <div className={styles.setInfo}>
                <h3
                  className={styles.setName}
                  onClick={() => navigate(`/portfolio/set/${set.setId}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      navigate(`/portfolio/set/${set.setId}`);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {set.setName || 'Set inconnu'}
                  <ChevronRight size={20} className={styles.setNameArrow} />
                </h3>
                <div className={styles.setMeta}>
                  <span className={styles.setStats}>
                    {set.completion.owned}
                    {set.completion.total && ` / ${set.completion.total}`} cartes
                  </span>
                  {set.completion.percentage !== undefined && (
                    <span className={styles.completionBadge}>{set.completion.percentage}%</span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.setBody}>
              {set.completion.total && (
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${set.completion.percentage || 0}%` }}
                  />
                </div>
              )}

              <div className={styles.setDetails}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Quantité totale</span>
                  <span className={styles.detailValue}>{set.totalQuantity || 0}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Valeur</span>
                  <span className={styles.detailValue}>{set.totalValue.toFixed(2)}€</span>
                </div>
              </div>

              {/* Cards grid */}
              <div className={styles.cardsGrid}>
                {set.cards.slice(0, 8).map((card) => (
                  <div
                    key={card.itemId}
                    className={styles.cardThumbnail}
                    onClick={() => setSelectedCard({
                      card: { ...card, owned: true },
                      setName: set.setName || 'Set inconnu'
                    })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedCard({
                          card: { ...card, owned: true },
                          setName: set.setName || 'Set inconnu'
                        });
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
                  </div>
                ))}
                {set.cards.length > 8 && (
                  <div className={styles.moreCards}>+{set.cards.length - 8}</div>
                )}
              </div>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Modal de détails de carte */}
      {selectedCard && (() => {
        // Trouver le set contenant la carte sélectionnée
        const currentSet = filteredAndSortedSets.find((s) =>
          s.cards.some((c) => c.itemId === selectedCard.card.itemId)
        );
        if (!currentSet) return null;

        const cardsInSet = currentSet.cards;
        const currentIndex = cardsInSet.findIndex((c) => c.itemId === selectedCard.card.itemId);
        const hasPrevious = currentIndex > 0;
        const hasNext = currentIndex < cardsInSet.length - 1;

        const handleNavigatePrevious = () => {
          if (hasPrevious) {
            setSelectedCard({
              card: cardsInSet[currentIndex - 1],
              setName: currentSet.setName || 'Set inconnu',
            });
          }
        };

        const handleNavigateNext = () => {
          if (hasNext) {
            setSelectedCard({
              card: cardsInSet[currentIndex + 1],
              setName: currentSet.setName || 'Set inconnu',
            });
          }
        };

        return (
          <SetCardDetailsModal
            card={selectedCard.card as Record<string, unknown>}
            setName={selectedCard.setName}
            onClose={() => setSelectedCard(null)}
            onNavigatePrevious={handleNavigatePrevious}
            onNavigateNext={handleNavigateNext}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
          />
        );
      })()}
    </div>
  );
}
