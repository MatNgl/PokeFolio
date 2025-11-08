import { useState } from 'react';
import { PeriodFilter } from '../types/dashboard.types';
import styles from './PeriodSelector.module.css';

export type { PeriodFilter };

export interface PeriodSelectorProps {
  currentPeriod: PeriodFilter;
  onPeriodChange: (period: PeriodFilter) => void;
}

type QuickPeriod = '7d' | '30d' | '90d' | '1y' | 'all';

export function PeriodSelector({
  currentPeriod,
  onPeriodChange,
}: PeriodSelectorProps): JSX.Element {
  const [selectedQuickPeriod, setSelectedQuickPeriod] = useState<QuickPeriod>('all');

  const handleQuickPeriodChange = (period: QuickPeriod): void => {
    setSelectedQuickPeriod(period);

    if (period === 'all') {
      // Pour 'all', on ne définit pas de dates (backend gérera)
      onPeriodChange({});
      return;
    }

    const now = new Date();
    // Utiliser les timestamps pour éviter les problèmes de changement de mois
    const nowTime = now.getTime();
    let startTime: number;

    switch (period) {
      case '7d':
        // 7 jours en millisecondes
        startTime = nowTime - 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        // 30 jours en millisecondes
        startTime = nowTime - 30 * 24 * 60 * 60 * 1000;
        break;
      case '90d':
        // 90 jours en millisecondes
        startTime = nowTime - 90 * 24 * 60 * 60 * 1000;
        break;
      case '1y':
        // 365 jours en millisecondes
        startTime = nowTime - 365 * 24 * 60 * 60 * 1000;
        break;
      default:
        onPeriodChange({});
        return;
    }

    const startDate = new Date(startTime);

    // Envoyer les dates au format ISO
    onPeriodChange({
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.controlsWrapper}>
        {/* Boutons de période rapide */}
        <div className={styles.quickButtons} role="group" aria-label="Périodes rapides">
          <button
            type="button"
            className={`${styles.quickButton} ${selectedQuickPeriod === '7d' ? styles.active : ''}`}
            onClick={() => handleQuickPeriodChange('7d')}
            aria-pressed={selectedQuickPeriod === '7d'}
          >
            7j
          </button>
          <button
            type="button"
            className={`${styles.quickButton} ${
              selectedQuickPeriod === '30d' ? styles.active : ''
            }`}
            onClick={() => handleQuickPeriodChange('30d')}
            aria-pressed={selectedQuickPeriod === '30d'}
          >
            30j
          </button>
          <button
            type="button"
            className={`${styles.quickButton} ${
              selectedQuickPeriod === '90d' ? styles.active : ''
            }`}
            onClick={() => handleQuickPeriodChange('90d')}
            aria-pressed={selectedQuickPeriod === '90d'}
          >
            90j
          </button>
          <button
            type="button"
            className={`${styles.quickButton} ${selectedQuickPeriod === '1y' ? styles.active : ''}`}
            onClick={() => handleQuickPeriodChange('1y')}
            aria-pressed={selectedQuickPeriod === '1y'}
          >
            1 an
          </button>
          <button
            type="button"
            className={`${styles.quickButton} ${
              selectedQuickPeriod === 'all' ? styles.active : ''
            }`}
            onClick={() => handleQuickPeriodChange('all')}
            aria-pressed={selectedQuickPeriod === 'all'}
          >
            Tout
          </button>
        </div>
      </div>
    </div>
  );
}
