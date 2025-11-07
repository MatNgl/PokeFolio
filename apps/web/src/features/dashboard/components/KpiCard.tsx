import styles from './KpiCard.module.css';

export interface KpiCardProps {
  title: string;
  icon: React.ReactNode;
  value: string;
  loading?: boolean;
}

export function KpiCard({ title, icon, value, loading = false }: KpiCardProps): JSX.Element {
  if (loading) {
    return (
      <div className={styles.kpiCard} role="status" aria-label={`Loading ${title}`}>
        <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
        <div className={`${styles.skeleton} ${styles.skeletonValue}`} />
      </div>
    );
  }

  return (
    <div className={styles.kpiCard}>
      <div className={styles.header}>
        <div className={styles.iconWrapper} aria-hidden="true">
          {icon}
        </div>
        <h3 className={styles.title}>{title}</h3>
      </div>

      <div className={styles.valueSection}>
        <div className={styles.value} aria-label={`${title}: ${value}`}>
          {value}
        </div>
      </div>
    </div>
  );
}
