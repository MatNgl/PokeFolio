import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Card, type CardLanguage } from '@pokefolio/types';

@Injectable()
export class TcgdexService {
  private readonly logger = new Logger(TcgdexService.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    // Accepte TCGDEX_BASE (préféré) ou TCGDEX_BASE_URL, puis fallback défaut
    this.baseUrl =
      this.configService.get<string>('TCGDEX_BASE') ??
      this.configService.get<string>('TCGDEX_BASE_URL') ??
      'https://api.tcgdex.net/v2';
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) {
      // 404: l'appelant gère le cas vide/null
      throw new HttpException(`TCGdex API error: ${res.status} ${res.statusText}`, res.status);
    }
    // Cast explicite pour éviter "unknown"
    return (await res.json()) as T;
  }

  async searchCards(query: string, lang: CardLanguage = 'fr'): Promise<Card[]> {
    try {
      const url = `${this.baseUrl}/${lang}/cards?name=${encodeURIComponent(query)}`;
      this.logger.log(`Fetching TCGdex: ${url}`);

      // La v2 renvoie un tableau (ou 404). On tape explicitement le type.
      const data = await this.fetchJson<unknown>(url);
      return Array.isArray(data) ? (data as Card[]) : [];
    } catch (err) {
      if (err instanceof HttpException && err.getStatus() === 404) {
        return [];
      }
      this.logger.error(`TCGdex search error: ${String((err as Error)?.message ?? err)}`);
      throw new HttpException('Erreur lors de la recherche de cartes', HttpStatus.BAD_GATEWAY);
    }
  }

  async getCardById(cardId: string, lang: CardLanguage = 'fr'): Promise<Card | null> {
    try {
      const url = `${this.baseUrl}/${lang}/cards/${encodeURIComponent(cardId)}`;
      this.logger.log(`Fetching card: ${url}`);

      // Typage explicite : Card
      const card = await this.fetchJson<Card>(url);
      return card ?? null;
    } catch (err) {
      if (err instanceof HttpException && err.getStatus() === 404) {
        return null;
      }
      this.logger.error(`TCGdex getCard error: ${String((err as Error)?.message ?? err)}`);
      throw new HttpException('Erreur lors de la récupération de la carte', HttpStatus.BAD_GATEWAY);
    }
  }
}
