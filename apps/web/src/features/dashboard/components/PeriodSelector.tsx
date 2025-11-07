import { useState, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { PeriodFilter, PeriodType } from '../types/dashboard.types';
import styles from './PeriodSelector.module.css';

export type { PeriodFilter };

export interface PeriodSelectorProps {
  currentPeriod: PeriodFilter;
  onPeriodChange: (period: PeriodFilter) => void;
}

const MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

export function PeriodSelector({
  currentPeriod,
  onPeriodChange,
}: PeriodSelectorProps): JSX.Element {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // États locaux pour les sélecteurs
  const [selectedType, setSelectedType] = useState<PeriodType>(
    currentPeriod.type || PeriodType.ALL
  );
  const [selectedYear, setSelectedYear] = useState<number>(currentPeriod.year || currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentPeriod.month || currentMonth);
  const [selectedWeek, setSelectedWeek] = useState<number>(currentPeriod.week || 1);

  // Générer la liste des années (10 dernières années)
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  // Gérer le changement de type de période
  const handleTypeChange = (type: PeriodType): void => {
    setSelectedType(type);

    const newPeriod: PeriodFilter = { type };

    // Ajouter les paramètres en fonction du type
    switch (type) {
      case PeriodType.YEAR:
        newPeriod.year = selectedYear;
        break;
      case PeriodType.MONTH:
        newPeriod.year = selectedYear;
        newPeriod.month = selectedMonth;
        break;
      case PeriodType.WEEK:
        newPeriod.year = selectedYear;
        newPeriod.month = selectedMonth;
        newPeriod.week = selectedWeek;
        break;
      case PeriodType.ALL:
      default:
        break;
    }

    onPeriodChange(newPeriod);
  };

  // Gérer le changement d'année
  const handleYearChange = (year: number): void => {
    setSelectedYear(year);

    if (selectedType !== PeriodType.ALL) {
      const newPeriod: PeriodFilter = {
        type: selectedType,
        year,
      };

      if (selectedType === PeriodType.MONTH || selectedType === PeriodType.WEEK) {
        newPeriod.month = selectedMonth;
      }

      if (selectedType === PeriodType.WEEK) {
        newPeriod.week = selectedWeek;
      }

      onPeriodChange(newPeriod);
    }
  };

  // Gérer le changement de mois
  const handleMonthChange = (month: number): void => {
    setSelectedMonth(month);

    if (selectedType === PeriodType.MONTH || selectedType === PeriodType.WEEK) {
      const newPeriod: PeriodFilter = {
        type: selectedType,
        year: selectedYear,
        month,
      };

      if (selectedType === PeriodType.WEEK) {
        newPeriod.week = selectedWeek;
      }

      onPeriodChange(newPeriod);
    }
  };

  // Gérer le changement de semaine
  const handleWeekChange = (week: number): void => {
    setSelectedWeek(week);

    if (selectedType === PeriodType.WEEK) {
      onPeriodChange({
        type: PeriodType.WEEK,
        year: selectedYear,
        month: selectedMonth,
        week,
      });
    }
  };

  // Synchroniser avec les props externes
  useEffect(() => {
    if (currentPeriod.type) setSelectedType(currentPeriod.type);
    if (currentPeriod.year) setSelectedYear(currentPeriod.year);
    if (currentPeriod.month) setSelectedMonth(currentPeriod.month);
    if (currentPeriod.week) setSelectedWeek(currentPeriod.week);
  }, [currentPeriod]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Calendar className={styles.icon} aria-hidden="true" />
        <h2 className={styles.title}>Période d&apos;analyse</h2>
      </div>

      {/* Sélecteur de type de période */}
      <div className={styles.periodTypes} role="group" aria-label="Type de période">
        <button
          type="button"
          className={`${styles.typeButton} ${
            selectedType === PeriodType.WEEK ? styles.active : ''
          }`}
          onClick={() => handleTypeChange(PeriodType.WEEK)}
          aria-pressed={selectedType === PeriodType.WEEK}
        >
          Semaine
        </button>
        <button
          type="button"
          className={`${styles.typeButton} ${
            selectedType === PeriodType.MONTH ? styles.active : ''
          }`}
          onClick={() => handleTypeChange(PeriodType.MONTH)}
          aria-pressed={selectedType === PeriodType.MONTH}
        >
          Mois
        </button>
        <button
          type="button"
          className={`${styles.typeButton} ${
            selectedType === PeriodType.YEAR ? styles.active : ''
          }`}
          onClick={() => handleTypeChange(PeriodType.YEAR)}
          aria-pressed={selectedType === PeriodType.YEAR}
        >
          Année
        </button>
        <button
          type="button"
          className={`${styles.typeButton} ${selectedType === PeriodType.ALL ? styles.active : ''}`}
          onClick={() => handleTypeChange(PeriodType.ALL)}
          aria-pressed={selectedType === PeriodType.ALL}
        >
          Tout
        </button>
      </div>

      {/* Sélecteurs de date conditionnels */}
      {selectedType !== PeriodType.ALL && (
        <div className={styles.selectors}>
          {/* Sélecteur d'année */}
          {(selectedType === PeriodType.YEAR ||
            selectedType === PeriodType.MONTH ||
            selectedType === PeriodType.WEEK) && (
            <div className={styles.selectorGroup}>
              <label htmlFor="year-select" className={styles.label}>
                Année
              </label>
              <div className={styles.selectWrapper}>
                <select
                  id="year-select"
                  className={styles.select}
                  value={selectedYear}
                  onChange={(e) => handleYearChange(Number(e.target.value))}
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <ChevronDown className={styles.selectIcon} aria-hidden="true" />
              </div>
            </div>
          )}

          {/* Sélecteur de mois */}
          {(selectedType === PeriodType.MONTH || selectedType === PeriodType.WEEK) && (
            <div className={styles.selectorGroup}>
              <label htmlFor="month-select" className={styles.label}>
                Mois
              </label>
              <div className={styles.selectWrapper}>
                <select
                  id="month-select"
                  className={styles.select}
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(Number(e.target.value))}
                >
                  {MONTHS.map((month, index) => (
                    <option key={index} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
                <ChevronDown className={styles.selectIcon} aria-hidden="true" />
              </div>
            </div>
          )}

          {/* Sélecteur de semaine */}
          {selectedType === PeriodType.WEEK && (
            <div className={styles.selectorGroup}>
              <label htmlFor="week-select" className={styles.label}>
                Semaine
              </label>
              <div className={styles.selectWrapper}>
                <select
                  id="week-select"
                  className={styles.select}
                  value={selectedWeek}
                  onChange={(e) => handleWeekChange(Number(e.target.value))}
                >
                  {[1, 2, 3, 4].map((week) => (
                    <option key={week} value={week}>
                      Semaine {week}
                    </option>
                  ))}
                </select>
                <ChevronDown className={styles.selectIcon} aria-hidden="true" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
