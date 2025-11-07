import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { type Card, type CardLanguage, type CardSearchResult } from '@pokefolio/types';

import { CardCache } from './schemas/card-cache.schema';
import { TcgdexService } from './tcgdex.service';
import { SearchCardsDto } from './dto/search-cards.dto';

@Injectable()
export class CardsService {
  private readonly logger = new Logger(CardsService.name);
  private readonly CACHE_TTL_DAYS = 7;

  constructor(
    @InjectModel(CardCache.name)
    private readonly cardCacheModel: Model<CardCache>,
    private readonly tcgdexService: TcgdexService
  ) {}

  async searchCards(dto: SearchCardsDto): Promise<CardSearchResult> {
    const query = dto.q?.trim() || '';
    const lang = dto.lang || 'fr';
    const pageRaw = dto.page ?? 1;
    const limitRaw = dto.limit ?? 20;

    // bornes sécurisées - pas de limite max pour permettre tous les résultats
    const page = Math.max(1, pageRaw);
    const limit = limitRaw === 0 ? 0 : Math.max(1, limitRaw);

    if (!query) {
      return { cards: [], total: 0, page, limit };
    }

    // Détecter si la recherche contient un numéro avec préfixe optionnel (ex: "TG30", "GG70", "SWSH001", "010")
    const numberMatch = query.match(/\b([A-Z]{1,5})?(\d{1,3})\b/i);
    const searchPrefix = numberMatch?.[1]?.toUpperCase() || null;
    const searchNumber = numberMatch?.[2] || null;

    // Extraire le nom (tout sauf le préfixe et numéro)
    const searchName = numberMatch ? query.replace(/\b[A-Z]{0,5}\d{1,3}\b/gi, '').trim() : query;

    if (searchNumber) {
      this.logger.log(
        `Recherche détectée - Nom: "${searchName}", Préfixe: "${searchPrefix}", Numéro: "${searchNumber}"`
      );
    }

    const cacheKey = `search:${lang}:${query.toLowerCase()}`;

    // ==== Cache check ====
    const cached = await this.getCachedData<Card[]>(cacheKey);
    if (cached) {
      this.logger.log(`Cache HIT: ${cacheKey}`);
      return this.paginateResults(cached, page, limit);
    }

    this.logger.log(`Cache MISS: ${cacheKey}`);

    let cards: Card[] = [];

    // ==== Fetch depuis TCGdex ====
    if (searchNumber && !searchName) {
      // Recherche uniquement par numéro : impossible avec TCGdex, on retourne vide
      // L'utilisateur devra ajouter au moins un nom partiel
      this.logger.log(
        `Recherche par numéro seul (${searchPrefix || ''}${searchNumber}) - retour vide`
      );
      cards = [];
    } else {
      // Recherche normale par nom
      cards = await this.tcgdexService.searchCards(searchName || query, lang);

      // Fallback EN si vide et lang=fr
      if (cards.length === 0 && lang === 'fr') {
        this.logger.log(`Fallback EN pour: ${searchName || query}`);
        cards = await this.tcgdexService.searchCards(searchName || query, 'en');
      }

      // Filtrer par numéro et préfixe si spécifié
      if (searchNumber) {
        this.logger.log(`Filtrage par numéro: "${searchPrefix || ''}${searchNumber}"`);
        const searchNumInt = parseInt(searchNumber, 10);

        cards = cards.filter((card) => {
          if (!card.localId) return false;

          // Extraire le préfixe et numéro de la carte
          const cardIdMatch = card.localId.match(/^([A-Z]{1,5})?(\d+)$/i);
          const cardPrefix = cardIdMatch?.[1]?.toUpperCase() || null;
          const cardNumInt = cardIdMatch?.[2]
            ? parseInt(cardIdMatch[2], 10)
            : parseInt(card.localId, 10);

          // Vérifier correspondance préfixe (si spécifié)
          const prefixMatch = !searchPrefix || cardPrefix === searchPrefix;

          // Comparer les nombres sans les zéros initiaux
          const numberMatch = cardNumInt === searchNumInt;

          const match = prefixMatch && numberMatch;

          if (match) {
            this.logger.log(
              `✓ Match: ${card.name} #${card.localId} (préfixe: ${cardPrefix}, numéro: ${cardNumInt})`
            );
          }

          return match;
        });
        this.logger.log(
          `${cards.length} carte(s) trouvée(s) avec le numéro ${searchPrefix || ''}${searchNumber}`
        );
      }
    }

    // Normalisation des images
    cards = this.withImageFallback(cards, lang);

    // ==== Mise en cache (non bloquant) ====
    if (cards.length > 0) {
      void this.setCachedData(cacheKey, cards);
    }

    return this.paginateResults(cards, page, limit);
  }

  async getCardById(cardId: string, lang: CardLanguage = 'fr'): Promise<Card | null> {
    const cacheKey = `card:${lang}:${cardId}`;

    const cached = await this.getCachedData<Card>(cacheKey);
    if (cached) {
      this.logger.log(`Cache HIT: ${cacheKey}`);
      return cached;
    }

    this.logger.log(`Cache MISS: ${cacheKey}`);

    // ==== Fetch depuis TCGdex ====
    let card = await this.tcgdexService.getCardById(cardId, lang);

    // Fallback EN si null et lang=fr
    if (!card && lang === 'fr') {
      this.logger.log(`Fallback EN pour card: ${cardId}`);
      card = await this.tcgdexService.getCardById(cardId, 'en');
    }

    // Ajout fallback image (sécurisé)
    if (card) {
      const [patched] = this.withImageFallback([card], lang);
      if (patched) {
        card = patched;
      }
      void this.setCachedData(cacheKey, card);
    }

    return card;
  }

  // ================================================================
  // 🧩 HELPERS
  // ================================================================

  private withImageFallback(cards: Array<Card | null>, lang: CardLanguage): Card[] {
    const baseUrl = process.env.TCGDEX_BASE_URL ?? 'https://api.tcgdex.net/v2';

    return cards
      .filter((c): c is Card => c !== null) // on élimine les nulls
      .map((c) => {
        const id = c.id?.trim();
        const fallback = id ? `${baseUrl}/${lang}/cards/${id}/image` : undefined;
        const img = c.images?.small ?? c.image ?? fallback;

        return {
          ...c,
          image: img,
          images: {
            ...(c.images || {}),
            small: img,
          },
        };
      });
  }

  private async getCachedData<T>(cacheKey: string): Promise<T | null> {
    try {
      const cached = await this.cardCacheModel.findOne({
        cacheKey,
        expiresAt: { $gt: new Date() },
      });
      return cached ? (cached.data as T) : null;
    } catch (err) {
      this.logger.warn(`Cache read failed for ${cacheKey}: ${(err as Error).message}`);
      return null;
    }
  }

  private async setCachedData<T>(cacheKey: string, data: T): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.CACHE_TTL_DAYS);

      await this.cardCacheModel.findOneAndUpdate(
        { cacheKey },
        { cacheKey, data, expiresAt },
        { upsert: true, new: true }
      );
    } catch (err) {
      this.logger.warn(`Cache write failed for ${cacheKey}: ${(err as Error).message}`);
    }
  }

  private paginateResults(cards: Card[], page: number, limit: number): CardSearchResult {
    // Si limit = 0, retourner tous les résultats
    if (limit === 0) {
      return {
        cards,
        total: cards.length,
        page,
        limit,
      };
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = cards.slice(start, end);

    return {
      cards: paginated,
      total: cards.length,
      page,
      limit,
    };
  }
}
