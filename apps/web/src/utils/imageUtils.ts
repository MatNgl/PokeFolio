/**
 * Utilitaires pour la gestion des images de cartes Pokémon
 * Gère les fallbacks pour les différentes langues et formats
 */

const PLACEHOLDER_IMG = 'https://images.pokemontcg.io/swsh1/back.png';

// Liste des langues à essayer dans l'ordre
const LANGUAGES = ['fr', 'en', 'ja', 'de', 'it', 'es', 'pt'];

// Liste des formats à essayer dans l'ordre
const FORMATS = ['png', 'webp', 'jpg'];

// Qualités disponibles
const QUALITIES = ['high', 'low'];

/**
 * Résout l'URL d'une image de carte
 * Ajoute l'extension appropriée si nécessaire
 */
export function resolveImageUrl(imageUrl?: string): string {
  if (!imageUrl) return PLACEHOLDER_IMG;

  // Si l'URL provient de assets.tcgdex.net et n'a pas d'extension
  if (imageUrl.includes('assets.tcgdex.net') && !imageUrl.match(/\.(webp|png|jpg|jpeg)$/i)) {
    // Essayer d'abord high.png (meilleure compatibilité pour les vieux sets)
    return `${imageUrl}/high.png`;
  }

  return imageUrl;
}

/**
 * Extrait les informations d'une URL TCGDex
 */
function parseTcgdexUrl(url: string): {
  baseUrl: string;
  lang: string;
  setPath: string;
  cardId: string;
  quality: string;
  format: string;
} | null {
  // Pattern: https://assets.tcgdex.net/{lang}/{series}/{set}/{cardnum}/high.{format}
  // Exemple: https://assets.tcgdex.net/fr/dp/dp4/1/high.png
  const patterns = [
    // Avec qualité et format
    /assets\.tcgdex\.net\/(\w+)\/(.+)\/(\w+)\/(high|low)\.(webp|png|jpg)/,
    // Sans extension (on doit l'ajouter)
    /assets\.tcgdex\.net\/(\w+)\/(.+)\/(\w+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      if (match.length === 6 && match[1] && match[2] && match[3] && match[4] && match[5]) {
        // Avec qualité et format
        return {
          baseUrl: 'https://assets.tcgdex.net',
          lang: match[1],
          setPath: match[2],
          cardId: match[3],
          quality: match[4],
          format: match[5],
        };
      } else if (match.length === 4 && match[1] && match[2] && match[3]) {
        // Sans extension
        return {
          baseUrl: 'https://assets.tcgdex.net',
          lang: match[1],
          setPath: match[2],
          cardId: match[3],
          quality: 'high',
          format: 'png',
        };
      }
    }
  }

  return null;
}

/**
 * Génère toutes les URLs de fallback possibles pour une image TCGDex
 */
export function generateImageFallbacks(imageUrl: string): string[] {
  const parsed = parseTcgdexUrl(imageUrl);
  if (!parsed) return [PLACEHOLDER_IMG];

  const fallbacks: string[] = [];
  const { baseUrl, setPath, cardId } = parsed;

  // Générer toutes les combinaisons langue/format/qualité
  for (const lang of LANGUAGES) {
    for (const quality of QUALITIES) {
      for (const format of FORMATS) {
        fallbacks.push(`${baseUrl}/${lang}/${setPath}/${cardId}/${quality}.${format}`);
      }
    }
  }

  // Ajouter le placeholder à la fin
  fallbacks.push(PLACEHOLDER_IMG);

  return fallbacks;
}

/**
 * Handler d'erreur pour les images
 * Essaie la prochaine URL de fallback
 */
export function createImageErrorHandler(fallbacks: string[]) {
  let currentIndex = 0;

  return (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    currentIndex++;

    const nextFallback = fallbacks[currentIndex];
    if (currentIndex < fallbacks.length && nextFallback) {
      target.src = nextFallback;
    } else {
      target.src = PLACEHOLDER_IMG;
    }
  };
}

/**
 * Hook-style handler pour les images avec fallback automatique
 * Utilise data-attributes pour tracker l'état
 */
export function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  const target = e.currentTarget;
  const currentSrc = target.src;

  // Extraire les infos de l'URL actuelle
  const parsed = parseTcgdexUrl(currentSrc);
  if (!parsed) {
    target.src = PLACEHOLDER_IMG;
    return;
  }

  const { baseUrl, setPath, cardId, lang, quality, format } = parsed;

  // Déterminer la prochaine URL à essayer
  const langIndex = LANGUAGES.indexOf(lang);
  const formatIndex = FORMATS.indexOf(format);
  const qualityIndex = QUALITIES.indexOf(quality);

  // Essayer le format suivant
  if (formatIndex < FORMATS.length - 1) {
    target.src = `${baseUrl}/${lang}/${setPath}/${cardId}/${quality}.${FORMATS[formatIndex + 1]}`;
    return;
  }

  // Essayer la qualité suivante (low)
  if (qualityIndex < QUALITIES.length - 1) {
    target.src = `${baseUrl}/${lang}/${setPath}/${cardId}/${QUALITIES[qualityIndex + 1]}.${FORMATS[0]}`;
    return;
  }

  // Essayer la langue suivante
  if (langIndex < LANGUAGES.length - 1) {
    target.src = `${baseUrl}/${LANGUAGES[langIndex + 1]}/${setPath}/${cardId}/high.${FORMATS[0]}`;
    return;
  }

  // Toutes les tentatives échouées
  target.src = PLACEHOLDER_IMG;
}

/**
 * Construit l'URL d'une image à partir des composants
 */
export function buildImageUrl(
  setId: string,
  cardLocalId: string,
  lang: string = 'fr',
  quality: string = 'high',
  format: string = 'png'
): string {
  // Déterminer le chemin du set
  // Les IDs de set TCGDex ont souvent un format comme "dp4", "swsh1", etc.
  // Le chemin complet inclut la série: dp/dp4, swsh/swsh1

  // Extraire la série du setId
  const seriesMatch = setId.match(/^([a-z]+)/i);
  const series = seriesMatch ? seriesMatch[1] : setId;

  return `https://assets.tcgdex.net/${lang}/${series}/${setId}/${cardLocalId}/${quality}.${format}`;
}

export { PLACEHOLDER_IMG };
