import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type CardPricing,
  type PriceHistory,
  type PriceHistoryPoint,
  type MarketPrice,
} from '@pokefolio/types';

/**
 * Réponse de l'API Pokemon TCG pour une carte
 */
interface PokemonTCGCard {
  id: string;
  name: string;
  tcgplayer?: {
    url: string;
    updatedAt: string;
    prices?: {
      normal?: MarketPrice;
      holofoil?: MarketPrice;
      reverseHolofoil?: MarketPrice;
      '1stEditionHolofoil'?: MarketPrice;
      '1stEditionNormal'?: MarketPrice;
    };
  };
}

interface PokemonTCGResponse {
  data: PokemonTCGCard;
}

@Injectable()
export class PokemonTCGPricingService {
  private readonly logger = new Logger(PokemonTCGPricingService.name);
  private readonly baseUrl = 'https://api.pokemontcg.io/v2';
  private readonly apiKey: string | undefined;

  // Cache simple pour éviter de surcharger l'API
  private priceCache: Map<string, { data: CardPricing; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 1000 * 60 * 30; // 30 minutes

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('POKEMON_TCG_API_KEY');
    if (!this.apiKey) {
      this.logger.warn(
        '⚠️  POKEMON_TCG_API_KEY non défini - les requêtes seront limitées à 20/minute'
      );
    } else {
      this.logger.log('✓ Pokemon TCG API Key configurée');
    }
  }

  /**
   * Récupère les prix actuels d'une carte via l'API Pokemon TCG
   */
  async getCardPricing(cardId: string): Promise<CardPricing | null> {
    // Vérifier le cache
    const cached = this.priceCache.get(cardId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.log(`Cache hit pour ${cardId}`);
      return cached.data;
    }

    try {
      const headers: Record<string, string> = {};
      if (this.apiKey) {
        headers['X-Api-Key'] = this.apiKey;
      }

      const url = `${this.baseUrl}/cards/${encodeURIComponent(cardId)}`;
      this.logger.log(`Fetching pricing from Pokemon TCG: ${url}`);

      const response = await fetch(url, { headers });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new HttpException(
          `Pokemon TCG API error: ${response.status} ${response.statusText}`,
          response.status
        );
      }

      const data = (await response.json()) as PokemonTCGResponse;

      if (!data.data?.tcgplayer?.prices) {
        this.logger.log(`Pas de prix TCGPlayer disponibles pour ${cardId}`);
        return null;
      }

      const pricing: CardPricing = {
        cardId,
        updatedAt: data.data.tcgplayer.updatedAt,
        prices: data.data.tcgplayer.prices,
      };

      // Mettre en cache
      this.priceCache.set(cardId, {
        data: pricing,
        timestamp: Date.now(),
      });

      return pricing;
    } catch (err) {
      if (err instanceof HttpException && err.getStatus() === 404) {
        return null;
      }
      this.logger.error(
        `Erreur lors de la récupération des prix pour ${cardId}: ${String((err as Error)?.message ?? err)}`
      );
      throw new HttpException(
        'Erreur lors de la récupération des prix de la carte',
        HttpStatus.BAD_GATEWAY
      );
    }
  }

  /**
   * Génère un historique de prix simulé basé sur les prix actuels
   * Note: L'API Pokemon TCG ne fournit pas d'historique réel, donc on génère
   * des données simulées basées sur le prix actuel avec une variation aléatoire
   */
  async getPriceHistory(
    cardId: string,
    period: '7d' | '30d' | '90d' | '1y' = '30d',
    variant: 'normal' | 'holofoil' | 'reverseHolofoil' = 'normal'
  ): Promise<PriceHistory | null> {
    const pricing = await this.getCardPricing(cardId);
    if (!pricing || !pricing.prices[variant]) {
      return null;
    }

    const currentPrice = pricing.prices[variant]?.market ?? pricing.prices[variant]?.mid ?? 0;

    if (currentPrice === 0) {
      return null;
    }

    // Déterminer le nombre de jours
    const daysMap = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    };
    const days = daysMap[period];

    // Générer des points de données historiques simulés
    const data: PriceHistoryPoint[] = [];
    const now = new Date();

    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      // Variation aléatoire de ±15% autour du prix actuel
      // Plus on est loin dans le passé, plus la variation peut être importante
      const maxVariation = 0.15 + (i / days) * 0.1;
      const variation = (Math.random() - 0.5) * 2 * maxVariation;
      const price = currentPrice * (1 + variation);

      data.push({
        date: date.toISOString().split('T')[0] as string,
        price: Math.round(price * 100) / 100,
        type: 'market',
      });
    }

    return {
      cardId,
      period,
      data,
    };
  }

  /**
   * Nettoie le cache des prix périmés
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.priceCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.priceCache.delete(key);
      }
    }
  }
}
