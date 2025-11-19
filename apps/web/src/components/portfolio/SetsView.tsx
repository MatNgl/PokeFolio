import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  setsService,
  type PortfolioSet,
  type SetCard,
  type CompleteSetCard,
  type TCGDexSet,
} from '../../services/sets.service';
import { FilterButton, type SortOption as FilterSortOption } from '../ui/FilterButton';
import SearchBar from '../ui/Search';
import UnifiedCardDetailsModal from '../cards/UnifiedCardDetailsModal';
import { ViewSwitcher } from '../ui/ViewSwitcher';
import { Checkbox } from '../ui/Checkbox';
import { useSetLogos, resolveLogoUrl } from '../../hooks/useSetLogos';
import { useSetsPreferences } from '../../hooks/useUserPreferences';
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

  // Préférences persistantes
  const { viewMode, setViewMode, sortBy, setSortBy, sortOrder, setSortOrder, showAll, setShowAll } =
    useSetsPreferences();

  const [sortOption, setSortOption] = useState<FilterSortOption>({
    field: sortBy as 'name' | 'date' | 'quantity' | 'default',
    direction: sortOrder,
  });

  // Mettre à jour les préférences quand le tri change
  const handleSortChange = (newSort: FilterSortOption) => {
    setSortOption(newSort);
    setSortBy(newSort.field);
    setSortOrder(newSort.direction);
  };

  const [selectedCard, setSelectedCard] = useState<{
    card: CompleteSetCard;
    setName: string;
  } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['portfolio', 'sets'],
    queryFn: () => setsService.getSets(),
  });

  // Récupérer tous les sets de TCGDex quand showAll est activé
  const { data: allTCGDexSets, isLoading: isLoadingAllSets } = useQuery({
    queryKey: ['tcgdex', 'all-sets'],
    queryFn: () => setsService.getAllSetsFromTCGDex(),
    enabled: showAll,
  });

  // Fusionner les sets du portfolio avec tous les sets TCGDex
  const mergedSets = useMemo(() => {
    if (!showAll || !allTCGDexSets) {
      return data?.sets || [];
    }

    // Créer un map des sets du portfolio
    const portfolioSetsMap = new Map<string, PortfolioSet>();
    data?.sets.forEach((set) => {
      portfolioSetsMap.set(set.setId, set);
    });

    // Créer la liste fusionnée
    const merged: PortfolioSet[] = allTCGDexSets.map((tcgSet: TCGDexSet) => {
      const portfolioSet = portfolioSetsMap.get(tcgSet.id);

      if (portfolioSet) {
        // Set déjà dans le portfolio
        return portfolioSet;
      }

      // Set pas encore dans le portfolio
      return {
        setId: tcgSet.id,
        setName: tcgSet.name,
        setLogo: tcgSet.logo,
        setSymbol: tcgSet.symbol,
        releaseDate: tcgSet.releaseDate,
        cards: [],
        completion: {
          owned: 0,
          total: tcgSet.cardCount?.official || tcgSet.cardCount?.total,
          percentage: 0,
        },
        totalValue: 0,
        totalQuantity: 0,
      };
    });

    return merged;
  }, [data?.sets, allTCGDexSets, showAll]);

  // Récupérer les logos depuis TCGDex
  const setIds = useMemo(() => mergedSets.map((s) => s.setId) || [], [mergedSets]);
  const logos = useSetLogos(setIds);

  // Filtrage et tri des sets
  const filteredAndSortedSets = useMemo(() => {
    if (mergedSets.length === 0) return [];

    // 1. Filtrage par recherche (nom du set ou nom des cartes Pokémon)
    let filtered = mergedSets;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = mergedSets.filter((set) => {
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
          return (
            multiplier * (new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime())
          );
        case 'name': // Nom du set
          return multiplier * (a.setName || '').localeCompare(b.setName || '');
        case 'default':
        default:
          return multiplier * (b.completion.owned - a.completion.owned); // Par défaut: tri par nb cartes
      }
    });
  }, [mergedSets, searchQuery, sortOption]);

  if (isLoading || (showAll && isLoadingAllSets)) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>{showAll ? 'Chargement de tous les sets...' : 'Chargement de vos sets...'}</p>
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
      {/* Search bar + filter + checkbox */}
      <div className={styles.searchRow}>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher un set ou un Pokémon..."
          ariaLabel="Rechercher dans vos sets"
          className={styles.searchBar}
        />
        <div className={styles.searchRowRight}>
          <FilterButton onSortChange={handleSortChange} currentSort={sortOption} context="sets" />
          <Checkbox
            id="show-all-sets"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
            label="Tous les sets"
          />
        </div>
      </div>

      {/* View switcher row */}
      <div className={styles.viewSwitcherRow}>
        <ViewSwitcher
          currentView={viewMode}
          onViewChange={(mode) => setViewMode(mode as 'grid' | 'detailed')}
          options={{ first: 'detailed', second: 'grid' }}
        />
      </div>

      {filteredAndSortedSets.length === 0 ? (
        <div className={styles.emptyState}>
          <Package className={styles.emptyIcon} />
          <p className={styles.emptyText}>Aucun résultat pour &quot;{searchQuery}&quot;</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Vue grille compacte */
        <div className={styles.setsGrid}>
          {filteredAndSortedSets.map((set: PortfolioSet) => {
            const logoUrl = resolveLogoUrl(logos[set.setId] || set.setLogo);
            return (
              <button
                key={set.setId}
                className={styles.gridCard}
                onClick={() => navigate(`/portfolio/set/${set.setId}`)}
                type="button"
              >
                <div className={styles.gridLogo}>
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={set.setName || 'Set'}
                      className={styles.gridLogoImg}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <Package size={40} />
                  )}
                </div>
                <h3 className={styles.gridName}>{set.setName || 'Set inconnu'}</h3>
                <div className={styles.gridProgress}>
                  <div
                    className={styles.gridProgressFill}
                    style={{ width: `${set.completion.percentage || 0}%` }}
                  />
                </div>
                <span className={styles.gridStats}>
                  {set.completion.owned}/{set.completion.total || '?'} (
                  {set.completion.percentage || 0}%)
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        /* Vue détaillée (existante) */
        <div className={styles.setsList}>
          {filteredAndSortedSets.map((set: PortfolioSet) => {
            const logoUrl = resolveLogoUrl(logos[set.setId] || set.setLogo);
            return (
              <div key={set.setId} className={styles.setCard}>
                <div className={styles.setHeader}>
                  <button
                    className={styles.setLogoBtn}
                    onClick={() => navigate(`/portfolio/set/${set.setId}`)}
                    type="button"
                    title={`Voir le set ${set.setName}`}
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={set.setName || 'Set'}
                        className={styles.setLogo}
                        onError={(e) => {
                          const img = e.currentTarget;
                          const placeholder = img.nextElementSibling as HTMLElement | null;
                          img.style.display = 'none';
                          if (placeholder) {
                            placeholder.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className={styles.setLogoPlaceholder}
                      style={{ display: logoUrl ? 'none' : 'flex' }}
                    >
                      <Package size={32} />
                    </div>
                  </button>
                  <div className={styles.setInfo}>
                    <button
                      className={styles.setName}
                      onClick={() => navigate(`/portfolio/set/${set.setId}`)}
                      type="button"
                    >
                      {set.setName || 'Set inconnu'}
                      <ChevronRight size={20} className={styles.setNameArrow} />
                    </button>
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
                        onClick={() =>
                          setSelectedCard({
                            card: { ...card, owned: true },
                            setName: set.setName || 'Set inconnu',
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setSelectedCard({
                              card: { ...card, owned: true },
                              setName: set.setName || 'Set inconnu',
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
                      <button
                        type="button"
                        className={styles.moreCards}
                        onClick={() => navigate(`/portfolio/set/${set.setId}`)}
                        title={`Voir les ${set.cards.length - 8} autres cartes`}
                      >
                        +{set.cards.length - 8}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de détails de carte */}
      {selectedCard &&
        (() => {
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
              const prevCard = cardsInSet[currentIndex - 1];
              if (prevCard) {
                setSelectedCard({
                  card: { ...prevCard, owned: true } as CompleteSetCard,
                  setName: currentSet.setName || 'Set inconnu',
                });
              }
            }
          };

          const handleNavigateNext = () => {
            if (hasNext) {
              const nextCard = cardsInSet[currentIndex + 1];
              if (nextCard) {
                setSelectedCard({
                  card: { ...nextCard, owned: true } as CompleteSetCard,
                  setName: currentSet.setName || 'Set inconnu',
                });
              }
            }
          };

          return (
            <UnifiedCardDetailsModal
              mode="set"
              card={selectedCard.card}
              setName={selectedCard.setName}
              setId={currentSet.setId}
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
