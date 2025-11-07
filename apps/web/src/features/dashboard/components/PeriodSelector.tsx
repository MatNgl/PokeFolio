import { useState } from 'react';
import { Calendar, RotateCcw } from 'lucide-react';
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
  const [customDate, setCustomDate] = useState<string>('');

  const handleQuickPeriodChange = (period: QuickPeriod): void => {
    setSelectedQuickPeriod(period);
    setCustomDate(''); // Reset custom date when selecting a quick period

    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
      default:
        // Pour 'all', on ne définit pas de dates (backend gérera)
        onPeriodChange({});
        return;
    }

    // Envoyer les dates au format ISO
    onPeriodChange({
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
    });
  };

  const handleCustomDateChange = (date: string): void => {
    setCustomDate(date);

    if (!date || !selectedQuickPeriod || selectedQuickPeriod === 'all') return;

    const selectedDate = new Date(date);
    const now = new Date();

    // Calculer la période en fonction du bouton actif
    let endDate = new Date(selectedDate);

    switch (selectedQuickPeriod) {
      case '7d':
        endDate.setDate(selectedDate.getDate() + 7);
        break;
      case '30d':
        // Si on sélectionne une date et "30d", on affiche le mois de cette date
        endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        break;
      case '90d':
        endDate.setDate(selectedDate.getDate() + 90);
        break;
      case '1y':
        endDate = new Date(selectedDate.getFullYear(), 11, 31);
        break;
    }

    // Ne pas dépasser la date actuelle
    if (endDate > now) {
      endDate = now;
    }

    onPeriodChange({
      startDate: selectedDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  };

  const handleReset = (): void => {
    setSelectedQuickPeriod('all');
    setCustomDate('');
    onPeriodChange({});
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

        {/* Sélecteur de date personnalisé */}
        <div className={styles.customControls}>
          <div className={styles.datePickerWrapper}>
            <Calendar className={styles.dateIcon} size={16} aria-hidden="true" />
            <input
              type="date"
              className={styles.datePicker}
              value={customDate}
              onChange={(e) => handleCustomDateChange(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              aria-label="Date personnalisée"
            />
          </div>

          <button
            type="button"
            className={styles.resetButton}
            onClick={handleReset}
            aria-label="Réinitialiser les filtres"
            title="Réinitialiser"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
