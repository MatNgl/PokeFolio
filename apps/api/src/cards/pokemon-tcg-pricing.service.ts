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
 * Format général: TCGdex ajoute souvent des 0 (ex: sv01, swsh01) que Pokemon TCG API n'utilise pas
 */
const SET_CODE_MAPPING: Record<string, string> = {
  // ===== Scarlet & Violet (2023+) =====
  sv01: 'sv1', // Scarlet & Violet Base
  sv02: 'sv2', // Paldea Evolved
  sv03: 'sv3', // Obsidian Flames
  sv04: 'sv4', // Paradox Rift
  sv05: 'sv5', // Temporal Forces
  sv06: 'sv6', // Twilight Masquerade
  sv07: 'sv7', // Stellar Crown
  sv08: 'sv8', // Surging Sparks
  sv09: 'sv9', // (Future set)
  sv10: 'sv10', // (Future set)
  svp: 'svp', // Scarlet & Violet Promos
  sve: 'sve', // Scarlet & Violet Energies

  // ===== Sword & Shield (2020-2023) =====
  swsh01: 'swsh1', // Sword & Shield Base
  swsh02: 'swsh2', // Rebel Clash
  swsh03: 'swsh3', // Darkness Ablaze
  swsh04: 'swsh4', // Vivid Voltage
  swsh045: 'swsh45', // Shining Fates
  swsh05: 'swsh5', // Battle Styles
  swsh06: 'swsh6', // Chilling Reign
  swsh07: 'swsh7', // Evolving Skies
  swsh08: 'swsh8', // Fusion Strike
  swsh09: 'swsh9', // Brilliant Stars
  swsh10: 'swsh10', // Astral Radiance
  swsh11: 'swsh11', // Lost Origin
  swsh12: 'swsh12', // Silver Tempest
  swsh125: 'swsh12pt5', // Crown Zenith
  swshp: 'swshp', // Sword & Shield Promos
  ssp: 'ssp', // Special Delivery Promos

  // ===== Sets spéciaux Sword & Shield =====
  me01: 'cel25', // Celebrations (25th Anniversary)
  go: 'pgo', // Pokemon GO

  // ===== Sun & Moon (2017-2020) =====
  sm01: 'sm1', // Sun & Moon Base
  sm02: 'sm2', // Guardians Rising
  sm03: 'sm3', // Burning Shadows
  sm035: 'sm35', // Shining Legends
  sm04: 'sm4', // Crimson Invasion
  sm05: 'sm5', // Ultra Prism
  sm06: 'sm6', // Forbidden Light
  sm07: 'sm7', // Celestial Storm
  sm075: 'sm75', // Dragon Majesty
  sm08: 'sm8', // Lost Thunder
  sm09: 'sm9', // Team Up
  sm10: 'sm10', // Unbroken Bonds
  sm11: 'sm11', // Unified Minds
  sm115: 'sm115', // Hidden Fates
  sm12: 'sm12', // Cosmic Eclipse
  smp: 'smp', // Sun & Moon Promos

  // ===== XY (2014-2017) =====
  xy01: 'xy1', // XY Base
  xy02: 'xy2', // Flashfire
  xy03: 'xy3', // Furious Fists
  xy04: 'xy4', // Phantom Forces
  xy05: 'xy5', // Primal Clash
  xy06: 'xy6', // Roaring Skies
  xy07: 'xy7', // Ancient Origins
  xy08: 'xy8', // BREAKthrough
  xy09: 'xy9', // BREAKpoint
  xy10: 'xy10', // Fates Collide
  xy11: 'xy11', // Steam Siege
  xy12: 'xy12', // Evolutions
  xyp: 'xyp', // XY Promos
  g1: 'g1', // Generations
  g2: 'g2', // Generations Radiant Collection

  // ===== Black & White (2011-2014) =====
  bw01: 'bw1', // Black & White Base
  bw02: 'bw2', // Emerging Powers
  bw03: 'bw3', // Noble Victories
  bw04: 'bw4', // Next Destinies
  bw05: 'bw5', // Dark Explorers
  bw06: 'bw6', // Dragons Exalted
  bw07: 'bw7', // Boundaries Crossed
  bw08: 'bw8', // Plasma Storm
  bw09: 'bw9', // Plasma Freeze
  bw10: 'bw10', // Plasma Blast
  bw11: 'bw11', // Legendary Treasures
  bwp: 'bwp', // Black & White Promos

  // ===== HeartGold & SoulSilver (2010-2011) =====
  hgss1: 'hgss1', // HGSS Base
  hgss2: 'hgss2', // Unleashed
  hgss3: 'hgss3', // Undaunted
  hgss4: 'hgss4', // Triumphant
  col1: 'col1', // Call of Legends

  // ===== Platinum (2009-2010) =====
  pl1: 'pl1', // Platinum Base
  pl2: 'pl2', // Rising Rivals
  pl3: 'pl3', // Supreme Victors
  pl4: 'pl4', // Arceus

  // ===== Diamond & Pearl (2007-2009) =====
  dp1: 'dp1', // Diamond & Pearl Base
  dp2: 'dp2', // Mysterious Treasures
  dp3: 'dp3', // Secret Wonders
  dp4: 'dp4', // Great Encounters
  dp5: 'dp5', // Majestic Dawn
  dp6: 'dp6', // Legends Awakened
  dp7: 'dp7', // Stormfront

  // ===== EX Era (2003-2007) =====
  ex1: 'ex1', // EX Ruby & Sapphire
  ex2: 'ex2', // EX Sandstorm
  ex3: 'ex3', // EX Dragon
  ex4: 'ex4', // EX Team Magma vs Team Aqua
  ex5: 'ex5', // EX Hidden Legends
  ex6: 'ex6', // EX FireRed & LeafGreen
  ex7: 'ex7', // EX Team Rocket Returns
  ex8: 'ex8', // EX Deoxys
  ex9: 'ex9', // EX Emerald
  ex10: 'ex10', // EX Unseen Forces
  ex11: 'ex11', // EX Delta Species
  ex12: 'ex12', // EX Legend Maker
  ex13: 'ex13', // EX Holon Phantoms
  ex14: 'ex14', // EX Crystal Guardians
  ex15: 'ex15', // EX Dragon Frontiers
  ex16: 'ex16', // EX Power Keepers

  // ===== Classic Era (1999-2003) =====
  base1: 'base1', // Base Set
  base2: 'base2', // Jungle
  base3: 'base3', // Fossil
  base4: 'base4', // Base Set 2
  base5: 'base5', // Team Rocket
  gym1: 'gym1', // Gym Heroes
  gym2: 'gym2', // Gym Challenge
  neo1: 'neo1', // Neo Genesis
  neo2: 'neo2', // Neo Discovery
  neo3: 'neo3', // Neo Revelation
  neo4: 'neo4', // Neo Destiny
  ecard1: 'ecard1', // Expedition
  ecard2: 'ecard2', // Aquapolis
  ecard3: 'ecard3', // Skyridge
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
        const err = error as Error;
        const isTimeout = err.name === 'AbortError';

        if (isTimeout) {
          this.logger.warn(`Timeout sur ${url} (tentative ${attempt + 1}/${retries + 1})`);
        } else {
          this.logger.warn(
            `Erreur réseau sur ${url} (tentative ${attempt + 1}/${retries + 1}): ${err.message}`
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
