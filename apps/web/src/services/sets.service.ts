import { api } from './api';

/**
 * Carte dans un set
 */
export interface SetCard {
  itemId: string;
  cardId: string;
  name?: string;
  number?: string;
  imageUrl?: string;
  rarity?: string;
  quantity: number;
  isGraded?: boolean;
  purchasePrice?: number;
}

/**
 * Set TCGDex (pour la liste de tous les sets)
 */
export interface TCGDexSet {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  releaseDate?: string;
  cardCount?: {
    total?: number;
    official?: number;
  };
}

/**
 * Informations de complétion d'un set
 */
export interface SetCompletion {
  owned: number;
  total?: number;
  percentage?: number;
}

/**
 * Set avec ses cartes
 */
export interface PortfolioSet {
  setId: string;
  setName?: string;
  setLogo?: string;
  setSymbol?: string;
  releaseDate?: string;
  cards: SetCard[];
  completion: SetCompletion;
  totalValue: number;
  totalQuantity?: number;
}

/**
 * Réponse de l'endpoint /portfolio/sets
 */
export interface PortfolioSetsResponse {
  sets: PortfolioSet[];
  totalSets: number;
}

/**
 * Carte complète d'un set (incluant les cartes non possédées)
 */
export interface CompleteSetCard extends SetCard {
  owned: boolean; // Indique si la carte est possédée
}

/**
 * Service frontend pour gérer les sets
 */
export const setsService = {
  /**
   * Récupérer tous les sets du portfolio avec leurs cartes
   */
  async getSets(): Promise<PortfolioSetsResponse> {
    const response = await api.get<PortfolioSetsResponse>('/portfolio/sets');
    return response.data;
  },

  /**
   * Récupérer tous les sets depuis TCGDex
   */
  async getAllSetsFromTCGDex(): Promise<TCGDexSet[]> {
    try {
      const response = await fetch('https://api.tcgdex.net/v2/fr/sets');
      if (!response.ok) throw new Error('Failed to fetch sets from TCGdex');
      const sets = await response.json();
      return sets as TCGDexSet[];
    } catch (error) {
      console.error('Error fetching sets from TCGdex:', error);
      throw error;
    }
  },

  /**
   * Vérifier la possession de cartes
   */
  async checkOwnership(cardIds: string[]): Promise<Record<string, boolean>> {
    const response = await api.post<{ ownership: Record<string, boolean> }>(
      '/portfolio/check-ownership',
      { cardIds }
    );
    return response.data.ownership;
  },

  /**
   * Récupérer toutes les cartes d'un set depuis TCGdex
   */
  async getCompleteSet(setId: string): Promise<CompleteSetCard[]> {
    try {
      // Récupérer toutes les cartes du set depuis TCGdex
      const response = await fetch(`https://api.tcgdex.net/v2/fr/sets/${setId}`);
      if (!response.ok) throw new Error('Failed to fetch set from TCGdex');

      const setData = await response.json();
      const allCards = setData.cards || [];

      // Récupérer les cartes possédées
      const portfolioSets = await this.getSets();
      const currentSet = portfolioSets.sets.find((s) => s.setId === setId);
      const ownedCards = currentSet?.cards || [];

      // Créer un map des cartes possédées par cardId
      const ownedMap = new Map<string, SetCard>();
      ownedCards.forEach((card) => {
        ownedMap.set(card.cardId, card);
      });

      // Récupérer les détails de chaque carte pour avoir la rareté
      // On fait ça en parallèle pour optimiser
      const cardDetailsPromises = allCards.map(async (tcgCard: Record<string, unknown>) => {
        try {
          const detailsResponse = await fetch(
            `https://api.tcgdex.net/v2/fr/cards/${tcgCard.id as string}`
          );
          if (detailsResponse.ok) {
            const details = await detailsResponse.json();
            return details as Record<string, unknown>;
          }
          return tcgCard; // Fallback si erreur
        } catch {
          return tcgCard; // Fallback si erreur
        }
      });

      const cardsWithDetails = await Promise.all(cardDetailsPromises);

      // Fusionner les données
      const completeCards: CompleteSetCard[] = cardsWithDetails.map(
        (tcgCard: Record<string, unknown>) => {
          const cardId = `${setId}-${tcgCard.localId as string}`;
          const ownedCard = ownedMap.get(cardId);

          return {
            itemId: ownedCard?.itemId || `placeholder-${cardId}`,
            cardId,
            name: tcgCard.name as string | undefined,
            number: tcgCard.localId as string | undefined,
            imageUrl: tcgCard.image as string | undefined,
            rarity: tcgCard.rarity as string | undefined,
            quantity: ownedCard?.quantity || 0,
            isGraded: ownedCard?.isGraded || false,
            purchasePrice: ownedCard?.purchasePrice,
            owned: !!ownedCard,
          };
        }
      );

      // Trier par numéro
      completeCards.sort((a, b) => {
        const numA = parseInt(a.number || '0');
        const numB = parseInt(b.number || '0');
        return numA - numB;
      });

      return completeCards;
    } catch (error) {
      console.error('Error fetching complete set:', error);
      throw error;
    }
  },
};
