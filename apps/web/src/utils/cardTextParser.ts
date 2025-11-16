// apps/web/src/utils/cardTextParser.ts

export interface ParsedCardInfo {
  name: string;
  cardNumber: string;
  setTotal: string;
}

/**
 * Parse le texte extrait par OCR pour identifier le nom et le numéro de la carte
 * Format attendu : "Nom de la carte\n25/102" ou variations
 */
export function parseCardText(ocrText: string): ParsedCardInfo | null {
  console.log('🔤 [parseCardText] Texte OCR reçu:', ocrText);

  if (!ocrText || ocrText.trim().length === 0) {
    console.warn('⚠️ [parseCardText] Texte vide ou null');
    return null;
  }

  // Nettoyer le texte
  const cleanedText = ocrText.replace(/[^\w\s\-éèêëàâäôöûüçÉÈÊËÀÂÄÔÖÛÜÇ/]/gi, ' ').trim();

  console.log('🧹 [parseCardText] Texte nettoyé:', cleanedText);

  // Extraire le pattern XX/YY (numéro de carte) - avec ou sans espaces
  // Essayer plusieurs patterns
  let numberMatch = cleanedText.match(/(\d+)\s*\/\s*(\d+)/);

  if (!numberMatch) {
    // Essayer avec plus d'espaces ou caractères entre les chiffres
    numberMatch = cleanedText.match(/(\d{1,3})\s*[/|]\s*(\d{1,3})/);
  }

  if (!numberMatch) {
    // Dernière tentative: chercher juste des chiffres suivis d'un slash
    const allMatches = cleanedText.match(/\d+/g);
    if (allMatches && allMatches.length >= 2) {
      // Prendre les deux derniers nombres trouvés
      const num1 = allMatches[allMatches.length - 2];
      const num2 = allMatches[allMatches.length - 1];
      numberMatch = ['', num1, num2] as unknown as RegExpMatchArray;
      console.log(`🔢 [parseCardText] Pattern alternatif trouvé: ${num1}/${num2}`);
    }
  }

  if (!numberMatch) {
    console.warn('⚠️ [parseCardText] Aucun pattern de numéro trouvé');
    console.log('📝 [parseCardText] Texte complet pour debug:', cleanedText);
    return null;
  }

  const cardNumber = numberMatch[1] || '';
  const setTotal = numberMatch[2] || '';
  console.log(`🔢 [parseCardText] Numéro trouvé: ${cardNumber}/${setTotal}`);

  // Extraire le nom (tout ce qui précède le numéro)
  const textBeforeNumber = cleanedText.substring(0, numberMatch.index ?? 0);

  // Prendre la dernière ligne non-vide avant le numéro comme nom
  const lines = textBeforeNumber
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const name = lines[lines.length - 1] || '';
  console.log(`📝 [parseCardText] Nom extrait: "${name}"`);

  // Validation basique
  if (!name || name.length < 2) {
    console.warn('⚠️ [parseCardText] Nom trop court ou vide');
    return null;
  }

  const result = {
    name: name.trim(),
    cardNumber,
    setTotal,
  };

  console.log('✅ [parseCardText] Résultat final:', result);
  return result;
}

/**
 * Nettoie et améliore le texte OCR pour de meilleurs résultats
 */
export function cleanOCRText(text: string): string {
  return (
    text
      // Supprimer les caractères spéciaux parasites
      .replace(/[|_~`]/g, '')
      // Normaliser les espaces multiples
      .replace(/\s+/g, ' ')
      // Corriger les confusions OCR communes
      .replace(/[0O]/g, (match) => {
        // Si entouré de lettres, c'est probablement un O
        // Si entouré de chiffres, c'est probablement un 0
        return match;
      })
      .trim()
  );
}

/**
 * Calcule un score de confiance pour les résultats parsés
 */
export function calculateConfidence(parsed: ParsedCardInfo | null): number {
  if (!parsed) return 0;

  let confidence = 0;

  // Nom présent et assez long
  if (parsed.name.length >= 3) confidence += 40;
  if (parsed.name.length >= 5) confidence += 20;

  // Numéro de carte valide
  const cardNum = parseInt(parsed.cardNumber, 10);
  const setNum = parseInt(parsed.setTotal, 10);

  if (cardNum > 0 && cardNum <= setNum) {
    confidence += 40;
  }

  return Math.min(confidence, 100);
}
