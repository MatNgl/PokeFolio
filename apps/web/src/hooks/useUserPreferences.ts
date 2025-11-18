import { useState, useEffect, useCallback } from 'react';

// Types des préférences utilisateur
export interface UserPreferences {
  // Portfolio
  portfolioViewMode: 'grid' | 'compact';
  portfolioSortBy: string;
  portfolioSortOrder: 'asc' | 'desc';

  // Sets
  setsViewMode: 'grid' | 'detailed';
  setsSortBy: string;
  setsSortOrder: 'asc' | 'desc';
  setsShowAll: boolean;

  // Set spécifique
  setDetailShowComplete: boolean;

  // Dashboard
  dashboardHideValue: boolean;

  // Filtres portfolio
  portfolioShowOnlyGraded: boolean;
  portfolioShowOnlyFavorites: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  // Portfolio
  portfolioViewMode: 'grid',
  portfolioSortBy: 'name',
  portfolioSortOrder: 'asc',

  // Sets
  setsViewMode: 'detailed',
  setsSortBy: 'name',
  setsSortOrder: 'asc',
  setsShowAll: false,

  // Set spécifique
  setDetailShowComplete: false,

  // Dashboard
  dashboardHideValue: false,

  // Filtres portfolio
  portfolioShowOnlyGraded: false,
  portfolioShowOnlyFavorites: false,
};

const STORAGE_KEY = 'pokefolio_user_preferences';

function loadPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Fusionner avec les valeurs par défaut pour gérer les nouvelles préférences
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch (error) {
    console.error('Erreur lors du chargement des préférences:', error);
  }
  return DEFAULT_PREFERENCES;
}

function savePreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des préférences:', error);
  }
}

// Hook principal pour gérer les préférences
export function useUserPreferences() {
  const [preferences, setPreferencesState] = useState<UserPreferences>(loadPreferences);

  // Sauvegarder automatiquement quand les préférences changent
  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  // Mettre à jour une préférence spécifique
  const setPreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPreferencesState((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  // Mettre à jour plusieurs préférences à la fois
  const setPreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferencesState((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Réinitialiser toutes les préférences
  const resetPreferences = useCallback(() => {
    setPreferencesState(DEFAULT_PREFERENCES);
  }, []);

  return {
    preferences,
    setPreference,
    setPreferences,
    resetPreferences,
  };
}

// Hooks spécialisés pour chaque section

// Hook pour les préférences du portfolio
export function usePortfolioPreferences() {
  const { preferences, setPreference } = useUserPreferences();

  return {
    viewMode: preferences.portfolioViewMode,
    setViewMode: (mode: 'grid' | 'compact') => setPreference('portfolioViewMode', mode),

    sortBy: preferences.portfolioSortBy,
    setSortBy: (sort: string) => setPreference('portfolioSortBy', sort),

    sortOrder: preferences.portfolioSortOrder,
    setSortOrder: (order: 'asc' | 'desc') => setPreference('portfolioSortOrder', order),

    showOnlyGraded: preferences.portfolioShowOnlyGraded,
    setShowOnlyGraded: (show: boolean) => setPreference('portfolioShowOnlyGraded', show),

    showOnlyFavorites: preferences.portfolioShowOnlyFavorites,
    setShowOnlyFavorites: (show: boolean) => setPreference('portfolioShowOnlyFavorites', show),
  };
}

// Hook pour les préférences des sets
export function useSetsPreferences() {
  const { preferences, setPreference } = useUserPreferences();

  return {
    viewMode: preferences.setsViewMode,
    setViewMode: (mode: 'grid' | 'detailed') => setPreference('setsViewMode', mode),

    sortBy: preferences.setsSortBy,
    setSortBy: (sort: string) => setPreference('setsSortBy', sort),

    sortOrder: preferences.setsSortOrder,
    setSortOrder: (order: 'asc' | 'desc') => setPreference('setsSortOrder', order),

    showAll: preferences.setsShowAll,
    setShowAll: (show: boolean) => setPreference('setsShowAll', show),
  };
}

// Hook pour les préférences d'un set spécifique
export function useSetDetailPreferences() {
  const { preferences, setPreference } = useUserPreferences();

  return {
    showComplete: preferences.setDetailShowComplete,
    setShowComplete: (show: boolean) => setPreference('setDetailShowComplete', show),
  };
}

// Hook pour les préférences du dashboard
export function useDashboardPreferences() {
  const { preferences, setPreference } = useUserPreferences();

  return {
    hideValue: preferences.dashboardHideValue,
    setHideValue: (hide: boolean) => setPreference('dashboardHideValue', hide),
  };
}

export default useUserPreferences;
