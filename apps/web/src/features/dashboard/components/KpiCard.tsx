import { Eye, EyeOff } from 'lucide-react';
import styles from './KpiCard.module.css';

export interface KpiCardProps {
  title: string;
  icon: React.ReactNode;
  value: string;
  loading?: boolean;
  /** Permet de masquer la valeur avec un toggle */
  hideable?: boolean;
  /** Indique si la valeur est masquée */
  isHidden?: boolean;
  /** Callback pour basculer la visibilité */
  onToggleHidden?: () => void;
}

export function KpiCard({
  title,
  icon,
  value,
  loading = false,
  hideable = false,
  isHidden = false,
  onToggleHidden,
}: KpiCardProps): JSX.Element {
  if (loading) {
    return (
      <div className={styles.kpiCard} role="status" aria-label={`Loading ${title}`}>
        <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
        <div className={`${styles.skeleton} ${styles.skeletonValue}`} />
      </div>
    );
  }

  const displayValue = hideable && isHidden ? '••••••' : value;

  return (
    <div className={styles.kpiCard}>
      <div className={styles.header}>
        <div className={styles.iconWrapper} aria-hidden="true">
          {icon}
        </div>
        <h3 className={styles.title}>{title}</h3>
        {hideable && onToggleHidden && (
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={onToggleHidden}
            aria-label={isHidden ? 'Afficher la valeur' : 'Masquer la valeur'}
            title={isHidden ? 'Afficher la valeur' : 'Masquer la valeur'}
          >
            {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      <div className={styles.valueSection}>
        <div className={styles.value} aria-label={isHidden ? `${title}: masqué` : `${title}: ${value}`}>
          {displayValue}
        </div>
      </div>
    </div>
  );
}
