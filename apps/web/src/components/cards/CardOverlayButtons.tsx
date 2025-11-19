import { Star, Heart, Plus } from 'lucide-react';
import styles from './CardOverlayButtons.module.css';

export type OverlayButtonType = 'favorite' | 'wishlist' | 'add';

interface CardOverlayButtonsProps {
  /** Type of button to show */
  type: OverlayButtonType;
  /** Is the item active (favorited/in wishlist) */
  isActive?: boolean;
  /** Click handler */
  onClick: (e: React.MouseEvent) => void;
  /** Card name for accessibility */
  cardName?: string;
  /** Position of the button */
  position?: 'top-right' | 'top-right-secondary' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Size of the button */
  size?: 'small' | 'medium';
}

/**
 * Overlay button that appears on card hover
 * - Star (yellow) for favorites on owned cards
 * - Heart (red) for wishlist on non-owned cards
 * - Plus (cyan) for adding to collection
 */
export function CardOverlayButtons({
  type,
  isActive = false,
  onClick,
  cardName = 'carte',
  position = 'top-right',
  size = 'medium',
}: CardOverlayButtonsProps) {
  const getButtonConfig = () => {
    switch (type) {
      case 'favorite':
        return {
          icon: Star,
          activeClass: styles.favoriteActive,
          label: isActive ? `Retirer ${cardName} des favoris` : `Ajouter ${cardName} aux favoris`,
          title: isActive ? 'Retirer des favoris' : 'Ajouter aux favoris',
        };
      case 'wishlist':
        return {
          icon: Heart,
          activeClass: styles.wishlistActive,
          label: isActive
            ? `Retirer ${cardName} de la wishlist`
            : `Ajouter ${cardName} à la wishlist`,
          title: isActive ? 'Retirer de la wishlist' : 'Ajouter à la wishlist',
        };
      case 'add':
        return {
          icon: Plus,
          activeClass: styles.addActive,
          label: `Ajouter ${cardName} au portfolio`,
          title: 'Ajouter au portfolio',
        };
    }
  };

  const config = getButtonConfig();
  const Icon = config.icon;
  const iconSize = size === 'small' ? 14 : 18;

  return (
    <button
      type="button"
      className={`${styles.overlayButton} ${styles[type]} ${styles[position]} ${styles[size]} ${isActive ? config.activeClass : ''}`}
      onClick={onClick}
      aria-label={config.label}
      title={config.title}
    >
      <Icon size={iconSize} fill={isActive ? 'currentColor' : 'none'} />
    </button>
  );
}

export default CardOverlayButtons;
