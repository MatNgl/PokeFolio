// apps/web/src/components/CardRecognition/CardRecognition.tsx
import { useState, useRef, useEffect } from 'react';
import { Upload, Camera, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCamera } from '../../hooks/useCamera';
import { useCardOCR } from '../../hooks/useCardOCR';
import { FullScreenLoader } from '../ui/FullScreenLoader';
import { cardsService } from '../../services/cards.service';
import type { Card } from '@pokefolio/types';
import styles from './CardRecognition.module.css';

type RecognitionMode = 'upload' | 'photo';

interface CardRecognitionProps {
  onCardSelected: (card: Card) => void;
  onClose: () => void;
}

interface SearchResult {
  card: Card;
  matchScore: number;
}

export function CardRecognition({ onCardSelected, onClose }: CardRecognitionProps) {
  const [mode, setMode] = useState<RecognitionMode>('upload');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { videoRef, isStreaming, error: cameraError, startCamera, stopCamera, captureFrame } = useCamera();
  const { isProcessing, error: ocrError, lastResult, recognizeCard, resetResult } = useCardOCR();

  // Fonction pour obtenir l'URL correcte de l'image de la carte
  const getCardImageUrl = (card: Card): string => {
    console.log('🎨 [getCardImageUrl] Carte:', card.name, {
      image: card.image,
      images: card.images,
    });

    let img = card.image || card.images?.small || '';

    // Si l'URL provient de assets.tcgdex.net et n'a pas d'extension
    if (img && img.includes('assets.tcgdex.net') && !img.match(/\.(webp|png|jpg|jpeg)$/i)) {
      // Priorité: PNG puis WebP
      img = `${img}/high.png`;
    }

    // Image de dos de carte Pokémon par défaut
    const finalUrl = img || 'https://images.pokemontcg.io/swsh1/back.png';
    console.log('🖼️ [getCardImageUrl] URL finale:', finalUrl);

    return finalUrl;
  };

  // Nettoyer les ressources au démontage
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleModeChange = (newMode: RecognitionMode) => {
    setMode(newMode);
    setPreviewImage(null);
    setSearchResults([]);
    resetResult();
    stopCamera();

    if (newMode === 'photo') {
      startCamera();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target?.result as string;
      setPreviewImage(imageData);
      await handleRecognize(file);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target?.result as string;
      setPreviewImage(imageData);
      await handleRecognize(file);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleCapture = async () => {
    const frame = captureFrame();
    if (frame) {
      setPreviewImage(frame);
      await handleRecognize(frame);
    }
  };

  const handleRecognize = async (imageSource: string | File) => {
    console.log('🔍 [CardRecognition] Début de la reconnaissance OCR');
    const result = await recognizeCard(imageSource);
    console.log('📊 [CardRecognition] Résultat OCR:', result);

    if (result && result.parsedInfo) {
      console.log('✅ [CardRecognition] Informations parsées:', result.parsedInfo);
      console.log(`📝 [CardRecognition] Recherche de: ${result.parsedInfo.name} (${result.parsedInfo.cardNumber})`);
      await searchCards(result.parsedInfo.name, result.parsedInfo.cardNumber);
    } else {
      console.warn('⚠️ [CardRecognition] Aucune information parsée depuis l\'OCR');
      if (result) {
        console.log('🔤 [CardRecognition] Texte brut OCR:', result.rawText);
        // Essayer d'extraire au moins le nom depuis le texte brut
        const words = result.rawText.split(' ').filter(w => w.length > 2);
        if (words.length > 0 && words[0]) {
          setManualName(words[0]); // Pré-remplir avec le premier mot trouvé
        }
      }
      // Afficher le formulaire de saisie manuelle
      setShowManualInput(true);
    }
  };

  const handleManualSearch = () => {
    if (manualName.trim() && manualNumber.trim()) {
      const [cardNum] = manualNumber.split('/');
      if (cardNum) {
        searchCards(manualName.trim(), cardNum);
        setShowManualInput(false);
      }
    }
  };

  const searchCards = async (name: string, number: string) => {
    console.log(`🔎 [searchCards] Début recherche API - Nom: "${name}", Numéro: "${number}"`);
    setIsSearching(true);
    setSearchResults([]);

    try {
      // Utiliser le service backend (comme dans Discover.tsx)
      const searchQuery = `${name} ${number}`;
      console.log(`🌐 [searchCards] Recherche via backend:`, searchQuery);

      const data = await cardsService.searchCards({ q: searchQuery, limit: 50, lang: 'fr' });
      console.log(`📦 [searchCards] ${data.cards.length} cartes trouvées`);

      // Debug: afficher la structure de la première carte
      if (data.cards.length > 0) {
        console.log('🔍 [searchCards] Structure de la première carte:', data.cards[0]);
        console.log('🖼️ [searchCards] Images:', {
          image: data.cards[0]?.image,
          images: data.cards[0]?.images,
        });
      }

      // Filtrer et scorer les résultats
      const results: SearchResult[] = data.cards
        .map((card) => {
          let score = 0;

          // Correspondance exacte du numéro
          if (card.localId === number || card.localId?.startsWith(`${number}/`)) {
            score += 50;
            console.log(`✓ Correspondance numéro pour ${card.name} (${card.localId})`);
          }

          // Correspondance du nom (insensible à la casse)
          const cardNameLower = card.name.toLowerCase();
          const searchNameLower = name.toLowerCase();

          if (cardNameLower === searchNameLower) {
            score += 50;
            console.log(`✓ Correspondance exacte nom pour ${card.name}`);
          } else if (cardNameLower.includes(searchNameLower)) {
            score += 30;
            console.log(`✓ Correspondance partielle nom pour ${card.name}`);
          } else if (searchNameLower.includes(cardNameLower)) {
            score += 20;
            console.log(`✓ Nom inclus dans recherche pour ${card.name}`);
          }

          return { card, matchScore: score };
        })
        .filter((result) => {
          const keep = result.matchScore > 40;
          if (!keep) {
            console.log(`✗ Score trop faible (${result.matchScore}) pour ${result.card.name}`);
          }
          return keep;
        })
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 5); // Top 5 résultats

      console.log(`🎯 [searchCards] ${results.length} résultats après filtrage:`, results.map(r => ({ name: r.card.name, score: r.matchScore })));
      setSearchResults(results);
    } catch (err) {
      console.error('❌ [searchCards] Erreur lors de la recherche de cartes:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const renderModeContent = () => {
    // Ne pas afficher la prévisualisation si on a des résultats
    if (searchResults.length > 0) {
      return null;
    }

    switch (mode) {
      case 'upload':
        return (
          <div
            className={`${styles.uploadZone} ${isDragging ? styles.dragging : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className={styles.hiddenInput}
            />
            {previewImage ? (
              <div className={styles.previewContainer}>
                <img src={previewImage} alt="Preview" className={styles.preview} />
                <button
                  onClick={() => {
                    setPreviewImage(null);
                    setSearchResults([]);
                    resetResult();
                  }}
                  className={styles.clearButton}
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className={styles.uploadButton}
              >
                <Upload size={48} />
                <span>Glissez une image ou cliquez pour choisir</span>
                <span className={styles.uploadHint}>Formats acceptés: JPG, PNG, WEBP</span>
              </button>
            )}
          </div>
        );

      case 'photo':
        return (
          <div className={styles.cameraZone}>
            {previewImage ? (
              <div className={styles.previewContainer}>
                <img src={previewImage} alt="Captured" className={styles.preview} />
                <button
                  onClick={() => {
                    setPreviewImage(null);
                    setSearchResults([]);
                    resetResult();
                    startCamera();
                  }}
                  className={styles.clearButton}
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <>
                <video ref={videoRef} autoPlay playsInline className={styles.video}>
                  <track kind="captions" />
                </video>
                {isStreaming && (
                  <button onClick={handleCapture} className={styles.captureButton}>
                    <Camera size={24} />
                    <span>Capturer</span>
                  </button>
                )}
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const error = cameraError || ocrError;

  // Afficher le FullScreenLoader pendant l'analyse
  if (isProcessing || isSearching) {
    const message = isProcessing ? 'Analyse de la carte en cours...' : 'Recherche de la carte...';
    return <FullScreenLoader message={message} />;
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Reconnaître une carte</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.modes}>
          <button
            onClick={() => handleModeChange('upload')}
            className={mode === 'upload' ? styles.modeActive : styles.modeButton}
          >
            <Upload size={20} />
            <span>Galerie</span>
          </button>
          <button
            onClick={() => handleModeChange('photo')}
            className={mode === 'photo' ? styles.modeActive : styles.modeButton}
          >
            <Camera size={20} />
            <span>Photo</span>
          </button>
        </div>

        {!showManualInput && searchResults.length === 0 && <div className={styles.content}>{renderModeContent()}</div>}

        {error && (
          <div className={styles.error}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {lastResult && lastResult.parsedInfo && searchResults.length === 0 && (
          <div className={styles.ocrResult}>
            <div className={styles.ocrInfo}>
              <CheckCircle2 size={20} className={styles.successIcon} />
              <div>
                <strong>{lastResult.parsedInfo.name}</strong>
                <span>
                  {lastResult.parsedInfo.cardNumber}/{lastResult.parsedInfo.setTotal}
                </span>
              </div>
            </div>
            <span className={styles.confidence}>Confiance: {lastResult.confidence}%</span>
          </div>
        )}

        {showManualInput && (
          <div className={styles.manualInput}>
            <div className={styles.manualInputHeader}>
              <AlertCircle size={20} />
              <div className={styles.manualInputHeaderText}>
                <p>La reconnaissance automatique n&apos;a pas trouvé toutes les informations. Veuillez saisir manuellement :</p>
              </div>
            </div>
            {previewImage && (
              <div className={styles.manualInputPreview}>
                <img src={previewImage} alt="Carte scannée" className={styles.manualInputImage} />
              </div>
            )}
            <div className={styles.manualInputForm}>
              <div className={styles.inputGroup}>
                <label htmlFor="manual-name">Nom de la carte</label>
                <input
                  id="manual-name"
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Ex: Pikachu"
                  className={styles.manualInputField}
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="manual-number">Numéro de la carte</label>
                <input
                  id="manual-number"
                  type="text"
                  value={manualNumber}
                  onChange={(e) => setManualNumber(e.target.value)}
                  placeholder="Ex: 25/102"
                  className={styles.manualInputField}
                />
              </div>
              <div className={styles.manualInputActions}>
                <button
                  onClick={handleManualSearch}
                  disabled={!manualName.trim() || !manualNumber.trim()}
                  className={styles.searchButton}
                >
                  Rechercher
                </button>
                <button
                  onClick={() => {
                    setShowManualInput(false);
                    setManualName('');
                    setManualNumber('');
                    setPreviewImage(null);
                    setSearchResults([]);
                    resetResult();
                  }}
                  className={styles.retryButton}
                >
                  Réessayer
                </button>
              </div>
            </div>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className={styles.results}>
            <h3>Résultats ({searchResults.length})</h3>
            <div className={styles.cardList}>
              {searchResults.map((result) => {
                const imageUrl = getCardImageUrl(result.card);
                console.log(`🎴 [Résultat] ${result.card.name} - URL: ${imageUrl}`);

                return (
                  <div
                    key={result.card.id}
                    onClick={() => onCardSelected(result.card)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onCardSelected(result.card);
                      }
                    }}
                    className={styles.cardItem}
                    role="button"
                    tabIndex={0}
                  >
                    <img
                      src={imageUrl}
                      alt={result.card.name}
                      className={styles.cardImage}
                      loading="eager"
                      onLoad={() => {
                        console.log(`✅ [Image chargée] ${result.card.name}`);
                      }}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        const currentSrc = target.src;
                        console.error(`❌ [Erreur image] ${result.card.name} - URL: ${currentSrc}`);

                        // Si l'URL contient "high.png", essayer avec "high.webp"
                        if (currentSrc.includes('/high.png')) {
                          console.log('🔄 Tentative avec high.webp');
                          target.src = currentSrc.replace('/high.png', '/high.webp');
                        }
                        // Si c'est une URL TCGdex sans extension, essayer low.webp
                        else if (currentSrc.includes('assets.tcgdex.net') && currentSrc.includes('/high.webp')) {
                          console.log('🔄 Tentative avec low.webp');
                          target.src = currentSrc.replace('/high.webp', '/low.webp');
                        }
                        // Essayer l'URL sans /high ou /low
                        else if (currentSrc.includes('/low.webp') || currentSrc.includes('/low.png')) {
                          console.log('🔄 Tentative URL de base');
                          const baseUrl = currentSrc.replace(/\/(high|low)\.(webp|png)$/, '');
                          target.src = baseUrl;
                        }
                        // Si WebP échoue aussi, utiliser l'image de dos
                        else {
                          console.log('🔄 Utilisation image de dos par défaut');
                          target.src = 'https://images.pokemontcg.io/swsh1/back.png';
                        }
                      }}
                    />
                    <div className={styles.cardInfo}>
                      <strong>{result.card.name}</strong>
                      <span>
                        {result.card.set?.name} - {result.card.localId}
                      </span>
                    </div>
                    <div className={styles.matchScore}>{result.matchScore}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
