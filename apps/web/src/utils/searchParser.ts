/**
 * Utilitaire de parsing de recherche avancée pour les cartes Pokémon TCG
 *
 * Gère la recherche structurée avec :
 * - Nom de carte (startsWith)
 * - Rareté/niveau (V, VSTAR, VMAX, GX, EX, FA...)
 * - Numéros simples (022, 21, 2...)
 * - Numéros avec préfixe (TG03, GG24, SVP22, SWSH236...)
 */

// Types de rareté reconnus
const RARITY_KEYWORDS = [
  'vstar',
  'vmax',
  'v',
  'gx',
  'ex',
  'fa',
  'sr',
  'ur',
  'ar',
  'sar',
  'sir',
  'chr',
  'csr',
  'rr',
  'hr',
  'tr',
  'pr',
  'full art',
  'secret',
  'rare',
  'illustration',
  'special',
  'gold',
  'rainbow',
  'shiny',
];

// Préfixes de numéros spéciaux
const NUMBER_PREFIXES = ['tg', 'gg', 'svp', 'swsh', 'sm', 'xy', 'bw', 'sv'];

export interface ParsedSearchQuery {
  /** Mots du nom (premier bloc toujours nom, autres possiblement suite du nom) */
  nameTokens: string[];
  /** Rareté recherchée (ex: "vstar", "v") */
  rarity?: string;
  /** Numéro de carte simple */
  number?: string;
  /** Numéro avec préfixe (ex: "tg03") */
  prefixedNumber?: string;
  /** Query originale */
  originalQuery: string;
}

/**
 * Normalise une chaîne pour la comparaison
 * - Minuscule
 * - Supprime les accents
 * - Supprime les caractères spéciaux
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-z0-9\s]/g, '') // Garde lettres, chiffres, espaces
    .trim();
}

/**
 * Normalise un numéro de carte
 * - Supprime le # si présent
 * - Normalise les zéros (3 → 003, 03 → 003)
 */
export function normalizeNumber(num: string): string {
  // Enlever le # si présent
  const cleaned = num.replace(/^#/, '');

  // Si c'est juste des chiffres, on garde tel quel
  if (/^\d+$/.test(cleaned)) {
    return cleaned;
  }

  return cleaned;
}

/**
 * Vérifie si un token est une rareté
 */
function isRarityToken(token: string): boolean {
  const normalized = normalizeString(token);
  return RARITY_KEYWORDS.some(
    (r) => normalized === r || (normalized.length >= 2 && r.startsWith(normalized))
  );
}

/**
 * Vérifie si un token est un numéro simple (uniquement chiffres)
 */
function isSimpleNumber(token: string): boolean {
  return /^\d+$/.test(token);
}

/**
 * Vérifie si un token est un numéro avec préfixe
 */
function isPrefixedNumber(token: string): boolean {
  const normalized = normalizeString(token);
  return NUMBER_PREFIXES.some((prefix) => normalized.startsWith(prefix) && /\d/.test(normalized));
}

/**
 * Sépare un token collé en parties lettres/chiffres
 * Ex: "ARC22" → ["ARC", "22"]
 */
function splitCollapsedToken(token: string): string[] {
  const match = token.match(/^([a-zA-Z]+)(\d+)$/);
  if (match && match[1] && match[2]) {
    return [match[1], match[2]];
  }
  return [token];
}

/**
 * Parse une query de recherche en composants structurés
 */
export function parseSearchQuery(query: string): ParsedSearchQuery {
  const result: ParsedSearchQuery = {
    nameTokens: [],
    originalQuery: query,
  };

  if (!query.trim()) {
    return result;
  }

  // Séparer en tokens
  const tokens = query.trim().split(/\s+/);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;

    const normalizedToken = normalizeString(token);

    // Premier token = toujours le début du nom
    if (i === 0) {
      // Vérifier si c'est un token collé (ex: ARC22)
      const parts = splitCollapsedToken(token);
      if (parts.length === 2 && parts[0] && parts[1]) {
        result.nameTokens.push(parts[0]);
        result.number = parts[1];
      } else if (isPrefixedNumber(token)) {
        // Si c'est un numéro préfixé seul (ex: TG03)
        result.prefixedNumber = normalizedToken;
      } else {
        result.nameTokens.push(token);
      }
      continue;
    }

    // Tokens suivants : déterminer le type

    // Numéro avec préfixe (TG03, GG24, etc.)
    if (isPrefixedNumber(token)) {
      result.prefixedNumber = normalizedToken;
      continue;
    }

    // Numéro simple
    if (isSimpleNumber(token)) {
      result.number = token;
      continue;
    }

    // Rareté
    if (isRarityToken(token)) {
      result.rarity = normalizedToken;
      continue;
    }

    // Token collé (ex: MEW22)
    const parts = splitCollapsedToken(token);
    if (parts.length === 2 && parts[1]) {
      result.nameTokens.push(parts[0] || '');
      result.number = parts[1];
      continue;
    }

    // Sinon, c'est une suite du nom
    result.nameTokens.push(token);
  }

  return result;
}

/**
 * Vérifie si une carte correspond à la query parsée
 */
export function matchCard(
  card: {
    name?: string;
    localId?: string;
    number?: string;
    rarity?: string;
    subtypes?: string[];
  },
  parsed: ParsedSearchQuery
): boolean {
  // Si pas de critères, tout match
  if (
    parsed.nameTokens.length === 0 &&
    !parsed.rarity &&
    !parsed.number &&
    !parsed.prefixedNumber
  ) {
    return true;
  }

  const cardName = normalizeString(card.name || '');
  const cardNumber = normalizeNumber(card.localId || card.number || '');
  const cardRarity = normalizeString(card.rarity || '');
  const cardSubtypes = (card.subtypes || []).map((s) => normalizeString(s));

  // 1. Vérifier le nom (startsWith pour chaque token)
  if (parsed.nameTokens.length > 0) {
    const nameWords = cardName.split(/\s+/);

    for (let i = 0; i < parsed.nameTokens.length; i++) {
      const searchToken = normalizeString(parsed.nameTokens[i] || '');
      if (!searchToken) continue;

      // Le premier token doit matcher le début du premier mot
      if (i === 0) {
        if (!nameWords[0]?.startsWith(searchToken)) {
          return false;
        }
      } else {
        // Les tokens suivants doivent matcher le début d'un des mots suivants
        const remainingWords = nameWords.slice(i);
        const matches = remainingWords.some((word) => word.startsWith(searchToken));
        if (!matches) {
          return false;
        }
      }
    }
  }

  // 2. Vérifier la rareté
  if (parsed.rarity) {
    const raritySearch = parsed.rarity;

    // Cas spécial pour "v" qui doit matcher V, VSTAR, VMAX
    if (raritySearch === 'v') {
      const hasVRarity = cardRarity.includes('v') || cardSubtypes.some((s) => s.includes('v'));
      if (!hasVRarity) {
        return false;
      }
    } else {
      // Pour les autres, startsWith
      const matchesRarity =
        cardRarity.startsWith(raritySearch) || cardSubtypes.some((s) => s.startsWith(raritySearch));
      if (!matchesRarity) {
        return false;
      }
    }
  }

  // 3. Vérifier le numéro simple
  if (parsed.number) {
    const searchNum = parsed.number.replace(/^0+/, '') || '0'; // Enlever les zéros initiaux
    const cardNum = cardNumber.replace(/^0+/, '') || '0';

    // Le numéro doit commencer par la recherche
    if (!cardNum.startsWith(searchNum)) {
      return false;
    }
  }

  // 4. Vérifier le numéro préfixé
  if (parsed.prefixedNumber) {
    const normalizedCardNumber = normalizeString(cardNumber);

    // Normaliser en enlevant les zéros de padding
    const searchWithoutPadding = parsed.prefixedNumber.replace(/(\D)0+(\d)/g, '$1$2');
    const cardWithoutPadding = normalizedCardNumber.replace(/(\D)0+(\d)/g, '$1$2');

    if (
      !cardWithoutPadding.startsWith(searchWithoutPadding) &&
      !normalizedCardNumber.startsWith(parsed.prefixedNumber)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Filtre une liste de cartes selon la query
 */
export function filterCards<
  T extends {
    name?: string;
    localId?: string;
    number?: string;
    rarity?: string;
    subtypes?: string[];
  },
>(cards: T[], query: string): T[] {
  if (!query.trim()) {
    return cards;
  }

  const parsed = parseSearchQuery(query);
  return cards.filter((card) => matchCard(card, parsed));
}

/**
 * Crée un résumé de la recherche pour affichage
 */
export function getSearchSummary(parsed: ParsedSearchQuery): string {
  const parts: string[] = [];

  if (parsed.nameTokens.length > 0) {
    parts.push(`Nom: "${parsed.nameTokens.join(' ')}"`);
  }
  if (parsed.rarity) {
    parts.push(`Rareté: ${parsed.rarity.toUpperCase()}`);
  }
  if (parsed.number) {
    parts.push(`N°: ${parsed.number}`);
  }
  if (parsed.prefixedNumber) {
    parts.push(`Code: ${parsed.prefixedNumber.toUpperCase()}`);
  }

  return parts.join(' | ') || 'Tous';
}
