// apps/web/src/utils/imagePreprocessor.ts

export interface CardRegions {
  nameRegion: string; // Image en base64 de la région du nom
  numberRegion: string; // Image en base64 de la région du numéro
}

/**
 * Prétraite l'image pour améliorer la reconnaissance OCR
 * 1. Détecte les contours de la carte
 * 2. Extrait la zone du nom (partie haute)
 * 3. Extrait la zone du numéro (partie basse)
 */
export async function preprocessCardImage(imageSource: string | File): Promise<CardRegions | null> {
  return new Promise((resolve) => {
    const img = new Image();

    const handleImageLoad = () => {
      try {
        // Créer un canvas pour le traitement
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Calculer les régions d'intérêt
        // Pour une carte Pokémon (après tests):
        // - Nom: 25% du haut de la carte (zone large pour capturer différents styles)
        // - Numéro: 25% du bas de la carte (pour cartes standard et promo)

        const nameY = 0;
        const nameHeight = Math.floor(img.height * 0.25);

        const numberY = Math.floor(img.height * 0.75);
        const numberHeight = Math.floor(img.height * 0.25);

        // Extraire la région du nom
        const nameCanvas = document.createElement('canvas');
        const nameCtx = nameCanvas.getContext('2d');
        if (nameCtx) {
          nameCanvas.width = img.width;
          nameCanvas.height = nameHeight;

          // Copier la région
          nameCtx.drawImage(
            canvas,
            0, nameY,
            img.width, nameHeight,
            0, 0,
            img.width, nameHeight
          );

          // Améliorer le contraste pour le nom
          enhanceContrast(nameCtx, nameCanvas.width, nameCanvas.height);
        }

        // Extraire la région du numéro
        const numberCanvas = document.createElement('canvas');
        const numberCtx = numberCanvas.getContext('2d');
        if (numberCtx) {
          numberCanvas.width = img.width;
          numberCanvas.height = numberHeight;

          // Copier la région
          numberCtx.drawImage(
            canvas,
            0, numberY,
            img.width, numberHeight,
            0, 0,
            img.width, numberHeight
          );

          // Améliorer le contraste pour le numéro
          enhanceContrast(numberCtx, numberCanvas.width, numberCanvas.height);
        }

        const nameRegionDataURL = nameCanvas.toDataURL('image/png');
        const numberRegionDataURL = numberCanvas.toDataURL('image/png');

        console.log('🖼️ [preprocessCardImage] Régions extraites:');
        console.log(`  - Nom: y=${nameY}, height=${nameHeight}`);
        console.log(`  - Numéro: y=${numberY}, height=${numberHeight}`);

        // Optionnel: Afficher les régions dans la console pour debug
        console.log('📸 [preprocessCardImage] Région du nom:', nameRegionDataURL.substring(0, 100) + '...');
        console.log('📸 [preprocessCardImage] Région du numéro:', numberRegionDataURL.substring(0, 100) + '...');

        resolve({
          nameRegion: nameRegionDataURL,
          numberRegion: numberRegionDataURL,
        });
      } catch (err) {
        console.error('❌ [preprocessCardImage] Erreur:', err);
        resolve(null);
      }
    };

    img.onload = handleImageLoad;

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(imageSource);
    }
  });
}

/**
 * Améliore le contraste d'une région pour faciliter l'OCR
 * Nouvelle approche: ne pas binariser, juste améliorer légèrement
 */
function enhanceContrast(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Amélioration légère du contraste sans binarisation
  const contrastFactor = 1.5; // Facteur de contraste modéré

  for (let i = 0; i < data.length; i += 4) {
    // Appliquer un facteur de contraste sans détruire l'information
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;

    data[i] = clamp(((r - 128) * contrastFactor) + 128);     // R
    data[i + 1] = clamp(((g - 128) * contrastFactor) + 128); // G
    data[i + 2] = clamp(((b - 128) * contrastFactor) + 128); // B
    // Alpha reste inchangé
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Limite une valeur entre 0 et 255
 */
function clamp(value: number): number {
  return Math.max(0, Math.min(255, value));
}

/**
 * Filtre les mots parasites des résultats OCR
 */
export function filterCardName(ocrText: string): string {
  console.log('🏷️ [filterCardName] Texte OCR reçu:', ocrText);

  const excludedWords = ['niveau', 'évolution', 'de', 'pv', 'hp', 'ev', 'lv', 'evolution', 'talent', 'attaque'];

  // Nettoyer et découper en mots
  const allWords = ocrText
    .replace(/[^\w\sàâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ]/g, ' ')
    .split(/\s+/)
    .filter(word => word.trim().length > 0);

  console.log('📝 [filterCardName] Tous les mots:', allWords);

  // Filtrer les mots exclus
  const words = allWords.filter(word => {
    const lowerWord = word.toLowerCase();
    return lowerWord.length >= 3 && !excludedWords.includes(lowerWord);
  });

  console.log('✅ [filterCardName] Mots filtrés:', words);

  // Chercher le mot le plus long (souvent le nom du Pokémon)
  const longestWord = words.reduce((longest, current) =>
    current.length > longest.length ? current : longest,
  '');

  console.log('🎯 [filterCardName] Mot le plus long (nom probable):', longestWord);

  return longestWord;
}

/**
 * Filtre et nettoie le numéro de carte
 */
export function filterCardNumber(ocrText: string): string | null {
  console.log('🔢 [filterCardNumber] Texte reçu:', ocrText);

  // Chercher d'abord le pattern XXX/YYY (cartes normales)
  const patterns = [
    /(\d{1,3})\s*\/\s*(\d{1,3})/,  // Format standard: 144/132
    /(\d{1,3})\s*[/|]\s*(\d{1,3})/, // Avec pipe ou variations
  ];

  for (const pattern of patterns) {
    const match = ocrText.match(pattern);
    if (match) {
      const result = `${match[1]}/${match[2]}`;
      console.log('✅ [filterCardNumber] Numéro standard trouvé:', result);
      return result;
    }
  }

  // Chercher un numéro seul (cartes promo)
  // On cherche un nombre isolé, idéalement de 1-3 chiffres
  const promoPattern = /\b(\d{1,3})\b/;
  const promoMatch = ocrText.match(promoPattern);
  if (promoMatch && promoMatch[1]) {
    const result = promoMatch[1];
    console.log('✅ [filterCardNumber] Numéro promo trouvé:', result);
    return result;
  }

  // Fallback: chercher des paires de nombres pour format standard
  const numbers = ocrText.match(/\d{1,3}/g);
  if (numbers && numbers.length >= 2) {
    // Prendre les deux derniers nombres trouvés
    const num1 = numbers[numbers.length - 2];
    const num2 = numbers[numbers.length - 1];
    const result = `${num1}/${num2}`;
    console.log('⚠️ [filterCardNumber] Numéro fallback standard:', result);
    return result;
  }

  // Dernier fallback: prendre le premier nombre trouvé (promo)
  if (numbers && numbers.length >= 1) {
    const result = numbers[0];
    console.log('⚠️ [filterCardNumber] Numéro fallback promo:', result);
    return result;
  }

  console.log('❌ [filterCardNumber] Aucun numéro trouvé');
  return null;
}
