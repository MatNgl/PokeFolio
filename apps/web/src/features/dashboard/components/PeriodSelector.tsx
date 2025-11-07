import { useState } from 'react';
import { Calendar } from 'lucide-react';
import styles from './PeriodSelector.module.css';

export type PeriodType =
  | '7d'
  | '30d'
  | '6m'
  | '1y'
  | 'month'
  | 'quarter'
  | 'year'
  | 'all'
  | 'custom';

export interface Period {
  type: PeriodType;
  label: string;
  customStart?: Date;
  customEnd?: Date;
}

export interface PeriodSelectorProps {
  currentPeriod: Period;
  onPeriodChange: (period: Period) => void;
}

const PRESET_PERIODS: Array<{ type: PeriodType; label: string }> = [
  { type: '7d', label: '7 Jours' },
  { type: '30d', label: '30 Jours' },
  { type: '6m', label: '6 Mois' },
  { type: '1y', label: '1 An' },
  { type: 'month', label: 'Ce Mois' },
  { type: 'quarter', label: 'Ce Trimestre' },
  { type: 'year', label: 'Cette Année' },
  { type: 'all', label: 'Tout' },
];

export function PeriodSelector({
  currentPeriod,
  onPeriodChange,
}: PeriodSelectorProps): JSX.Element {
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const handlePresetClick = (type: PeriodType, label: string): void => {
    onPeriodChange({ type, label });
  };

  const handleApplyCustom = (): void => {
    if (!customStart || !customEnd) return;

    const start = new Date(customStart);
    const end = new Date(customEnd);

    if (start > end) {
      alert('La date de début doit être antérieure à la date de fin');
      return;
    }

    onPeriodChange({
      type: 'custom',
      label: `${start.toLocaleDateString('fr-FR')} - ${end.toLocaleDateString('fr-FR')}`,
      customStart: start,
      customEnd: end,
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <Calendar className={styles.icon} aria-hidden="true" />
          <span>Période d&apos;analyse</span>
        </div>
      </div>

      <div className={styles.periodTabs} role="group" aria-label="Sélection de période">
        {PRESET_PERIODS.map((preset) => (
          <button
            key={preset.type}
            type="button"
            className={`${styles.periodButton} ${
              currentPeriod.type === preset.type ? styles.active : ''
            }`}
            onClick={() => handlePresetClick(preset.type, preset.label)}
            aria-pressed={currentPeriod.type === preset.type}
            aria-label={`Période: ${preset.label}`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className={styles.customSection}>
        <label htmlFor="custom-start" className="sr-only">
          Date de début
        </label>
        <input
          id="custom-start"
          type="date"
          className={styles.dateInput}
          value={customStart}
          onChange={(e) => setCustomStart(e.target.value)}
          placeholder="Date de début"
          aria-label="Date de début personnalisée"
        />

        <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>à</span>

        <label htmlFor="custom-end" className="sr-only">
          Date de fin
        </label>
        <input
          id="custom-end"
          type="date"
          className={styles.dateInput}
          value={customEnd}
          onChange={(e) => setCustomEnd(e.target.value)}
          placeholder="Date de fin"
          aria-label="Date de fin personnalisée"
        />

        <button
          type="button"
          className={styles.applyButton}
          onClick={handleApplyCustom}
          disabled={!customStart || !customEnd}
          aria-label="Appliquer la période personnalisée"
        >
          Appliquer
        </button>
      </div>
    </div>
  );
}
