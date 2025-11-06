import { useState, useRef, useEffect } from 'react';
import styles from './FilterButton.module.css';
import { SlidersHorizontal, Check } from 'lucide-react';

export type SortOption =
  | 'default'
  | 'quantity-asc'
  | 'quantity-desc'
  | 'price-asc'
  | 'price-desc'
  | 'date-asc'
  | 'date-desc'
  | 'name-asc'
  | 'name-desc';

interface FilterButtonProps {
  onSortChange: (sort: SortOption) => void;
  currentSort?: SortOption;
  context?: 'portfolio' | 'discover';
}

const getSortOptions = (
  context: 'portfolio' | 'discover'
): { value: SortOption; label: string }[] => {
  const baseOptions: { value: SortOption; label: string }[] = [
    { value: 'name-asc', label: 'Nom (A → Z)' },
    { value: 'name-desc', label: 'Nom (Z → A)' },
  ];

  if (context === 'portfolio') {
    return [
      { value: 'default', label: "Par défaut (ordre d'ajout)" },
      ...baseOptions,
      { value: 'quantity-desc', label: 'Quantité (↓)' },
      { value: 'quantity-asc', label: 'Quantité (↑)' },
      { value: 'price-desc', label: 'Prix (↓)' },
      { value: 'price-asc', label: 'Prix (↑)' },
      { value: 'date-desc', label: "Date d'achat (récent)" },
      { value: 'date-asc', label: "Date d'achat (ancien)" },
    ];
  }

  // Context 'discover'
  return [{ value: 'default', label: 'Par défaut' }, ...baseOptions];
};

export function FilterButton({
  onSortChange,
  currentSort = 'default',
  context = 'portfolio',
}: FilterButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Récupérer les options selon le contexte
  const sortOptions = getSortOptions(context);

  // Fermer le menu au clic extérieur
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

  const handleSelect = (option: SortOption) => {
    onSortChange(option);
    setIsOpen(false);
  };

  const currentLabel = sortOptions.find((opt) => opt.value === currentSort)?.label || 'Trier';

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
            {sortOptions.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  className={`${styles.option} ${currentSort === option.value ? styles.selected : ''}`}
                  onClick={() => handleSelect(option.value)}
                >
                  <span>{option.label}</span>
                  {currentSort === option.value && (
                    <Check size={16} className={styles.checkIcon} aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
