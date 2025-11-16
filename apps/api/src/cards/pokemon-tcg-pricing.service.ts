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

interface PokemonTCGSearchResponse {
  data: PokemonTCGCard[];
}

/**
 * Mapping entre les codes de set TCGdex et Pokemon TCG API
 * TCGdex utilise des codes différents de l'API officielle Pokemon TCG
 */
const SET_CODE_MAPPING: Record<string, string> = {
  // Scarlet & Violet
  sv01: 'sv1',
  sv02: 'sv2',
  sv03: 'sv3',
  sv04: 'sv4',
  sv05: 'sv5',
  sv06: 'sv6',
  sv07: 'sv7',
  sv08: 'sv8',
  sv09: 'sv9',
  sv10: 'sv10',
  svp: 'svp', // Scarlet & Violet Promos
  // Sword & Shield
  swsh01: 'swsh1',
  swsh02: 'swsh2',
  swsh03: 'swsh3',
  swsh04: 'swsh4',
  swsh05: 'swsh5',
  swsh06: 'swsh6',
  swsh07: 'swsh7',
  swsh08: 'swsh8',
  swsh09: 'swsh9',
  swsh10: 'swsh10',
  swsh11: 'swsh11',
  swsh12: 'swsh12',
  // Autres sets populaires
  me01: 'cel25', // Celebrations
};

@Injectable()
export class PokemonTCGPricingService {
  private readonly logger = new Logger(PokemonTCGPricingService.name);
  private readonly baseUrl = 'https://api.pokemontcg.io/v2';
  private readonly apiKey: string | undefined;

  // Cache simple pour éviter de surcharger l'API
  private priceCache: Map<string, { data: CardPricing; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 1000 * 60 * 30; // 30 minutes
  private readonly REQUEST_TIMEOUT = 5000; // 5 secondes (réduit pour éviter l'attente infinie)
  private readonly MAX_RETRIES = 1; // 1 seul retry pour ne pas bloquer trop longtemps

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
   * Convertit un ID TCGdex en ID Pokemon TCG API
   * Exemple: "me01-144" -> "cel25-144"
   */
  private convertTcgdexIdToPokemonTCG(tcgdexId: string): string {
    const parts = tcgdexId.split('-');
    if (parts.length < 2) {
      return tcgdexId; // Retourner tel quel si format invalide
    }

    const setCode = parts[0]?.toLowerCase() ?? '';
    const cardNumber = parts.slice(1).join('-'); // Rejoindre au cas où il y a plusieurs "-"

    const mappedSetCode = SET_CODE_MAPPING[setCode] || setCode;
    return `${mappedSetCode}-${cardNumber}`;
  }

  /**
   * Recherche une carte par set et numéro si l'ID direct échoue
   */
  private async searchCardBySetAndNumber(
    setCode: string,
    number: string
  ): Promise<PokemonTCGCard | null> {
    try {
      const headers: Record<string, string> = {};
      if (this.apiKey) {
        headers['X-Api-Key'] = this.apiKey;
      }

      const query = `set.id:${setCode} number:${number}`;
      const url = `${this.baseUrl}/cards?q=${encodeURIComponent(query)}`;

      this.logger.log(`Searching card with query: ${query}`);

      const response = await this.fetchWithTimeout(url, { headers });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as PokemonTCGSearchResponse;

      if (data.data && data.data.length > 0) {
        return data.data[0] ?? null;
      }

      return null;
    } catch (error) {
      this.logger.warn(`Search failed for set:${setCode} number:${number}`);
      return null;
    }
  }

  /**
   * Fetch avec timeout et retry
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    retries = this.MAX_RETRIES
  ): Promise<Response> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        const isLastAttempt = attempt === retries;
        const isTimeout = (error as Error).name === 'AbortError';

        if (isTimeout) {
          this.logger.warn(`Timeout sur ${url} (tentative ${attempt + 1}/${retries + 1})`);
        } else {
          this.logger.warn(
            `Erreur réseau sur ${url} (tentative ${attempt + 1}/${retries + 1}): ${error.message}`
          );
        }

        if (isLastAttempt) {
          throw error;
        }

        // Backoff exponentiel: 1s pour le premier retry
        const delay = Math.pow(2, attempt) * 1000;
        this.logger.log(`Attente de ${delay}ms avant retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries reached');
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

      // Convertir l'ID TCGdex en ID Pokemon TCG
      const convertedId = this.convertTcgdexIdToPokemonTCG(cardId);
      this.logger.log(`Trying ID conversion: ${cardId} -> ${convertedId}`);

      let url = `${this.baseUrl}/cards/${encodeURIComponent(convertedId)}`;
      this.logger.log(`Fetching pricing from Pokemon TCG: ${url}`);

      let response = await this.fetchWithTimeout(url, { headers });
      let cardData: PokemonTCGCard | null = null;

      if (response.ok) {
        const data = (await response.json()) as PokemonTCGResponse;
        cardData = data.data;
      } else if (response.status === 404) {
        // Si l'ID converti ne fonctionne pas, essayer de chercher par set + numéro
        this.logger.log(`ID ${convertedId} not found, trying search by set and number`);

        const parts = convertedId.split('-');
        if (parts.length >= 2) {
          const setCode = parts[0] ?? '';
          const number = parts.slice(1).join('-');

          cardData = await this.searchCardBySetAndNumber(setCode, number);
        }
      } else {
        // 5xx errors (504 Gateway Timeout, 502, 503, etc.)
        this.logger.warn(
          `Pokemon TCG API error ${response.status} for ${cardId}, skipping pricing`
        );
        return null;
      }

      if (!cardData) {
        this.logger.log(`Carte ${cardId} non trouvée sur Pokemon TCG API après toutes tentatives`);
        return null;
      }

      if (!cardData.tcgplayer?.prices) {
        this.logger.log(`Pas de prix TCGPlayer disponibles pour ${cardId}`);
        return null;
      }

      const pricing: CardPricing = {
        cardId,
        updatedAt: cardData.tcgplayer.updatedAt,
        prices: cardData.tcgplayer.prices,
      };

      // Mettre en cache
      this.priceCache.set(cardId, {
        data: pricing,
        timestamp: Date.now(),
      });

      this.logger.log(`Prix récupérés avec succès pour ${cardId} (${cardData.id})`);
      return pricing;
    } catch (err) {
      const error = err as Error;

      // Timeout ou erreur réseau : retourner null au lieu de throw
      if (error.name === 'AbortError') {
        this.logger.error(`Timeout lors de la récupération des prix pour ${cardId}`);
        return null;
      }

      // Autres erreurs réseau
      if (error.message?.includes('fetch')) {
        this.logger.error(`Erreur réseau pour ${cardId}: ${error.message}`);
        return null;
      }

      this.logger.error(
        `Erreur inattendue lors de la récupération des prix pour ${cardId}: ${error.message}`
      );
      return null;
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
