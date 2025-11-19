import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { UserCard, PortfolioViewMode, Card } from '@pokefolio/types';
import {
  portfolioService,
  type PortfolioCard,
  type PortfolioStats,
} from '../services/portfolio.service';
import { wishlistService } from '../services/wishlist.service';
import { AddCardModal } from '../components/cards/AddCardModal';
import { EditCardModal } from '../components/cards/EditCardModal';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';
import UnifiedCardDetailsModal from '../components/cards/UnifiedCardDetailsModal';
import { CardRecognition } from '../components/CardRecognition/CardRecognition';
import { QuickAddModal } from '../components/cards/QuickAddModal';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { FullScreenLoader } from '../components/ui/FullScreenLoader';
import SearchBar from '../components/ui/Search';
import { FilterButton, type SortOption } from '../components/ui/FilterButton';
import { Layers, Camera, Package, Heart, Star } from 'lucide-react';
import styles from './Portfolio.module.css';
import { Toast } from '../components/ui/Toast';
import GradedCardFrame from '../components/grading/GradedCardFrame';
import GradingBadge, { type GradingCompany } from '../components/grading/GradingBadge';
import { SetsView } from '../components/portfolio/SetsView';
import { WishlistView } from '../components/portfolio/WishlistView';
import { ViewSwitcher } from '../components/ui/ViewSwitcher';
import { Checkbox } from '../components/ui/Checkbox';
import { usePortfolioPreferences } from '../hooks/useUserPreferences';
import { useAuth } from '../contexts/AuthContext';
import { resolveImageUrl, handleImageError, PLACEHOLDER_IMG } from '../utils/imageUtils';
import { CardOverlayButtons } from '../components/cards/CardOverlayButtons';

/** ---- Types côté UI ---- */
type PortfolioVariant = {
  purchasePrice?: number;
  purchaseDate?: string | Date;
  isGraded?: boolean;
  gradeCompany?: string;
  gradeScore?: string | number;
  notes?: string;
};

type UserCardView = Partial<Omit<UserCard, 'gradeScore' | 'imageUrl'>> & {
  cardId: string; // obligatoire
  name: string; // obligatoire
  quantity: number; // obligatoire
  gradeScore?: string; // string côté UI (l'API peut renvoyer number)
  imageUrl?: string; // assuré par resolveImg
  _id?: string;
  id?: string;
  image?: string;
  images?: { small?: string; large?: string };
  variants?: PortfolioVariant[];
  setCardCount?: number;
  ownerId?: string;
  userId?: string;
  language?: string;
  types?: string[];
  supertype?: string;
  subtypes?: string[];
  currentValue?: number;
  createdAt?: string;
  updatedAt?: string;
  isFavorite?: boolean;
};

/** ---- Types “bruts” possibles venant de l’API (tolérants) ---- */
type ApiCard = {
  _id?: string;
  id?: string;
  userId?: string; // parfois présent
  ownerId?: string; // alias fréquent côté backend
  cardId: string;
  name: string;
  quantity: number;
  imageUrl?: string;
  image?: string;
  images?: { small?: string; large?: string };
  setId?: string;
  setName?: string;
  number?: string;
  rarity?: string;
  isGraded?: boolean;
  gradeCompany?: string;
  gradeScore?: number | string;
  purchasePrice?: number;
  purchaseDate?: string;
  currentValue?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  isFavorite?: boolean;
};

type ApiStats = {
  // Champs de l'API backend
  nbCartes?: number;
  nbCartesDistinctes?: number;
  coutTotalAchat?: number; // En euros (float)
  coutTotalAchatCents?: number; // Ancien nom
  nbSets?: number;
  nbGraded?: number;
  // Champs de l'ancien système
  totalCards?: number;
  distinctCards?: number;
  uniqueCards?: number;
  totalCost?: number;
  totalCurrent?: number;
  totalValue?: number;
  gradedCards?: number;
  graded?: number;
};

/**
 * Ordre de rareté des cartes Pokémon (de la moins rare à la plus rare)
 */
const RARITY_ORDER: Record<string, number> = {
  Common: 1,
  Commune: 1,
  Uncommon: 2,
  'Peu commune': 2,
  'Peu Commune': 2,
  Rare: 3,
  'Holo Rare': 4,
  'Rare Holo': 4,
  'Rare holo': 4,
  'Reverse Holo': 5,
  'Rare Reverse Holo': 5,
  Holo: 6,
  'Double Rare': 7,
  'Double rare': 7,
  'Rare Holo V': 8,
  'Rare Holo VMAX': 9,
  'Rare Holo VSTAR': 10,
  'Rare Holo ex': 11,
  'Ultra Rare': 12,
  'Rare Ultra': 12,
  'Ultra rare': 12,
  'Illustration Rare': 13,
  'Rare Illustration': 13,
  'Illustration rare': 13,
  'Special Illustration Rare': 14,
  'Rare Special Illustration': 14,
  'Rare illustration spéciale': 14,
  'Hyper Rare': 15,
  'Rare Hyper': 15,
  'Hyper rare': 15,
  'Rare Secret': 16,
  'Secret Rare': 16,
  'Secret rare': 16,
  'Rare Rainbow': 17,
  'Rainbow Rare': 17,
  'Rare Shiny': 18,
  'Shiny Rare': 18,
  'Amazing Rare': 19,
  'Radiant Rare': 20,
  'Radiant rare': 20,
  'Trainer Gallery Rare Holo': 21,
  'ACE SPEC Rare': 22,
};

/** ---- Utils ---- */
function euro(n: number | undefined | null): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return '0,00 €';
  return `${n.toFixed(2)} €`;
}

const resolveImg = (c: ApiCard) => {
  const img = c.imageUrl || c.image || c.images?.small;
  return resolveImageUrl(img);
};

const normalizeCard = (c: ApiCard): UserCardView => {
  const gradeScore = typeof c.gradeScore === 'number' ? String(c.gradeScore) : c.gradeScore;

  return {
    ...c,
    userId: c.userId ?? c.ownerId, // mappe ownerId -> userId si besoin
    imageUrl: resolveImg(c),
    gradeScore,
    isGraded: c.isGraded,
    gradeCompany: c.gradeCompany,
  };
};

const normalizeStats = (s: ApiStats): PortfolioStats => {
  // Le backend renvoie nbCartes, nbCartesDistinctes, coutTotalAchat, nbSets, nbGraded
  const totalCards = s.nbCartes ?? s.totalCards ?? 0;
  const uniqueCards = s.nbCartesDistinctes ?? s.uniqueCards ?? s.distinctCards ?? 0;
  const totalCost = s.coutTotalAchat ?? s.totalCost ?? s.coutTotalAchatCents ?? 0;
  const gradedCards = s.nbGraded ?? s.gradedCards ?? s.graded ?? 0;

  return {
    // Champs obligatoires de l'API
    nbCartes: totalCards,
    nbCartesDistinctes: uniqueCards,
    coutTotalAchatCents: totalCost, // Stocké en euros (float)
    nbSets: s.nbSets ?? 0,
    nbGraded: gradedCards,
    // Champs optionnels pour compatibilité
    totalCards,
    uniqueCards,
    totalCost,
    totalValue: totalCost, // Pour l'instant, même valeur que totalCost
    profit: 0, // hors affichage
    gradedCards,
  };
};

// Convertit une entry API (PortfolioCard) en UserCardView pour EditModal
function toUserCardView(entry: PortfolioCard): UserCardView {
  return {
    _id: entry._id,
    id: entry._id,
    cardId: entry.cardId,
    name: entry.name,
    quantity: entry.quantity,
    imageUrl: entry.imageUrl,
    image: entry.imageUrl,
    images: entry.imageUrl ? { small: entry.imageUrl, large: entry.imageUrlHiRes } : undefined,
    setId: entry.setId,
    setName: entry.setName,
    number: entry.number,
    rarity: entry.rarity,
    isGraded: entry.isGraded,
    gradeCompany: entry.gradeCompany,
    gradeScore: typeof entry.gradeScore === 'number' ? String(entry.gradeScore) : entry.gradeScore,
    purchasePrice: entry.purchasePrice,
    purchaseDate: entry.purchaseDate,
    currentValue: entry.currentValue,
    notes: entry.notes,
    variants: entry.variants, // Copier les variantes
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  } as UserCardView;
}

export default function Portfolio() {
  const location = useLocation();
  const { user } = useAuth();

  // Définir le titre de la page
  useEffect(() => {
    document.title = 'PokéFolio - Portfolio';
  }, []);

  const [cards, setCards] = useState<UserCardView[]>([]);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRecognition, setShowRecognition] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [editingCard, setEditingCard] = useState<UserCardView | null>(null);
  const [deletingCard, setDeletingCard] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [portfolioSection, setPortfolioSection] = useState<'cards' | 'sets' | 'wishlist'>('cards');
  const [quickAddCard, setQuickAddCard] = useState<UserCardView | null>(null);

  // Préférences persistantes
  const {
    viewMode,
    setViewMode,
    showOnlyGraded,
    setShowOnlyGraded,
    showOnlyFavorites,
    setShowOnlyFavorites,
  } = usePortfolioPreferences();

  // Détecter si on revient depuis SetDetail et ouvrir la vue Sets
  useEffect(() => {
    const state = location.state as { section?: string };
    if (state?.section === 'sets') {
      setPortfolioSection('sets');
      // Nettoyer l'état pour éviter de le réouvrir à chaque rendu
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // ➕ Nouveau : entrée sélectionnée pour détails
  const [detailsEntry, setDetailsEntry] = useState<PortfolioCard | null>(null);

  // ➕ Recherche et tri
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>({ field: 'default', direction: 'asc' });

  const [toast, setToast] = useState<{
    message: string;
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [cardsData, statsData] = await Promise.all([
        portfolioService.getCards(), // ApiCard[]
        portfolioService.getStats(), // ApiStats
      ]);

      const cardsNormalized = (cardsData as ApiCard[] | undefined)?.map(normalizeCard) ?? [];
      setCards(cardsNormalized);

      if (statsData) {
        setStats(normalizeStats(statsData as ApiStats));
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erreur de chargement:', error);
      setToast({ message: 'Erreur de chargement des données', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleAddSuccess = () => {
    setShowAddModal(false);
    void loadData();
    setToast({ message: 'Carte ajoutée avec succès', type: 'success' });
  };

  const handleEditSuccess = () => {
    setEditingCard(null);
    void loadData();
    setToast({ message: 'Carte modifiée avec succès', type: 'success' });
  };

  const handleDeleteCard = async () => {
    if (!deletingCard) return;
    setDeleting(true);
    try {
      await portfolioService.deleteCard(deletingCard.id);
      await loadData();
      setDeletingCard(null);
      setToast({ message: 'Carte supprimée avec succès', type: 'success' });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erreur de suppression:', error);
      setToast({ message: 'Erreur lors de la suppression de la carte', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleFavorite = async (card: UserCardView) => {
    const docId = card._id ?? card.id;
    if (!docId) return;

    try {
      const updated = await portfolioService.toggleFavorite(docId);
      // Mettre à jour la carte localement
      setCards((prev) =>
        prev.map((c) => ((c._id ?? c.id) === docId ? { ...c, isFavorite: updated.isFavorite } : c))
      );
      setToast({
        message: updated.isFavorite ? 'Carte ajoutée aux favoris' : 'Carte retirée des favoris',
        type: 'success',
      });
    } catch (error) {
      console.error('Erreur toggle favorite:', error);
      setToast({ message: 'Erreur lors de la modification du favori', type: 'error' });
    }
  };

  // Ajouter une variante directement (sans détails)
  const handleAddDirect = async (card: UserCardView) => {
    try {
      await portfolioService.addCard({
        cardId: card.cardId,
        language: 'fr',
        name: card.name,
        setId: card.setId,
        setName: card.setName,
        number: card.number,
        rarity: card.rarity,
        imageUrl: card.imageUrl,
        quantity: 1,
      });
      setQuickAddCard(null);
      setToast({ message: 'Carte ajoutée au portfolio', type: 'success' });
      await loadData();
    } catch (error) {
      console.error("Erreur lors de l'ajout:", error);
      setToast({ message: "Erreur lors de l'ajout de la carte", type: 'error' });
    }
  };

  // Ouvrir le modal d'ajout avec détails
  const handleAddWithDetails = (card: UserCardView) => {
    setQuickAddCard(null);
    // Convertir UserCardView en Card pour AddCardModal
    setSelectedCard({
      id: card.cardId,
      localId: card.number || card.cardId,
      name: card.name,
      images: { small: card.imageUrl, large: card.images?.large },
      set: {
        id: card.setId || '',
        name: card.setName || '',
      },
      number: card.number,
      rarity: card.rarity,
    } as Card);
  };

  const resolveId = (card: UserCardView): string =>
    card._id ?? card.id ?? `${card.cardId}-${card.number ?? ''}`;

  const resolveImage = (card: UserCardView): string => {
    let img = card.imageUrl || card.image || card.images?.small;

    if (img && img.includes('assets.tcgdex.net') && !img.match(/\.(webp|png|jpg|jpeg)$/i)) {
      img = `${img}/high.webp`;
    }

    return img || PLACEHOLDER_IMG;
  };

  // Fonction pour créer l'entrée complète pour le modal
  const createEntryLike = (card: UserCardView) => ({
    _id: (card._id ?? card.id ?? '') as string,
    ownerId: card.ownerId ?? card.userId ?? '',
    cardId: card.cardId,
    language: card.language ?? 'fr',
    name: card.name,
    setId: card.setId,
    setName: card.setName,
    number: card.number,
    rarity: card.rarity,
    imageUrl: card.imageUrl ?? card.image,
    imageUrlHiRes: card.images?.large,
    types: card.types,
    supertype: card.supertype,
    subtypes: card.subtypes,
    quantity: card.quantity ?? 1,
    isGraded: Boolean(card.isGraded),
    gradeCompany: card.gradeCompany,
    gradeScore: card.gradeScore ? Number(card.gradeScore) : undefined,
    purchasePrice: card.purchasePrice,
    purchaseDate: card.purchaseDate
      ? typeof card.purchaseDate === 'string'
        ? new Date(card.purchaseDate)
        : card.purchaseDate
      : undefined,
    currentValue: card.currentValue,
    notes: card.notes,
    createdAt: card.createdAt ?? new Date().toISOString(),
    updatedAt: card.updatedAt ?? new Date().toISOString(),
    variants: card.variants,
  });

  // Calcul du prix total pour une carte
  const calculateCardTotal = (card: UserCardView): number | null => {
    const hasVariants = card.variants && Array.isArray(card.variants) && card.variants.length > 0;

    if (hasVariants && card.variants) {
      return card.variants.reduce(
        (sum: number, v: PortfolioVariant) => sum + (v.purchasePrice ?? 0),
        0
      );
    } else if (typeof card.purchasePrice === 'number') {
      return card.purchasePrice * (card.quantity ?? 1);
    }
    return null;
  };

  // Normalise une string : enlève accents et met en minuscules
  const normalizeString = (str: string): string => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // Vérifie si le terme de recherche correspond au texte (tolérant aux fautes)
  const fuzzyMatch = (text: string, search: string): boolean => {
    const normalizedText = normalizeString(text);
    const normalizedSearch = normalizeString(search);

    // Correspondance exacte ou substring
    if (normalizedText.includes(normalizedSearch)) {
      return true;
    }

    // Fuzzy match : vérifie si les caractères apparaissent dans l'ordre
    // Ex: "hypor" match "Hyporoi" mais pas "Arceus"
    if (normalizedSearch.length >= 3) {
      let textIndex = 0;
      let searchIndex = 0;
      let consecutiveMatches = 0;
      let maxConsecutive = 0;

      while (textIndex < normalizedText.length && searchIndex < normalizedSearch.length) {
        if (normalizedText[textIndex] === normalizedSearch[searchIndex]) {
          searchIndex++;
          consecutiveMatches++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
        } else {
          consecutiveMatches = 0;
        }
        textIndex++;
      }

      // Tous les caractères doivent être trouvés dans l'ordre
      // ET au moins 3 caractères consécutifs doivent matcher
      return searchIndex === normalizedSearch.length && maxConsecutive >= 3;
    }

    return false;
  };

  // Filtrer et trier les cartes
  const getFilteredAndSortedCards = (): UserCardView[] => {
    let filtered = [...cards];

    // Filtre: uniquement les gradées
    if (showOnlyGraded) {
      filtered = filtered.filter((card) => card.isGraded);
    }

    // Filtre: uniquement les favoris
    if (showOnlyFavorites) {
      filtered = filtered.filter((card) => card.isFavorite);
    }

    // Recherche (nom de carte, nom de set, ID de set, rareté)
    if (searchQuery.trim()) {
      const query = searchQuery.trim();
      filtered = filtered.filter((card) => {
        const name = card.name || '';
        const setName = card.setName || '';
        const setId = card.setId || '';
        const rarity = card.rarity || '';

        return (
          fuzzyMatch(name, query) ||
          fuzzyMatch(setName, query) ||
          fuzzyMatch(setId, query) ||
          fuzzyMatch(rarity, query)
        );
      });
    }

    // Tri (sauf si mode "default")
    if (sortOption.field !== 'default') {
      filtered.sort((a, b) => {
        let comparison = 0;

        switch (sortOption.field) {
          case 'name':
            comparison = (a.name || '').localeCompare(b.name || '');
            break;
          case 'quantity':
            comparison = (a.quantity || 0) - (b.quantity || 0);
            break;
          case 'price': {
            const priceA = calculateCardTotal(a) ?? 0;
            const priceB = calculateCardTotal(b) ?? 0;
            comparison = priceA - priceB;
            break;
          }
          case 'date': {
            const dateA = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
            const dateB = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
            comparison = dateA - dateB;
            break;
          }
          case 'graded': {
            // Les cartes gradées en premier (desc par défaut)
            const gradedA = a.isGraded ? 1 : 0;
            const gradedB = b.isGraded ? 1 : 0;
            comparison = gradedB - gradedA; // Inversé pour avoir gradées en premier
            break;
          }
          case 'rarity': {
            // Tri par rareté (utilise l'ordre défini dans RARITY_ORDER)
            const rarityA = RARITY_ORDER[a.rarity || ''] || 999;
            const rarityB = RARITY_ORDER[b.rarity || ''] || 999;
            comparison = rarityA - rarityB;
            break;
          }
          default:
            comparison = 0;
        }

        // Appliquer la direction
        return sortOption.direction === 'desc' ? -comparison : comparison;
      });
    }

    return filtered;
  };

  const displayedCards = getFilteredAndSortedCards();

  return (
    <>
      {loading && <FullScreenLoader message="Chargement de votre portfolio..." />}

      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>
              {portfolioSection === 'wishlist'
                ? 'Ma Wishlist'
                : portfolioSection === 'sets'
                  ? 'Mes Sets'
                  : 'Mon Portfolio'}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button onClick={() => setShowAddModal(true)} variant="primary">
              + Ajouter une carte
            </Button>
          </div>
        </header>

        {/* Sous-menu de navigation Portfolio */}
        <div className={styles.portfolioNav}>
          <button
            type="button"
            className={`${styles.navButton} ${portfolioSection === 'cards' ? styles.navButtonActive : ''}`}
            onClick={() => setPortfolioSection('cards')}
          >
            <Layers size={18} />
            <span>Cartes</span>
          </button>
          <button
            type="button"
            className={`${styles.navButton} ${portfolioSection === 'sets' ? styles.navButtonActive : ''}`}
            onClick={() => setPortfolioSection('sets')}
          >
            <Package size={18} />
            <span>Sets</span>
          </button>
          <button
            type="button"
            className={`${styles.navButton} ${portfolioSection === 'wishlist' ? styles.navButtonActive : ''}`}
            onClick={() => setPortfolioSection('wishlist')}
          >
            <Heart size={18} />
            <span>Wishlist</span>
          </button>
        </div>

        {portfolioSection === 'cards' && cards.length > 0 && (
          <div className={styles.searchFilterContainer}>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Rechercher par carte, set, rareté..."
              ariaLabel="Rechercher dans votre portfolio"
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
            <FilterButton onSortChange={setSortOption} currentSort={sortOption} />
          </div>
        )}

        {portfolioSection === 'cards' && cards.length > 0 && (
          <div className={styles.filtersRow}>
            <Checkbox
              id="filter-graded"
              checked={showOnlyGraded}
              onChange={(e) => setShowOnlyGraded(e.target.checked)}
              label="Gradées uniquement"
            />
            <Checkbox
              id="filter-favorites"
              checked={showOnlyFavorites}
              onChange={(e) => setShowOnlyFavorites(e.target.checked)}
              label="Favoris uniquement"
            />
          </div>
        )}

        {portfolioSection === 'cards' && cards.length > 0 && (
          <div className={styles.viewSwitcherWrapper}>
            <ViewSwitcher
              currentView={viewMode}
              onViewChange={(mode) => setViewMode(mode as 'grid' | 'compact')}
              options={{ first: 'compact', second: 'grid' }}
            />
          </div>
        )}

        {/* Section Sets */}
        {portfolioSection === 'sets' ? (
          <SetsView />
        ) : portfolioSection === 'wishlist' ? (
          <WishlistView onCardAdded={() => void loadData()} />
        ) : cards.length === 0 ? (
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
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <h2>Aucune carte dans votre portfolio</h2>
            <p>Commencez par ajouter des cartes à votre collection</p>
            <Button onClick={() => setShowAddModal(true)} variant="primary">
              + Ajouter votre première carte
            </Button>
          </div>
        ) : displayedCards.length === 0 ? (
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
        ) : viewMode === 'compact' ? (
          // Vue Compact : petite image + infos sur une ligne
          <section className={styles.compact} aria-label="Mes cartes">
            {displayedCards.map((card) => {
              const docId = resolveId(card);
              const img = resolveImage(card);
              const entryLike = createEntryLike(card);
              const total = calculateCardTotal(card);

              return (
                <div
                  key={docId}
                  className={styles.compactCard}
                  onClick={() => setDetailsEntry(entryLike as PortfolioCard)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setDetailsEntry(entryLike as PortfolioCard);
                    }
                  }}
                >
                  <img
                    src={img}
                    alt={card.name}
                    className={styles.compactImage}
                    loading="lazy"
                    onError={handleImageError}
                  />
                  <div className={styles.compactInfo}>
                    <span className={styles.compactName}>{card.name}</span>
                    <div className={styles.compactField}>
                      <span className={styles.compactLabel}>Set:</span>
                      <span className={styles.compactValue}>
                        #{card.number ?? '—'}
                        {card.setCardCount ? `/${card.setCardCount}` : ''}
                      </span>
                    </div>
                    <div className={styles.compactField}>
                      <span className={styles.compactLabel}>Qté:</span>
                      <span className={styles.compactValue}>{card.quantity ?? 1}</span>
                    </div>
                    <div className={styles.compactField}>
                      <span className={styles.compactLabel}>Total:</span>
                      <span className={styles.compactValue}>
                        {total !== null ? euro(total) : '—'}
                      </span>
                    </div>
                    {card.isGraded && card.gradeCompany && card.gradeScore && (
                      <div className={styles.compactField}>
                        <span className={styles.compactLabel}>Gradée:</span>
                        <span className={styles.compactValue}>
                          {card.gradeCompany} {card.gradeScore}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={styles.compactActions}>
                    <button
                      type="button"
                      className={`${styles.favoriteBtn} ${card.isFavorite ? styles.favoriteActive : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(card);
                      }}
                      aria-label={card.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      title={card.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    >
                      <Star size={16} fill={card.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <IconButton
                      icon="edit"
                      label={`Modifier ${card.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCard(card);
                      }}
                    />
                    <IconButton
                      icon="delete"
                      label={`Supprimer ${card.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingCard({ id: docId, name: card.name });
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </section>
        ) : (
          // Vue Grid (normale) : grille de cartes
          <section className={styles.grid} aria-label="Mes cartes">
            {displayedCards.map((card) => {
              const docId = resolveId(card);
              const img = resolveImage(card);
              const entryLike = createEntryLike(card);
              const total = calculateCardTotal(card);

              return (
                <article key={docId} className={styles.card}>
                  {/* ✅ bouton accessible pour ouvrir les détails */}
                  <div className={styles.cardImageWrap}>
                    <button
                      type="button"
                      className={styles.cardImageButton}
                      onClick={() => setDetailsEntry(entryLike as PortfolioCard)}
                      aria-label={`Voir les détails de ${card.name}`}
                      title={`Voir les détails de ${card.name}`}
                    >
                      {card.isGraded &&
                      card.gradeCompany &&
                      card.gradeScore !== undefined &&
                      card.gradeScore !== null &&
                      card.gradeScore !== '' ? (
                        <GradedCardFrame
                          company={
                            card.gradeCompany as
                              | 'PSA'
                              | 'BGS'
                              | 'CGC'
                              | 'PCA'
                              | 'CollectAura'
                              | 'AGS'
                              | 'CCC'
                              | 'SGC'
                              | 'TAG'
                              | 'Other'
                          }
                          grade={card.gradeScore}
                          size="medium"
                        >
                          <img
                            src={img}
                            alt={card.name}
                            className={styles.cardImage}
                            loading="lazy"
                            width={245}
                            height={342}
                            onError={handleImageError}
                          />
                        </GradedCardFrame>
                      ) : (
                        <img
                          src={img}
                          alt={card.name}
                          className={styles.cardImage}
                          loading="lazy"
                          width={245}
                          height={342}
                          onError={handleImageError}
                        />
                      )}
                      {card.quantity > 1 && (
                        <span className={styles.quantity}>×{card.quantity}</span>
                      )}
                    </button>
                    <CardOverlayButtons
                      type="favorite"
                      isActive={card.isFavorite}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(card);
                      }}
                      cardName={card.name}
                    />
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

                  <div className={styles.cardInfo}>
                    <h3 className={styles.cardName}>{card.name}</h3>
                    <p className={styles.cardSet}>
                      {card.setName || 'Set inconnu'} · #{card.number ?? '—'}
                      {card.setCardCount && `/${card.setCardCount}`}
                    </p>
                    {card.rarity && <p className={styles.cardRarity}>{card.rarity}</p>}
                    {total !== null && (
                      <p className={styles.cardValue}>
                        {card.quantity > 1 ? `Total : ${euro(total)}` : euro(total)}
                      </p>
                    )}
                  </div>

                  <div className={styles.cardActions}>
                    <IconButton
                      icon="edit"
                      label={`Modifier ${card.name}`}
                      onClick={() => setEditingCard(card)}
                    />
                    <IconButton
                      icon="delete"
                      label={`Supprimer ${card.name}`}
                      onClick={() => setDeletingCard({ id: docId, name: card.name })}
                    />
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {(showAddModal || selectedCard) && (
          <AddCardModal
            card={selectedCard || undefined}
            onClose={() => {
              setShowAddModal(false);
              setSelectedCard(null);
            }}
            onSuccess={handleAddSuccess}
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

        {editingCard && (
          <EditCardModal
            card={editingCard as UserCard}
            onClose={() => setEditingCard(null)}
            onSuccess={handleEditSuccess}
          />
        )}

        {deletingCard && !deleting && (
          <DeleteConfirmModal
            title="Supprimer la carte"
            message={`Êtes-vous sûr de vouloir supprimer "${deletingCard.name}" de votre portfolio ? Cette action est irréversible.`}
            onConfirm={handleDeleteCard}
            onCancel={() => setDeletingCard(null)}
          />
        )}

        {deleting && <FullScreenLoader message="Suppression en cours..." />}

        {/* 🔍 Modal de détails du portfolio */}
        {detailsEntry &&
          (() => {
            const currentIndex = displayedCards.findIndex(
              (c) => resolveId(c) === (detailsEntry._id || detailsEntry.id)
            );
            const hasPrevious = currentIndex > 0;
            const hasNext = currentIndex < displayedCards.length - 1;

            const handleNavigatePrevious = () => {
              const prevCard = displayedCards[currentIndex - 1];
              if (hasPrevious && prevCard) {
                setDetailsEntry(createEntryLike(prevCard) as PortfolioCard);
              }
            };

            const handleNavigateNext = () => {
              const nextCard = displayedCards[currentIndex + 1];
              if (hasNext && nextCard) {
                setDetailsEntry(createEntryLike(nextCard) as PortfolioCard);
              }
            };

            return (
              <UnifiedCardDetailsModal
                mode="portfolio"
                entry={detailsEntry}
                onClose={() => setDetailsEntry(null)}
                onEdit={(entry) => {
                  setDetailsEntry(null);
                  setEditingCard(toUserCardView(entry));
                }}
                onDelete={(entry) => {
                  setDetailsEntry(null);
                  setDeletingCard({ id: entry._id || '', name: entry.name || 'Carte sans nom' });
                }}
                onRefresh={() => void loadData()}
                onToast={(message, type) => setToast({ message, type })}
                onNavigatePrevious={handleNavigatePrevious}
                onNavigateNext={handleNavigateNext}
                hasPrevious={hasPrevious}
                hasNext={hasNext}
              />
            );
          })()}

        {/* Modal QuickAdd pour ajouter une variante */}
        {quickAddCard && (
          <QuickAddModal
            cardName={quickAddCard.name}
            setName={quickAddCard.setName}
            onClose={() => setQuickAddCard(null)}
            onAddDirect={() => handleAddDirect(quickAddCard)}
            onAddWithDetails={() => handleAddWithDetails(quickAddCard)}
          />
        )}

        {/* ✅ Toast */}
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
    </>
  );
}
