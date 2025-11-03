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
    const page = dto.page || 1;
    const limit = dto.limit || 20;

    if (!query) {
      return { cards: [], total: 0, page, limit };
    }

    const cacheKey = `search:${lang}:${query.toLowerCase()}`;

    // Check cache
    const cached = await this.getCachedData<Card[]>(cacheKey);
    if (cached) {
      this.logger.log(`Cache HIT: ${cacheKey}`);
      return this.paginateResults(cached, page, limit);
    }

    this.logger.log(`Cache MISS: ${cacheKey}`);

    // Fetch from TCGdex (FR)
    let cards = await this.tcgdexService.searchCards(query, lang);

    // Fallback EN si vide et lang=fr
    if (cards.length === 0 && lang === 'fr') {
      this.logger.log(`Fallback EN pour: ${query}`);
      cards = await this.tcgdexService.searchCards(query, 'en');
    }

    // Save to cache
    if (cards.length > 0) {
      await this.setCachedData(cacheKey, cards);
    }

    return this.paginateResults(cards, page, limit);
  }

  async getCardById(cardId: string, lang: CardLanguage = 'fr'): Promise<Card | null> {
    const cacheKey = `card:${lang}:${cardId}`;

    // Check cache
    const cached = await this.getCachedData<Card>(cacheKey);
    if (cached) {
      this.logger.log(`Cache HIT: ${cacheKey}`);
      return cached;
    }

    this.logger.log(`Cache MISS: ${cacheKey}`);

    // Fetch from TCGdex
    let card = await this.tcgdexService.getCardById(cardId, lang);

    // Fallback EN si null et lang=fr
    if (!card && lang === 'fr') {
      this.logger.log(`Fallback EN pour card: ${cardId}`);
      card = await this.tcgdexService.getCardById(cardId, 'en');
    }

    // Save to cache
    if (card) {
      await this.setCachedData(cacheKey, card);
    }

    return card;
  }

  private async getCachedData<T>(cacheKey: string): Promise<T | null> {
    const cached = await this.cardCacheModel.findOne({
      cacheKey,
      expiresAt: { $gt: new Date() },
    });

    return cached ? (cached.data as T) : null;
  }

  private async setCachedData<T>(cacheKey: string, data: T): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.CACHE_TTL_DAYS);

    await this.cardCacheModel.findOneAndUpdate(
      { cacheKey },
      { cacheKey, data, expiresAt },
      { upsert: true, new: true }
    );
  }

  private paginateResults(cards: Card[], page: number, limit: number): CardSearchResult {
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
