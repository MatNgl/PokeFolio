import { Menu, LayoutGrid } from 'lucide-react';
import styles from './ViewSwitcher.module.css';

type ViewMode = 'grid' | 'compact' | 'detailed';

interface ViewSwitcherProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  options?: {
    first: ViewMode;
    second: ViewMode;
  };
}

export function ViewSwitcher({
  currentView,
  onViewChange,
  options = { first: 'compact', second: 'grid' },
}: ViewSwitcherProps) {
  const getIcon = (view: ViewMode) => {
    switch (view) {
      case 'compact':
      case 'detailed':
        return <Menu size={18} />;
      case 'grid':
        return <LayoutGrid size={18} />;
      default:
        return <LayoutGrid size={18} />;
    }
  };

  const getTitle = (view: ViewMode) => {
    switch (view) {
      case 'compact':
        return 'Vue compact';
      case 'detailed':
        return 'Vue détaillée';
      case 'grid':
        return 'Vue grille';
      default:
        return 'Vue';
    }
  };

  return (
    <div className={styles.switcher}>
      <button
        type="button"
        className={`${styles.btn} ${currentView === options.first ? styles.active : ''}`}
        onClick={() => onViewChange(options.first)}
        title={getTitle(options.first)}
        aria-label={getTitle(options.first)}
      >
        {getIcon(options.first)}
      </button>
      <button
        type="button"
        className={`${styles.btn} ${currentView === options.second ? styles.active : ''}`}
        onClick={() => onViewChange(options.second)}
        title={getTitle(options.second)}
        aria-label={getTitle(options.second)}
      >
        {getIcon(options.second)}
      </button>
    </div>
  );
}

export default ViewSwitcher;
