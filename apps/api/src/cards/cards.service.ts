import { Injectable, Logger } from '@nestjs/common';
import { type Card, type CardLanguage, type CardSearchResult } from '@pokefolio/types';

import { TcgdexService } from './tcgdex.service';
import { SearchCardsDto } from './dto/search-cards.dto';

@Injectable()
export class CardsService {
  private readonly logger = new Logger(CardsService.name);

  constructor(private readonly tcgdexService: TcgdexService) {}

  /**
   * Normalise une string : enlève les accents et met en minuscules
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Vérifie si le terme de recherche correspond au texte (tolérant aux fautes)
   */
  private fuzzyMatch(text: string, search: string): boolean {
    const normalizedText = this.normalizeString(text);
    const normalizedSearch = this.normalizeString(search);

    // Correspondance exacte
    if (normalizedText.includes(normalizedSearch)) {
      return true;
    }

    // Tolérance aux fautes de frappe : vérifie si assez de caractères correspondent
    if (normalizedSearch.length >= 3) {
      let matches = 0;
      for (let i = 0; i < normalizedSearch.length; i++) {
        const char = normalizedSearch.charAt(i);
        if (char && normalizedText.includes(char)) {
          matches++;
        }
      }
      // Si au moins 66% des caractères correspondent (2/3), on considère que c'est un match
      return matches / normalizedSearch.length >= 0.66;
    }

    return false;
  }

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

      // Filtrage fuzzy supplémentaire (ignore les accents et tolère les fautes)
      if (searchName && cards.length > 0) {
        const originalLength = cards.length;
        cards = cards.filter((card) => {
          const cardName = card.name || '';
          const setName = card.set?.name || '';

          return this.fuzzyMatch(cardName, searchName) || this.fuzzyMatch(setName, searchName);
        });

        if (cards.length < originalLength) {
          this.logger.log(
            `Filtrage fuzzy: ${originalLength} -> ${cards.length} cartes (recherche: "${searchName}")`
          );
        }
      }

      // Filtrer par numéro et préfixe si spécifié
      if (searchNumber) {
        this.logger.log(`Filtrage par numéro: "${searchPrefix || ''}${searchNumber}"`);

        cards = cards.filter((card) => {
          if (!card.localId) return false;

          // Extraire le préfixe et numéro de la carte
          const cardIdMatch = card.localId.match(/^([A-Z]{1,5})?(\d+)$/i);
          const cardPrefix = cardIdMatch?.[1]?.toUpperCase() || null;
          const cardNumberStr = cardIdMatch?.[2] || card.localId;

          // Vérifier correspondance préfixe (si spécifié)
          const prefixMatch = !searchPrefix || cardPrefix === searchPrefix;

          // Matching flexible des numéros : "11" trouve "11", "114", "119", etc.
          // Le numéro recherché doit apparaître au début du numéro de la carte
          const numberMatch = cardNumberStr.startsWith(searchNumber);

          const match = prefixMatch && numberMatch;

          if (match) {
            this.logger.log(
              `✓ Match: ${card.name} #${card.localId} (préfixe: ${cardPrefix}, numéro: ${cardNumberStr})`
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

    return this.paginateResults(cards, page, limit);
  }

  async getCardById(cardId: string, lang: CardLanguage = 'fr'): Promise<Card | null> {
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
