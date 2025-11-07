import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MetricChange } from '../types/dashboard.types';
import styles from './KpiCard.module.css';

export interface KpiCardProps {
  title: string;
  icon: React.ReactNode;
  value: string;
  change?: MetricChange;
  loading?: boolean;
  formatter?: (value: number) => string;
}

export function KpiCard({
  title,
  icon,
  value,
  change,
  loading = false,
  formatter,
}: KpiCardProps): JSX.Element {
  if (loading) {
    return (
      <div className={styles.kpiCard} role="status" aria-label={`Loading ${title}`}>
        <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
        <div className={`${styles.skeleton} ${styles.skeletonValue}`} />
        <div className={`${styles.skeleton} ${styles.skeletonChange}`} />
      </div>
    );
  }

  const isPositive = change && change.percentChange > 0;
  const isNegative = change && change.percentChange < 0;

  const changeClass = isPositive
    ? styles.changePositive
    : isNegative
      ? styles.changeNegative
      : styles.changeNeutral;

  const ChangeIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  const formattedPrevious = change
    ? formatter
      ? formatter(change.previousValue)
      : change.previousValue.toLocaleString()
    : '';

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

      {change && (
        <div className={styles.changeSection}>
          <div className={changeClass} aria-label={`Change: ${change.percentChange}%`}>
            <ChangeIcon className={styles.changeIcon} aria-hidden="true" />
            <span>
              {change.percentChange > 0 ? '+' : ''}
              {change.percentChange.toFixed(1)}%
            </span>
          </div>
          <span className={styles.previousValue} aria-label={`Previous: ${formattedPrevious}`}>
            vs {formattedPrevious}
          </span>
        </div>
      )}
    </div>
  );
}
