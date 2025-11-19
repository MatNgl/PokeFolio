import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { wishlistService } from '../../services/wishlist.service';
import styles from './WishlistHeart.module.css';

interface WishlistHeartProps {
  cardId: string;
  isInWishlist: boolean;
  cardData?: {
    name?: string;
    setId?: string;
    setName?: string;
    setLogo?: string;
    setSymbol?: string;
    setReleaseDate?: string;
    number?: string;
    rarity?: string;
    imageUrl?: string;
    imageUrlHiRes?: string;
    types?: string[];
    category?: string;
  };
  size?: number;
  className?: string;
  onToast?: (message: React.ReactNode, type: 'success' | 'error' | 'info') => void;
}

export function WishlistHeart({
  cardId,
  isInWishlist: initialIsInWishlist,
  cardData,
  size = 20,
  className = '',
  onToast,
}: WishlistHeartProps) {
  const [isInWishlist, setIsInWishlist] = useState(initialIsInWishlist);
  const [isAnimating, setIsAnimating] = useState(false);
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: () =>
      wishlistService.addToWishlist({
        cardId,
        ...cardData,
      }),
    onSuccess: () => {
      setIsInWishlist(true);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-check'] });
      if (onToast && cardData?.name) {
        onToast(
          <>
            <strong>{cardData.name}</strong> a été ajouté à la wishlist
          </>,
          'success'
        );
      }
    },
    onError: (error: Error) => {
      console.error('Error adding to wishlist:', error);
      if (onToast) {
        onToast("Erreur lors de l'ajout à la wishlist", 'error');
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => wishlistService.removeFromWishlist(cardId),
    onSuccess: () => {
      setIsInWishlist(false);
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-check'] });
      if (onToast && cardData?.name) {
        onToast(
          <>
            <strong>{cardData.name}</strong> a été retiré de la wishlist
          </>,
          'info'
        );
      }
    },
    onError: (error: Error) => {
      console.error('Error removing from wishlist:', error);
      if (onToast) {
        onToast('Erreur lors du retrait de la wishlist', 'error');
      }
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher le clic de se propager à la carte

    if (isInWishlist) {
      removeMutation.mutate();
    } else {
      addMutation.mutate();
    }
  };

  const isLoading = addMutation.isPending || removeMutation.isPending;

  return (
    <button
      type="button"
      className={`${styles.heart} ${isInWishlist ? styles.active : ''} ${
        isAnimating ? styles.animating : ''
      } ${className}`}
      onClick={handleClick}
      disabled={isLoading}
      aria-label={isInWishlist ? 'Retirer de la wishlist' : 'Ajouter à la wishlist'}
      title={isInWishlist ? 'Retirer de la wishlist' : 'Ajouter à la wishlist'}
    >
      <Heart
        size={size}
        fill={isInWishlist ? 'currentColor' : 'none'}
        strokeWidth={2}
      />
    </button>
  );
}
