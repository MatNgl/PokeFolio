import { useState, useCallback, useRef } from 'react';
import { createWorker, PSM } from 'tesseract.js';
import type { Worker } from 'tesseract.js';
import { parseCardText, cleanOCRText, calculateConfidence } from '../utils/cardTextParser';
import type { ParsedCardInfo } from '../utils/cardTextParser';
import { preprocessCardImage, filterCardName, filterCardNumber } from '../utils/imagePreprocessor';

export interface OCRResult {
  parsedInfo: ParsedCardInfo | null;
  rawText: string;
  confidence: number;
}

export interface UseCardOCRReturn {
  isProcessing: boolean;
  error: string | null;
  lastResult: OCRResult | null;
  recognizeCard: (imageSource: string | File) => Promise<OCRResult | null>;
  resetResult: () => void;
}

/**
 * Hook personnalisé pour la reconnaissance OCR de cartes Pokémon
 */
export function useCardOCR(): UseCardOCRReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<OCRResult | null>(null);
  const workerRef = useRef<Worker | null>(null);

  /**
   * Initialise le worker Tesseract s'il n'existe pas déjà
   */
  const initWorker = useCallback(async () => {
    if (workerRef.current) {
      return workerRef.current;
    }

    try {
      const worker = await createWorker('fra', 1, {
        logger: (info) => {
          if (info.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(info.progress * 100)}%`);
          }
        },
      });

      // Configuration pour améliorer la reconnaissance
      await worker.setParameters({
        tessedit_char_whitelist:
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0-9éèêëàâäôöûüçÉÈÊËÀÂÄÔÖÛÜÇ/- ♂♀',
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK, // Assume a single uniform block of text
      });

      workerRef.current = worker;
      return worker;
    } catch (err) {
      console.error("Erreur lors de l'initialisation du worker OCR:", err);
      throw new Error("Impossible d'initialiser le moteur de reconnaissance");
    }
  }, []);

  /**
   * Reconnaît une carte à partir d'une image
   */
  const recognizeCard = useCallback(
    async (imageSource: string | File): Promise<OCRResult | null> => {
      setIsProcessing(true);
      setError(null);

      try {
        console.log("🎯 [useCardOCR] Début du prétraitement de l'image");

        // Étape 1: Prétraiter l'image pour extraire les régions d'intérêt
        const regions = await preprocessCardImage(imageSource);

        if (!regions) {
          console.warn("⚠️ [useCardOCR] Échec du prétraitement, utilisation de l'image complète");
          // Fallback sur l'ancienne méthode
          return await recognizeFullImage(imageSource);
        }

        const worker = await initWorker();

        // Configurer Tesseract pour le texte du nom (sparse text, pas single line)
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT, // Sparse text - détecte le texte éparpillé
          tessedit_char_whitelist:
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzàâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ ♂♀-'",
        });

        // Étape 2: Reconnaître le nom
        console.log('📝 [useCardOCR] Reconnaissance du nom...');
        const {
          data: { text: nameText },
        } = await worker.recognize(regions.nameRegion);
        console.log('📄 [useCardOCR] Texte brut du nom:', nameText);
        console.log('📏 [useCardOCR] Longueur du texte:', nameText.length);

        const cardName = filterCardName(nameText);
        console.log('✨ [useCardOCR] Nom filtré:', cardName);

        // Configurer Tesseract pour le numéro (sparse text aussi)
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT, // Sparse text
          tessedit_char_whitelist: '0123456789/ ',
        });

        // Étape 3: Reconnaître le numéro
        console.log('🔢 [useCardOCR] Reconnaissance du numéro...');
        const {
          data: { text: numberText },
        } = await worker.recognize(regions.numberRegion);
        console.log('📄 [useCardOCR] Texte brut du numéro:', numberText);
        console.log('📏 [useCardOCR] Longueur du texte:', numberText.length);

        const cardNumber = filterCardNumber(numberText);
        console.log('✨ [useCardOCR] Numéro filtré:', cardNumber);

        // Étape 4: Construire le résultat
        let parsedInfo: ParsedCardInfo | null = null;
        let confidence = 0;

        if (cardName && cardNumber) {
          // Gérer à la fois les cartes normales (XXX/YYY) et les cartes promo (XXX)
          const parts = cardNumber.split('/');
          const num = parts[0];
          const total = parts[1] || num; // Si pas de total (promo), utiliser le numéro lui-même

          if (num && total) {
            parsedInfo = {
              name: cardName.charAt(0).toUpperCase() + cardName.slice(1), // Capitaliser
              cardNumber: num,
              setTotal: total,
            };
            confidence = calculateConfidence(parsedInfo);
            console.log('✅ [useCardOCR] Résultat complet:', parsedInfo);
          }
        } else {
          console.warn('⚠️ [useCardOCR] Informations incomplètes:', { cardName, cardNumber });
        }

        const result: OCRResult = {
          parsedInfo,
          rawText: `${nameText}\n${numberText}`,
          confidence,
        };

        setLastResult(result);
        setIsProcessing(false);

        return result;
      } catch (err) {
        console.error('❌ [useCardOCR] Erreur lors de la reconnaissance:', err);
        setError('Erreur lors de la reconnaissance de la carte');
        setIsProcessing(false);
        return null;
      }
    },
    [initWorker]
  );

  /**
   * Méthode fallback: reconnaissance sur l'image complète (ancienne méthode)
   */
  const recognizeFullImage = useCallback(
    async (imageSource: string | File): Promise<OCRResult | null> => {
      try {
        const worker = await initWorker();

        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
          tessedit_char_whitelist:
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0-9éèêëàâäôöûüçÉÈÊËÀÂÄÔÖÛÜÇ/- ♂♀',
        });

        const {
          data: { text },
        } = await worker.recognize(imageSource);
        const cleanedText = cleanOCRText(text);
        const parsedInfo = parseCardText(cleanedText);
        const confidence = calculateConfidence(parsedInfo);

        return { parsedInfo, rawText: cleanedText, confidence };
      } catch (err) {
        console.error('❌ [recognizeFullImage] Erreur:', err);
        return null;
      }
    },
    [initWorker]
  );

  /**
   * Réinitialise le dernier résultat
   */
  const resetResult = useCallback(() => {
    setLastResult(null);
    setError(null);
  }, []);

  return {
    isProcessing,
    error,
    lastResult,
    recognizeCard,
    resetResult,
  };
}
