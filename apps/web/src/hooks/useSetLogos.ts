import { useState, useEffect } from 'react';

interface SetLogoCache {
  [setId: string]: string | null;
}

// Cache global pour éviter de refaire les requêtes
const logoCache: SetLogoCache = {};

/**
 * Hook pour récupérer les logos des sets depuis TCGDex
 */
export function useSetLogos(setIds: string[]): Record<string, string | null> {
  const [logos, setLogos] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (setIds.length === 0) return;

    const fetchLogos = async () => {
      const newLogos: Record<string, string | null> = {};
      const toFetch: string[] = [];

      // Vérifier le cache d'abord
      for (const setId of setIds) {
        if (setId in logoCache) {
          newLogos[setId] = logoCache[setId] ?? null;
        } else {
          toFetch.push(setId);
        }
      }

      // Fetch les logos manquants
      if (toFetch.length > 0) {
        const results = await Promise.all(
          toFetch.map(async (setId) => {
            try {
              const response = await fetch(`https://api.tcgdex.net/v2/fr/sets/${setId}`);
              if (response.ok) {
                const data = await response.json();
                const logo = data.logo || null;
                logoCache[setId] = logo;
                return { setId, logo };
              }
              logoCache[setId] = null;
              return { setId, logo: null };
            } catch {
              logoCache[setId] = null;
              return { setId, logo: null };
            }
          })
        );

        for (const { setId, logo } of results) {
          newLogos[setId] = logo;
        }
      }

      setLogos(newLogos);
    };

    void fetchLogos();
  }, [setIds.join(',')]);

  return logos;
}

/**
 * Résout l'URL complète du logo TCGDex
 */
export function resolveLogoUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null;

  // Si l'URL est déjà complète, la retourner
  if (logoUrl.startsWith('http')) {
    // Ajouter l'extension si nécessaire pour TCGDex
    if (logoUrl.includes('assets.tcgdex.net') && !logoUrl.match(/\.(webp|png|jpg|jpeg)$/i)) {
      return `${logoUrl}.png`;
    }
    return logoUrl;
  }

  return logoUrl;
}
