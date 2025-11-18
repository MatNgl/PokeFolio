import { type ReactNode } from 'react';
import { Plus, Check } from 'lucide-react';
import GradedCardFrame from '../grading/GradedCardFrame';
import { WishlistHeart } from '../ui/WishlistHeart';
import { CardOverlayButtons } from './CardOverlayButtons';
import { OwnedBadge } from '../ui/OwnedBadge';
import styles from './CardTile.module.css';

export interface CardTileData {
  id: string;
  cardId: string;
  name?: string;
  imageUrl?: string;
  setId?: string;
  setName?: string;
  setLogo?: string;
  setSymbol?: string;
  setReleaseDate?: string;
  number?: string;
  rarity?: string;
  types?: string[];
  category?: string;
}

export interface CardTileProps {
  /** Données de la carte */
  card: CardTileData;

  /** Mode d'affichage - détermine les interactions disponibles */
  mode: 'discover' | 'portfolio' | 'wishlist' | 'set';

  /** Callback quand on clique sur la carte (pour ouvrir les détails) */
  onClick?: () => void;

  /** Callback pour ajouter la carte au portfolio */
  onAdd?: () => void;

  /** Callback pour toggle le favori (portfolio uniquement) */
  onToggleFavorite?: () => void;

  /** La carte est-elle possédée ? */
  isOwned?: boolean;

  /** La carte est-elle dans la wishlist ? */
  isInWishlist?: boolean;

  /** La carte est-elle un favori ? */
  isFavorite?: boolean;

  /** Quantité possédée */
  quantity?: number;

  /** Informations de grading */
  grading?: {
    isGraded: boolean;
    company?: string;
    score?: string | number;
  };

  /** Afficher le badge "Possédée" */
  showOwnedBadge?: boolean;

  /** Callback pour les toasts */
  onToast?: (message: ReactNode, type: 'success' | 'error' | 'info') => void;

  /** Style supplémentaire pour la carte non possédée */
  dimIfNotOwned?: boolean;
}

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

/**
 * Composant CardTile unifié pour l'affichage des cartes
 * Utilisé sur: Discover, Portfolio, Wishlist, SetDetail
 */
export function CardTile({
  card,
  mode,
  onClick,
  onAdd,
  onToggleFavorite,
  isOwned = false,
  isInWishlist = false,
  isFavorite = false,
  quantity = 1,
  grading,
  showOwnedBadge = false,
  onToast,
  dimIfNotOwned = false,
}: CardTileProps): JSX.Element {
  const imageUrl = resolveImageUrl(card.imageUrl);
  const showGrading = grading?.isGraded && grading.company && grading.score;

  // Déterminer les boutons d'overlay selon le mode
  const renderOverlayButtons = () => {
    switch (mode) {
      case 'discover':
        return (
          <>
            {showOwnedBadge && <OwnedBadge isOwned={isOwned} className={styles.ownedBadge} />}
            {!isOwned && (
              <WishlistHeart
                cardId={card.cardId}
                isInWishlist={isInWishlist}
                cardData={{
                  name: card.name,
                  setId: card.setId,
                  setName: card.setName,
                  setLogo: card.setLogo,
                  setSymbol: card.setSymbol,
                  setReleaseDate: card.setReleaseDate,
                  number: card.number,
                  rarity: card.rarity,
                  imageUrl: card.imageUrl,
                  types: card.types,
                  category: card.category,
                }}
                onToast={onToast}
              />
            )}
            {onAdd && (
              <CardOverlayButtons
                type="add"
                isActive={false}
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd();
                }}
                cardName={card.name}
                position="bottom-right"
              />
            )}
          </>
        );

      case 'portfolio':
        return (
          <>
            {onToggleFavorite && (
              <CardOverlayButtons
                type="favorite"
                isActive={isFavorite}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                cardName={card.name}
              />
            )}
          </>
        );

      case 'wishlist':
        return (
          <>
            {showOwnedBadge && <OwnedBadge isOwned={isOwned} className={styles.ownedBadge} />}
            {onAdd && (
              <CardOverlayButtons
                type="add"
                isActive={false}
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd();
                }}
                cardName={card.name}
                position="bottom-right"
              />
            )}
          </>
        );

      case 'set':
        return (
          <>
            {!isOwned && (
              <WishlistHeart
                cardId={card.cardId}
                isInWishlist={isInWishlist}
                cardData={{
                  name: card.name,
                  setId: card.setId,
                  setName: card.setName,
                  setLogo: card.setLogo,
                  setSymbol: card.setSymbol,
                  setReleaseDate: card.setReleaseDate,
                  number: card.number,
                  rarity: card.rarity,
                  imageUrl: card.imageUrl,
                }}
                onToast={onToast}
              />
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <article className={`${styles.tile} ${dimIfNotOwned && !isOwned ? styles.notOwned : ''}`}>
      <div className={styles.imageWrap}>
        <button
          type="button"
          className={styles.imageButton}
          onClick={onClick}
          aria-label={`Voir les détails de ${card.name || 'la carte'}`}
          title={`Voir les détails de ${card.name || 'la carte'}`}
        >
          {showGrading ? (
            <GradedCardFrame
              company={grading.company as 'PSA' | 'BGS' | 'CGC' | 'PCA' | 'CollectAura' | 'AGS' | 'CCC' | 'SGC' | 'TAG' | 'Other'}
              grade={grading.score!}
              size="medium"
            >
              <img
                src={imageUrl}
                alt={card.name || 'Carte Pokémon'}
                className={styles.image}
                loading="lazy"
                width={245}
                height={342}
                onError={(e) => {
                  const t = e.currentTarget as HTMLImageElement;
                  t.src = 'https://images.pokemontcg.io/swsh1/back.png';
                }}
              />
            </GradedCardFrame>
          ) : (
            <img
              src={imageUrl}
              alt={card.name || 'Carte Pokémon'}
              className={styles.image}
              loading="lazy"
              width={245}
              height={342}
              onError={(e) => {
                const t = e.currentTarget as HTMLImageElement;
                t.src = 'https://images.pokemontcg.io/swsh1/back.png';
              }}
            />
          )}

          {quantity > 1 && (
            <span className={styles.quantity}>×{quantity}</span>
          )}
        </button>

        {renderOverlayButtons()}
      </div>
    </article>
  );
}

export default CardTile;
