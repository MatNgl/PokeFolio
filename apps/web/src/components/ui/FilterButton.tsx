import { useState, useRef, useEffect } from 'react';
import styles from './FilterButton.module.css';
import { SlidersHorizontal, Check, ChevronUp, ChevronDown } from 'lucide-react';

export type SortField = 'default' | 'name' | 'quantity' | 'price' | 'date' | 'graded';
export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  direction: SortDirection;
}

interface FilterButtonProps {
  onSortChange: (sort: SortOption) => void;
  currentSort?: SortOption;
  context?: 'portfolio' | 'discover' | 'sets';
}

const getSortFields = (context: 'portfolio' | 'discover' | 'sets'): SortField[] => {
  if (context === 'portfolio') {
    return ['default', 'name', 'quantity', 'price', 'date', 'graded'];
  }
  if (context === 'sets') {
    return ['date', 'quantity', 'name'];
  }
  return ['default', 'name'];
};

const getFieldLabel = (field: SortField, context?: 'portfolio' | 'discover' | 'sets'): string => {
  switch (field) {
    case 'default':
      return "Par défaut (ordre d'ajout)";
    case 'name':
      return 'Nom';
    case 'quantity':
      return 'Quantité';
    case 'price':
      return 'Prix';
    case 'date':
      return context === 'sets' ? 'Date de sortie' : "Date d'achat";
    case 'graded':
      return 'Gradées';
    default:
      return field;
  }
};

export function FilterButton({
  onSortChange,
  currentSort = { field: 'default', direction: 'asc' },
  context = 'portfolio',
}: FilterButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sortFields = getSortFields(context);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (field: SortField) => {
    if (field === 'default') {
      onSortChange({ field: 'default', direction: 'asc' });
    } else if (currentSort.field === field) {
      // Toggle direction si même champ
      const newDirection = currentSort.direction === 'asc' ? 'desc' : 'asc';
      onSortChange({ field, direction: newDirection });
    } else {
      // Nouveau champ, commencer par ascendant
      onSortChange({ field, direction: 'asc' });
    }
    setIsOpen(false);
  };

  return (
    <div className={styles.filterContainer} ref={dropdownRef}>
      <button
        type="button"
        className={`${styles.filterButton} ${isOpen ? styles.active : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Options de tri"
        aria-expanded={isOpen}
      >
        <SlidersHorizontal size={18} aria-hidden />
        <span className={styles.filterLabel}>Trier</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <SlidersHorizontal size={16} aria-hidden />
            <span>Trier par</span>
          </div>
          <ul className={styles.optionList}>
            {sortFields.map((field) => {
              const isSelected = currentSort.field === field;
              const showDirection = isSelected && field !== 'default';
              return (
                <li key={field}>
                  <button
                    type="button"
                    className={`${styles.option} ${isSelected ? styles.selected : ''}`}
                    onClick={() => handleSelect(field)}
                  >
                    <span>{getFieldLabel(field, context)}</span>
                    <div className={styles.iconGroup}>
                      {showDirection && (
                        <>
                          {currentSort.direction === 'asc' ? (
                            <ChevronUp size={16} className={styles.directionIcon} aria-hidden />
                          ) : (
                            <ChevronDown size={16} className={styles.directionIcon} aria-hidden />
                          )}
                        </>
                      )}
                      {isSelected && <Check size={16} className={styles.checkIcon} aria-hidden />}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
