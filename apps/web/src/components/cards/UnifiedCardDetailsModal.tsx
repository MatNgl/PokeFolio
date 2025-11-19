import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import type { Card } from '@pokefolio/types';
import type { CompleteSetCard } from '../../services/sets.service';
import { portfolioService, type PortfolioCard } from '../../services/portfolio.service';
import { wishlistService } from '../../services/wishlist.service';
import { cardsService } from '../../services/cards.service';
import { useSetLogos, resolveLogoUrl } from '../../hooks/useSetLogos';
import GradedCardFrame, { type GradingCompany } from '../grading/GradedCardFrame';
import CardPriceChart from '../pricing/CardPriceChart';
import { Loader } from '../ui/FullScreenLoader';
import { Button } from '../ui/Button';
import { CardOverlayButtons } from './CardOverlayButtons';
import { QuickAddModal } from './QuickAddModal';
import { AddCardModal } from './AddCardModal';
import { EditCardModal } from './EditCardModal';
import { DeleteConfirmModal } from '../ui/DeleteConfirmModal';
import styles from './UnifiedCardDetailsModal.module.css';

type PortfolioVariant = {
  purchasePrice?: number;
  purchaseDate?: string | Date;
  isGraded?: boolean;
  gradeCompany?: string;
  gradeScore?: string | number;
  notes?: string;
  addedAt?: string | Date;
};

type PortfolioCardWithVariants = PortfolioCard & {
  variants?: PortfolioVariant[];
};

// Props pour mode "set" (SetDetail, SetsView, WishlistView)
type SetModeProps = {
  mode: 'set';
  card: CompleteSetCard;
  setName: string;
  setId?: string;
};

// Props pour mode "portfolio" (Portfolio page)
type PortfolioModeProps = {
  mode: 'portfolio';
  entry: PortfolioCard;
  onEdit: (entry: PortfolioCard) => void;
  onDelete: (entry: PortfolioCard) => void;
  onRefresh?: () => void;
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
};

// Props pour mode "discover" (Discover page)
type DiscoverModeProps = {
  mode: 'discover';
  card: Card;
  onAdd: (card: Card) => void;
};

type CommonProps = {
  onClose: () => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
};

type Props = CommonProps & (SetModeProps | PortfolioModeProps | DiscoverModeProps);

function resolveImageUrl(url?: string): string {
  if (!url) return 'https://images.pokemontcg.io/swsh1/back.png';
  if (url.includes('assets.tcgdex.net') && !url.match(/\.(webp|png|jpg|jpeg)$/i)) {
    return `${url}/high.webp`;
  }
  return url;
}

function euro(n?: number | null) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  return `${n.toFixed(2)} €`;
}

export default function UnifiedCardDetailsModal(props: Props) {
  const {
    onClose,
    onNavigatePrevious,
    onNavigateNext,
    hasPrevious = false,
    hasNext = false,
  } = props;

  const navigate = useNavigate();
  const dialogRef = useRef<HTMLElement>(null);
  const [loading, setLoading] = useState(true);
  const [deletingVariant, setDeletingVariant] = useState<number | null>(null);

  // État pour mode "set" - fetch portfolio entry
  const [portfolioEntry, setPortfolioEntry] = useState<PortfolioCard | null>(null);
  // État pour mode "portfolio" - fetch card metadata
  const [cardMetadata, setCardMetadata] = useState<Card | null>(null);

  // États pour les boutons overlay
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isPortfolioMode = props.mode === 'portfolio';
  const isSetMode = props.mode === 'set';
  const isDiscoverMode = props.mode === 'discover';

  // Données sources selon le mode
  const entry = isPortfolioMode ? props.entry : portfolioEntry;
  const setCard = isSetMode ? props.card : null;
  const discoverCard = isDiscoverMode ? props.card : null;

  // Extraire le setId
  const effectiveSetId = useMemo(() => {
    if (isSetMode && props.setId) return props.setId;
    if (isSetMode && props.card) {
      const parts = props.card.cardId.split('-');
      return parts.length > 1 ? parts.slice(0, -1).join('-') : undefined;
    }
    if (isPortfolioMode && props.entry) {
      if (props.entry.setId) return props.entry.setId;
      const parts = props.entry.cardId.split('-');
      return parts.length > 1 ? parts.slice(0, -1).join('-') : undefined;
    }
    if (isDiscoverMode && props.card) {
      // Priorité au set.id si disponible
      if (props.card.set?.id) return props.card.set.id;
      // Fallback: extraire du card.id (e.g., "swsh1-58" → "swsh1")
      const parts = props.card.id?.split('-');
      return parts && parts.length > 1 ? parts.slice(0, -1).join('-') : undefined;
    }
    return undefined;
  }, [props, isSetMode, isPortfolioMode, isDiscoverMode]);

  // Récupérer le logo du set depuis TCGDex
  const setIdsForLogo = useMemo(() => (effectiveSetId ? [effectiveSetId] : []), [effectiveSetId]);
  const logos = useSetLogos(setIdsForLogo);

  // Logo URL: priorité au logo direct de la carte en mode discover, sinon fetch depuis TCGDex
  const logoUrl = useMemo(() => {
    // En mode discover, utiliser le logo direct du set s'il existe
    if (isDiscoverMode && discoverCard?.set?.logo) {
      return resolveLogoUrl(discoverCard.set.logo);
    }
    // Sinon, utiliser le logo fetché depuis TCGDex
    if (effectiveSetId && logos[effectiveSetId]) {
      return resolveLogoUrl(logos[effectiveSetId]);
    }
    return null;
  }, [isDiscoverMode, discoverCard, effectiveSetId, logos]);

  // Bloquer le scroll du body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Focus auto
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // ESC pour fermer + navigation au clavier
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrevious && onNavigatePrevious) {
        e.preventDefault();
        onNavigatePrevious();
      } else if (e.key === 'ArrowRight' && hasNext && onNavigateNext) {
        e.preventDefault();
        onNavigateNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onNavigatePrevious, onNavigateNext, hasPrevious, hasNext]);

  // Fetch data selon le mode
  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        if (isSetMode && props.card) {
          // Mode set: fetch portfolio entry pour cette carte
          const allCards = await portfolioService.getCards();
          const found = allCards.find((c) => c.cardId === props.card.cardId);
          if (mounted) setPortfolioEntry(found || null);
          // Fetch wishlist status
          const wishlistStatus = await wishlistService.checkMultiple([props.card.cardId]);
          if (mounted) setIsInWishlist(wishlistStatus[props.card.cardId] || false);
        } else if (isPortfolioMode && props.entry) {
          // Mode portfolio: fetch card metadata
          const data = await cardsService.getCardById(props.entry.cardId);
          if (mounted) setCardMetadata(data ?? null);
        } else if (isDiscoverMode) {
          // Mode discover: pas de fetch supplémentaire nécessaire
          // On pourrait fetch les données portfolio pour voir si la carte est possédée
          const allCards = await portfolioService.getCards();
          const found = allCards.find((c) => c.cardId === props.card.id);
          if (mounted) setPortfolioEntry(found || null);
          // Fetch wishlist status
          const wishlistStatus = await wishlistService.checkMultiple([props.card.id]);
          if (mounted) setIsInWishlist(wishlistStatus[props.card.id] || false);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, [props, isSetMode, isPortfolioMode, isDiscoverMode]);

  // Handler pour toggle favorite
  const handleToggleFavorite = async () => {
    if (!portfolioData) return;
    const docId = (portfolioData._id || portfolioData.id) as string;
    if (!docId) return;

    try {
      const updated = await portfolioService.toggleFavorite(docId);
      if (isPortfolioMode && 'onToast' in props) {
        props.onToast?.(
          updated.isFavorite ? 'Carte ajoutée aux favoris' : 'Carte retirée des favoris',
          'success'
        );
        props.onRefresh?.();
      }
    } catch (error) {
      console.error('Erreur toggle favorite:', error);
      if (isPortfolioMode && 'onToast' in props) {
        props.onToast?.('Erreur lors de la modification du favori', 'error');
      }
    }
  };

  // Handler pour toggle wishlist
  const handleToggleWishlist = async () => {
    let cardId: string;
    let cardData: {
      name?: string;
      setId?: string;
      setName?: string;
      number?: string;
      rarity?: string;
      imageUrl?: string;
    };

    if (isSetMode) {
      cardId = props.card.cardId;
      cardData = {
        name: props.card.name,
        setId: props.setId,
        setName: props.setName,
        number: props.card.number,
        rarity: props.card.rarity,
        imageUrl: props.card.imageUrl,
      };
    } else if (isDiscoverMode) {
      cardId = props.card.id;
      cardData = {
        name: props.card.name,
        setId: props.card.set?.id,
        setName: props.card.set?.name,
        number: props.card.localId,
        rarity: props.card.rarity,
        imageUrl: props.card.image || props.card.images?.small,
      };
    } else {
      return;
    }

    try {
      if (isInWishlist) {
        await wishlistService.remove(cardId);
        setIsInWishlist(false);
      } else {
        await wishlistService.add(cardId, cardData);
        setIsInWishlist(true);
      }
    } catch (error) {
      console.error('Erreur toggle wishlist:', error);
    }
  };

  // Handler pour ajout direct
  const handleAddDirect = async () => {
    let cardId: string;
    let cardData: {
      name?: string;
      setId?: string;
      setName?: string;
      number?: string;
      rarity?: string;
      imageUrl?: string;
    };

    if (isSetMode) {
      cardId = props.card.cardId;
      cardData = {
        name: props.card.name || 'Carte inconnue',
        setId: props.setId,
        setName: props.setName,
        number: props.card.number,
        rarity: props.card.rarity,
        imageUrl: props.card.imageUrl,
      };
    } else if (isDiscoverMode) {
      cardId = props.card.id;
      cardData = {
        name: props.card.name,
        setId: props.card.set?.id,
        setName: props.card.set?.name,
        number: props.card.localId,
        rarity: props.card.rarity,
        imageUrl: props.card.image || props.card.images?.small,
      };
    } else if (isPortfolioMode) {
      cardId = props.entry.cardId;
      cardData = {
        name: props.entry.name || 'Carte inconnue',
        setId: props.entry.setId,
        setName: props.entry.setName,
        number: props.entry.number,
        rarity: props.entry.rarity,
        imageUrl: props.entry.imageUrl,
      };
    } else {
      return;
    }

    try {
      await portfolioService.addCard({
        cardId,
        language: 'fr',
        ...cardData,
        quantity: 1,
      });
      setShowQuickAddModal(false);
      onClose();
      // Recharger les données pour voir les changements
      window.location.reload();
    } catch (error) {
      console.error("Erreur lors de l'ajout:", error);
    }
  };

  // Handler pour ouvrir le modal d'ajout avec détails
  const handleAddWithDetails = () => {
    setShowQuickAddModal(false);
    setShowAddCardModal(true);
  };

  // Handler pour succès d'ajout via modal
  const handleAddModalSuccess = () => {
    setShowAddCardModal(false);
    onClose();
    // Recharger les données pour voir les changements
    window.location.reload();
  };

  // Handler pour succès d'édition (mode set)
  const handleEditSuccess = () => {
    setShowEditModal(false);
    // Recharger les données
    window.location.reload();
  };

  // Handler pour suppression (mode set)
  const handleDeleteCard = async () => {
    if (!portfolioData) return;
    const docId = (portfolioData._id || portfolioData.id) as string;
    if (!docId) return;

    setDeleting(true);
    try {
      await portfolioService.deleteCard(docId);
      setShowDeleteConfirm(false);
      onClose();
      // Recharger les données
      window.location.reload();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Suppression de variante (mode portfolio uniquement)
  const handleDeleteVariant = async (variantIndex: number) => {
    if (!isPortfolioMode) return;
    const portfolioProps = props as PortfolioModeProps & CommonProps;
    const itemId = (portfolioProps.entry._id || portfolioProps.entry.id) as string;
    if (!itemId) return;

    try {
      setDeletingVariant(variantIndex);
      const result = await portfolioService.deleteVariant(itemId, variantIndex);

      if (result === null) {
        portfolioProps.onToast?.('Variante supprimée avec succès (dernière variante)', 'success');
      } else {
        portfolioProps.onToast?.('Variante supprimée avec succès', 'success');
      }

      onClose();
      portfolioProps.onRefresh?.();
    } catch (error) {
      console.error('Erreur lors de la suppression de la variante:', error);
      portfolioProps.onToast?.('Erreur lors de la suppression de la variante', 'error');
    } finally {
      setDeletingVariant(null);
    }
  };

  // Calcul des valeurs à afficher
  let title: string;
  let setLabel: string;
  let number: string;
  let rarity: string | undefined;
  let imageUrl: string;

  if (isSetMode) {
    title = setCard?.name || 'Carte inconnue';
    setLabel = props.setName;
    number = setCard?.number || '—';
    rarity = setCard?.rarity;
    imageUrl = resolveImageUrl(setCard?.imageUrl);
  } else if (isPortfolioMode) {
    const pEntry = props.entry;
    title = cardMetadata?.name || pEntry.name || 'Carte inconnue';
    setLabel = cardMetadata?.set?.name || pEntry.setName || 'Set inconnu';
    number = String(pEntry.number ?? cardMetadata?.localId ?? '—');
    rarity = pEntry.rarity ?? cardMetadata?.rarity;
    imageUrl = resolveImageUrl(
      pEntry.imageUrlHiRes ||
        cardMetadata?.images?.large ||
        cardMetadata?.image ||
        pEntry.imageUrl ||
        cardMetadata?.images?.small
    );
  } else {
    // isDiscoverMode
    const dCard = props.card;
    title = dCard.name;
    setLabel = dCard.set?.name || dCard.id?.split('-')[0]?.toUpperCase() || 'Set inconnu';
    number = dCard.localId || '—';
    rarity = dCard.rarity;
    imageUrl = resolveImageUrl(dCard.image || dCard.images?.large || dCard.images?.small);
  }

  // Données de l'entrée portfolio (si possédée)
  const portfolioData = entry as PortfolioCardWithVariants | null;
  const hasVariants =
    portfolioData?.variants &&
    Array.isArray(portfolioData.variants) &&
    portfolioData.variants.length > 0;

  // Trier les variantes par date d'achat puis date d'ajout
  const sortedVariants = useMemo(() => {
    if (!hasVariants || !portfolioData?.variants) return null;
    return [...portfolioData.variants].sort((a, b) => {
      const dateA = a.purchaseDate
        ? new Date(a.purchaseDate).getTime()
        : a.addedAt
          ? new Date(a.addedAt).getTime()
          : 0;
      const dateB = b.purchaseDate
        ? new Date(b.purchaseDate).getTime()
        : b.addedAt
          ? new Date(b.addedAt).getTime()
          : 0;
      return dateA - dateB;
    });
  }, [hasVariants, portfolioData?.variants]);

  const qty = portfolioData?.quantity ?? 0;
  const unit = portfolioData?.purchasePrice ?? null;

  // Calcul du prix total
  let total: number | null = null;
  if (hasVariants && sortedVariants) {
    total = sortedVariants.reduce((sum, v) => sum + (v.purchasePrice ?? 0), 0);
  } else if (typeof unit === 'number') {
    total = unit * qty;
  }

  // Grading info
  const isGraded = portfolioData?.isGraded;
  const gradeCompany = portfolioData?.gradeCompany;
  const gradeScore = portfolioData?.gradeScore;

  // CardId pour le graphique de prix
  const cardIdForChart = isSetMode
    ? setCard?.cardId
    : isPortfolioMode
      ? props.entry.cardId
      : props.card.id;

  return (
    <div className={styles.overlay}>
      {/* Flèche gauche */}
      {hasPrevious && onNavigatePrevious && (
        <button
          className={styles.navBtnLeft}
          onClick={onNavigatePrevious}
          aria-label="Carte précédente"
          title="Carte précédente (←)"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      <section
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cardDetailsTitle"
        tabIndex={-1}
      >
        <header className={styles.header}>
          <h2 id="cardDetailsTitle">Détails de la carte</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>

        {loading ? (
          <div className={styles.loading}>
            <Loader />
          </div>
        ) : (
          <div className={styles.content}>
            <div className={styles.left}>
              {isGraded &&
              gradeCompany &&
              gradeScore !== undefined &&
              gradeScore !== null &&
              gradeScore !== '' ? (
                <GradedCardFrame
                  company={gradeCompany as GradingCompany}
                  grade={gradeScore}
                  size="large"
                >
                  <img
                    className={styles.image}
                    src={imageUrl}
                    alt={title}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.pokemontcg.io/swsh1/back.png';
                    }}
                  />
                </GradedCardFrame>
              ) : (
                <img
                  className={styles.image}
                  src={imageUrl}
                  alt={title}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.pokemontcg.io/swsh1/back.png';
                  }}
                />
              )}
              {/* Boutons overlay sur l'image */}
              {portfolioData ? (
                // Carte possédée: bouton favori + bouton ajout
                <>
                  <CardOverlayButtons
                    type="favorite"
                    isActive={portfolioData.isFavorite}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite();
                    }}
                    cardName={title}
                  />
                  <CardOverlayButtons
                    type="add"
                    isActive={false}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowQuickAddModal(true);
                    }}
                    cardName={title}
                    position="top-right-secondary"
                  />
                </>
              ) : (
                // Carte non possédée: bouton wishlist + bouton ajout
                <>
                  <CardOverlayButtons
                    type="wishlist"
                    isActive={isInWishlist}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleWishlist();
                    }}
                    cardName={title}
                  />
                  <CardOverlayButtons
                    type="add"
                    isActive={false}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowQuickAddModal(true);
                    }}
                    cardName={title}
                    position="top-right-secondary"
                  />
                </>
              )}
            </div>

            <div className={styles.right}>
              <h3 className={styles.name}>{title}</h3>

              {/* Logo du set cliquable + tags sur la même ligne */}
              <div className={styles.setInfoRow}>
                {effectiveSetId ? (
                  <button
                    className={styles.setLogoButton}
                    onClick={() => {
                      onClose();
                      navigate(`/portfolio/set/${effectiveSetId}`);
                    }}
                    title={`Voir le set ${setLabel}`}
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={setLabel}
                        className={styles.setLogoSmall}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                          if (fallback) fallback.style.display = 'inline';
                        }}
                      />
                    ) : null}
                    <span
                      className={styles.setNameFallback}
                      style={{ display: logoUrl ? 'none' : 'inline' }}
                    >
                      {setLabel}
                    </span>
                  </button>
                ) : (
                  <span className={styles.setNameText}>{setLabel}</span>
                )}
                <div className={styles.tags}>
                  <span className={styles.tag}>#{number}</span>
                  {rarity && <span className={styles.tag}>{rarity}</span>}
                </div>
              </div>

              {/* Contenu selon le mode et la possession */}
              {isDiscoverMode ? (
                // Mode Discover - afficher infos de base de la carte
                <section className={styles.block}>
                  <h4 className={styles.blockTitle}>Informations de la carte</h4>
                  <div className={styles.grid}>
                    {discoverCard?.category && (
                      <div className={styles.item}>
                        <span className={styles.label}>Type</span>
                        <span className={styles.value}>{discoverCard.category}</span>
                      </div>
                    )}
                    {discoverCard?.types && discoverCard.types.length > 0 && (
                      <div className={styles.item}>
                        <span className={styles.label}>Éléments</span>
                        <span className={styles.value}>{discoverCard.types.join(', ')}</span>
                      </div>
                    )}
                    {discoverCard?.hp && (
                      <div className={styles.item}>
                        <span className={styles.label}>HP</span>
                        <span className={styles.value}>{discoverCard.hp}</span>
                      </div>
                    )}
                    {discoverCard?.stage && (
                      <div className={styles.item}>
                        <span className={styles.label}>Stade</span>
                        <span className={styles.value}>{discoverCard.stage}</span>
                      </div>
                    )}
                  </div>
                  {portfolioEntry && (
                    <div className={styles.ownedBadge}>Possédée ({portfolioEntry.quantity})</div>
                  )}
                </section>
              ) : portfolioData ? (
                <>
                  {/* Carte unique (quantité = 1) */}
                  {qty === 1 && !hasVariants ? (
                    <section className={styles.block}>
                      <h4 className={styles.blockTitle}>Informations de la carte</h4>
                      <div className={styles.grid}>
                        {portfolioData.purchaseDate && (
                          <div className={styles.item}>
                            <span className={styles.label}>Date d&apos;achat</span>
                            <span className={styles.value}>
                              {new Date(portfolioData.purchaseDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {unit !== null && (
                          <div className={styles.item}>
                            <span className={styles.label}>Prix d&apos;achat</span>
                            <span className={styles.value}>{euro(unit)}</span>
                          </div>
                        )}
                        {isGraded && (
                          <>
                            {gradeCompany && (
                              <div className={styles.item}>
                                <span className={styles.label}>Société de gradation</span>
                                <span className={styles.value}>{gradeCompany}</span>
                              </div>
                            )}
                            {typeof gradeScore !== 'undefined' && (
                              <div className={styles.item}>
                                <span className={styles.label}>Note</span>
                                <span className={styles.value}>{gradeScore}</span>
                              </div>
                            )}
                          </>
                        )}
                        {portfolioData.notes && (
                          <div className={styles.item} style={{ gridColumn: '1 / -1' }}>
                            <span className={styles.label}>Notes</span>
                            <p className={styles.noteText}>{portfolioData.notes}</p>
                          </div>
                        )}
                      </div>
                    </section>
                  ) : (
                    /* Cartes multiples (quantité >= 2) */
                    <>
                      <section className={styles.summaryBlock}>
                        <h4 className={styles.blockTitle}>Résumé</h4>
                        <div className={styles.summaryGrid}>
                          <div className={styles.summaryItem}>
                            <span className={styles.label}>Nombre de cartes</span>
                            <span className={styles.value}>{qty}</span>
                          </div>
                          <div className={styles.summaryItem}>
                            <span className={styles.label}>Prix total d&apos;achat</span>
                            <span className={styles.value}>{euro(total ?? undefined)}</span>
                          </div>
                        </div>
                      </section>

                      {hasVariants && sortedVariants ? (
                        <section className={styles.block}>
                          <h4 className={styles.blockTitle}>Détails des variantes</h4>
                          {sortedVariants.map((v, i) => (
                            <div key={i} className={styles.variantCard}>
                              <div className={styles.variantHeader}>
                                <span className={styles.variantTitle}>Variante #{i + 1}</span>
                              </div>
                              {isPortfolioMode && (
                                <button
                                  type="button"
                                  className={styles.deleteVariantBtn}
                                  onClick={() => handleDeleteVariant(i)}
                                  disabled={deletingVariant === i}
                                  aria-label={`Supprimer la variante #${i + 1}`}
                                  title={`Supprimer la variante #${i + 1}`}
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                              <div className={styles.grid}>
                                {v.purchaseDate && (
                                  <div className={styles.item}>
                                    <span className={styles.label}>Date d&apos;achat</span>
                                    <span className={styles.value}>
                                      {new Date(v.purchaseDate).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                                {v.purchasePrice !== undefined && (
                                  <div className={styles.item}>
                                    <span className={styles.label}>Prix d&apos;achat</span>
                                    <span className={styles.value}>{euro(v.purchasePrice)}</span>
                                  </div>
                                )}
                                {v.isGraded && (
                                  <>
                                    {v.gradeCompany && (
                                      <div className={styles.item}>
                                        <span className={styles.label}>Société de gradation</span>
                                        <span className={styles.value}>{v.gradeCompany}</span>
                                      </div>
                                    )}
                                    {v.gradeScore !== undefined && (
                                      <div className={styles.item}>
                                        <span className={styles.label}>Note</span>
                                        <span className={styles.value}>{v.gradeScore}</span>
                                      </div>
                                    )}
                                  </>
                                )}
                                {v.notes && (
                                  <div className={styles.item} style={{ gridColumn: '1 / -1' }}>
                                    <span className={styles.label}>Notes</span>
                                    <p className={styles.noteText}>{v.notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </section>
                      ) : (
                        <section className={styles.block}>
                          <h4 className={styles.blockTitle}>Informations</h4>
                          <div className={styles.grid}>
                            {unit !== null && (
                              <div className={styles.item}>
                                <span className={styles.label}>Prix unitaire</span>
                                <span className={styles.value}>{euro(unit)}</span>
                              </div>
                            )}
                            {portfolioData.purchaseDate && (
                              <div className={styles.item}>
                                <span className={styles.label}>Date d&apos;achat</span>
                                <span className={styles.value}>
                                  {new Date(portfolioData.purchaseDate).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </section>
                      )}
                    </>
                  )}
                </>
              ) : (
                /* Carte non possédée */
                <section className={styles.block}>
                  <p className={styles.notOwned}>Carte non possédée</p>
                </section>
              )}

              {/* Évolution des prix */}
              {cardIdForChart && <CardPriceChart cardId={cardIdForChart} />}

              {/* Actions selon le mode */}
              <div className={styles.actions}>
                {isPortfolioMode && (
                  <>
                    <Button
                      variant="warning"
                      onClick={() => (props as PortfolioModeProps).onEdit(props.entry)}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => (props as PortfolioModeProps).onDelete(props.entry)}
                    >
                      Supprimer
                    </Button>
                  </>
                )}
                {isSetMode && (
                  <>
                    {portfolioData ? (
                      // Carte possédée: Modifier + Supprimer
                      <>
                        <Button
                          variant="warning"
                          onClick={() => setShowEditModal(true)}
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          Supprimer
                        </Button>
                      </>
                    ) : (
                      // Carte non possédée: Ajouter
                      <Button
                        onClick={() => setShowQuickAddModal(true)}
                      >
                        + Ajouter au portfolio
                      </Button>
                    )}
                  </>
                )}
                {isDiscoverMode && (
                  <Button
                    onClick={() => {
                      (props as DiscoverModeProps).onAdd(props.card);
                      onClose();
                    }}
                  >
                    + Ajouter au portfolio
                  </Button>
                )}
                <Button variant="secondary" onClick={onClose}>
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Flèche droite */}
      {hasNext && onNavigateNext && (
        <button
          className={styles.navBtnRight}
          onClick={onNavigateNext}
          aria-label="Carte suivante"
          title="Carte suivante (→)"
        >
          <ChevronRight size={28} />
        </button>
      )}

      {/* Modal QuickAdd */}
      {showQuickAddModal && (
        <QuickAddModal
          cardName={title}
          setName={setLabel}
          onClose={() => setShowQuickAddModal(false)}
          onAddDirect={handleAddDirect}
          onAddWithDetails={handleAddWithDetails}
        />
      )}

      {/* Modal d'ajout avec détails */}
      {showAddCardModal && (
        <AddCardModal
          card={
            isSetMode
              ? {
                  id: props.card.cardId,
                  localId: props.card.number || props.card.cardId,
                  name: props.card.name || 'Carte inconnue',
                  images: { small: props.card.imageUrl, large: props.card.imageUrl },
                  set: {
                    id: props.setId || '',
                    name: props.setName || '',
                  },
                  rarity: props.card.rarity,
                }
              : isDiscoverMode
                ? props.card
                : isPortfolioMode
                  ? {
                      id: props.entry.cardId,
                      localId: props.entry.number || props.entry.cardId,
                      name: props.entry.name || 'Carte inconnue',
                      images: { small: props.entry.imageUrl, large: props.entry.imageUrlHiRes },
                      set: {
                        id: props.entry.setId || '',
                        name: props.entry.setName || '',
                      },
                      rarity: props.entry.rarity,
                    }
                  : undefined
          }
          onClose={() => setShowAddCardModal(false)}
          onSuccess={handleAddModalSuccess}
        />
      )}

      {/* Modal d'édition (mode set) */}
      {showEditModal && portfolioData && (
        <EditCardModal
          entry={portfolioData}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          title="Supprimer la carte"
          message={`Êtes-vous sûr de vouloir supprimer "${title}" de votre portfolio ?`}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteCard}
          loading={deleting}
        />
      )}
    </div>
  );
}
