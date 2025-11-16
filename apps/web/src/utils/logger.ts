/**
 * Utilitaire de logging pour le développement
 * Les logs sont désactivés en production
 */

const isDevelopment = import.meta.env.MODE === 'development';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    // Les erreurs sont toujours loguées
    // eslint-disable-next-line no-console
    console.error(...args);
  },
};
