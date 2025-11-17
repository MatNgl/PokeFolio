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
   * Calcule un score de pertinence pour le matching fuzzy (0-100)
   * Plus le score est élevé, plus la correspondance est bonne
   */
  private fuzzyMatchScore(text: string, search: string): number {
    const normalizedText = this.normalizeString(text);
    const normalizedSearch = this.normalizeString(search);

    // Exact match = score 100
    if (normalizedText === normalizedSearch) {
      return 100;
    }

    // Contains exact = score 90
    if (normalizedText.includes(normalizedSearch)) {
      return 90;
    }

    // Starts with = score 85
    if (normalizedText.startsWith(normalizedSearch)) {
      return 85;
    }

    // Multi-word search : "arcanin de h" → ["arcanin", "de", "h"]
    const searchWords = normalizedSearch.split(/\s+/).filter((w) => w.length > 0);
    const textWords = normalizedText.split(/\s+/).filter((w) => w.length > 0);

    // Si recherche multi-mots, vérifier que chaque mot de la recherche
    // est présent au début d'un mot du texte
    if (searchWords.length > 1) {
      const allWordsMatch = searchWords.every((searchWord) =>
        textWords.some((textWord) => textWord.startsWith(searchWord))
      );
      if (allWordsMatch) {
        return 80;
      }
    }

    // Prefix matching : "arc" trouve "arcanin"
    // Vérifier si la recherche est un préfixe d'un des mots du texte
    const isPrefixOfAnyWord = textWords.some((word) => word.startsWith(normalizedSearch));
    if (isPrefixOfAnyWord) {
      return 75;
    }

    // Pour les recherches très courtes (3 caractères), être plus permissif
    if (normalizedSearch.length === 3) {
      // Chercher dans les 3 premiers caractères de chaque mot
      const matchesStart = textWords.some((word) => word.substring(0, 3) === normalizedSearch);
      if (matchesStart) {
        return 70;
      }
    }

    // Tolérance aux fautes de frappe : compter les caractères correspondants
    if (normalizedSearch.length >= 3) {
      let matches = 0;
      for (let i = 0; i < normalizedSearch.length; i++) {
        const char = normalizedSearch.charAt(i);
        if (char && normalizedText.includes(char)) {
          matches++;
        }
      }
      const ratio = matches / normalizedSearch.length;
      // Si au moins 80% des caractères correspondent
      if (ratio >= 0.8) {
        return Math.floor(ratio * 70); // Score entre 56-70
      }
    }

    return 0; // Pas de match
  }

  /**
   * Vérifie si le terme de recherche correspond au texte (tolérant aux fautes)
   */
  private fuzzyMatch(text: string, search: string): boolean {
    // Pour les recherches courtes (3 caractères), être plus permissif (seuil 60)
    // Pour les recherches plus longues, seuil normal (56 = 80% de correspondance)
    const threshold = search.length === 3 ? 60 : 56;
    return this.fuzzyMatchScore(text, search) >= threshold;
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

    // Normaliser : retirer les espaces entre lettres et chiffres (TG 04 → TG04, SWSH 49 → SWSH49)
    const normalizedQuery = query.replace(/([A-Z]+)\s+(\d+)/gi, '$1$2');

    // Détecter si la recherche contient un numéro avec préfixe optionnel (ex: "TG30", "GG70", "SWSH001", "010")
    const numberMatch = normalizedQuery.match(/\b([A-Z]{1,5})?(\d{1,3})\b/i);
    const searchPrefix = numberMatch?.[1]?.toUpperCase() || null;
    const searchNumber = numberMatch?.[2] || null;

    // Détecter un préfixe seul (sans numéro) : TG, SWSH, GG, etc.
    // IMPORTANT : Ne détecter que si c'est un vrai préfixe de set (liste connue)
    // OU si c'est accompagné d'un nom de Pokémon (ex: "lugu tg")
    const knownSetPrefixes = ['TG', 'GG', 'SWSH', 'SM', 'XY', 'BW', 'DP', 'EX', 'POP', 'SV'];
    const prefixOnlyMatch = normalizedQuery.match(/\b([A-Z]{2,5})\b/i);

    // Ne considérer comme préfixe seul que si :
    // 1. C'est dans la liste des préfixes connus ET il n'y a pas d'autre mot
    // 2. OU il y a un autre mot avant (ex: "lugu tg" → 2 mots, "tg" est un préfixe)
    const queryWords = normalizedQuery.trim().split(/\s+/).filter((w) => w.length > 0);
    const searchPrefixOnly =
      !searchNumber && prefixOnlyMatch && queryWords.length > 1
        ? prefixOnlyMatch[1]?.toUpperCase()
        : !searchNumber && prefixOnlyMatch && knownSetPrefixes.includes(prefixOnlyMatch[1]?.toUpperCase())
          ? prefixOnlyMatch[1]?.toUpperCase()
          : null;

    // Extraire le nom (tout sauf le préfixe et numéro)
    const searchName = numberMatch
      ? normalizedQuery.replace(/\b[A-Z]{0,5}\d{1,3}\b/gi, '').trim()
      : searchPrefixOnly
        ? normalizedQuery.replace(/\b[A-Z]{2,5}\b/gi, '').trim()
        : normalizedQuery;

    if (searchNumber) {
      this.logger.log(
        `Recherche détectée - Nom: "${searchName}", Préfixe: "${searchPrefix}", Numéro: "${searchNumber}"`
      );
    } else if (searchPrefixOnly) {
      this.logger.log(`Recherche détectée - Nom: "${searchName}", Préfixe seul: "${searchPrefixOnly}"`);
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

      // Filtrage fuzzy supplémentaire avec score de pertinence
      if (searchName && cards.length > 0) {
        const originalLength = cards.length;

        // Calculer le score de pertinence pour chaque carte
        const cardsWithScore = cards
          .map((card) => {
            const cardName = card.name || '';
            const setName = card.set?.name || '';

            const nameScore = this.fuzzyMatchScore(cardName, searchName);
            const setScore = this.fuzzyMatchScore(setName, searchName);
            const maxScore = Math.max(nameScore, setScore);

            return { card, score: maxScore };
          })
          .filter((item) => item.score >= 56); // Filtrer les résultats avec score >= 56 (80% de correspondance)

        // Trier par score décroissant (les meilleurs résultats en premier)
        cardsWithScore.sort((a, b) => b.score - a.score);

        // Extraire les cartes triées
        cards = cardsWithScore.map((item) => item.card);

        if (cards.length < originalLength) {
          this.logger.log(
            `Filtrage fuzzy: ${originalLength} -> ${cards.length} cartes (recherche: "${searchName}"), triées par pertinence`
          );
        }
      }

      // Filtrer par préfixe seul (sans numéro)
      if (searchPrefixOnly && !searchNumber) {
        this.logger.log(`Filtrage par préfixe seul: "${searchPrefixOnly}"`);
        cards = cards.filter((card) => {
          const cardIdMatch = card.localId?.match(/^([A-Z]{1,5})?(\d+)$/i);
          const cardPrefix = cardIdMatch?.[1]?.toUpperCase() || null;
          const cardSetId = (card.set?.id || card.id?.split('-')[0] || '').toLowerCase();
          const prefixLower = searchPrefixOnly.toLowerCase();

          // Le préfixe de la recherche doit matcher soit :
          // 1. Le préfixe du numéro (TG dans TG04)
          // 2. Le set ID (swsh11 pour SWSH11)
          const match = cardPrefix === searchPrefixOnly || cardSetId.startsWith(prefixLower);

          if (match) {
            this.logger.log(`✓ Match: ${card.name} #${card.localId} (préfixe: ${cardPrefix}, set: ${cardSetId})`);
          }

          return match;
        });
        this.logger.log(`${cards.length} carte(s) trouvée(s) avec le préfixe ${searchPrefixOnly}`);
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

          // Récupérer le set ID de la carte (ex: "SWSH10.5" → "swsh")
          const cardSetId = (card.set?.id || card.id?.split('-')[0] || '').toLowerCase();

          // Vérifier correspondance préfixe
          // Le préfixe peut correspondre soit au préfixe du numéro, soit au set ID
          let prefixMatch = true;
          if (searchPrefix) {
            const prefixLower = searchPrefix.toLowerCase();
            prefixMatch =
              cardPrefix === searchPrefix || // Préfixe exact dans le numéro (TG04)
              cardSetId.startsWith(prefixLower); // Set ID commence par le préfixe (swsh10.5)
          }

          // Matching flexible des numéros avec gestion des zéros initiaux
          // "11" doit matcher "011", "11", "114", "119"
          // "04" doit matcher "04", "4", "049", "040"

          // Convertir en nombres pour ignorer les zéros initiaux
          const searchNumInt = parseInt(searchNumber, 10);
          const cardNumInt = parseInt(cardNumberStr, 10);

          // 2 types de matching :
          // 1. Exact après suppression des zéros : parseInt("011") === parseInt("11")
          // 2. StartsWith : "114".startsWith("11")

          const exactMatch = cardNumInt === searchNumInt;
          const startsWithMatch = cardNumberStr.startsWith(searchNumber);

          const numberMatch = exactMatch || startsWithMatch;

          const match = prefixMatch && numberMatch;

          if (match) {
            this.logger.log(
              `✓ Match: ${card.name} #${card.localId} (set: ${cardSetId}, préfixe: ${cardPrefix}, numéro: ${cardNumberStr})`
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

        // Si la carte a déjà une image, l'utiliser
        if (c.images?.small || c.image) {
          const img = c.images?.small ?? c.image;
          return {
            ...c,
            image: img,
            images: {
              ...(c.images || {}),
              small: img,
            },
          };
        }

        // Sinon, construire les URLs de fallback
        // Pour le français, essayer l'anglais avant d'afficher le dos de carte
        const primaryFallback = id ? `${baseUrl}/${lang}/cards/${id}/image` : undefined;
        const secondaryFallback = id && lang === 'fr' ? `${baseUrl}/en/cards/${id}/image` : undefined;

        // Utiliser le fallback anglais en priorité si disponible pour le français
        const img = lang === 'fr' && secondaryFallback ? secondaryFallback : primaryFallback;

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
