import styles from './StatCard.module.css';

export interface StatCardProps {
  title: string;
  icon: React.ReactNode;
  value: string;
  loading?: boolean;
  variant?: 'default' | 'profit' | 'loss';
}

export function StatCard({
  title,
  icon,
  value,
  loading = false,
  variant = 'default',
}: StatCardProps): JSX.Element {
  if (loading) {
    return (
      <div className={styles.statCard} role="status" aria-label={`Loading ${title}`}>
        <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
        <div className={`${styles.skeleton} ${styles.skeletonValue}`} />
      </div>
    );
  }

  return (
    <div className={styles.statCard}>
      <div className={styles.header}>
        <div className={styles.iconWrapper} aria-hidden="true">
          {icon}
        </div>
        <h3 className={styles.title}>{title}</h3>
      </div>

      <div className={styles.valueSection}>
        <div
          className={`${styles.value} ${variant === 'profit' ? styles.valueProfit : ''} ${variant === 'loss' ? styles.valueLoss : ''}`}
          aria-label={`${title}: ${value}`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
