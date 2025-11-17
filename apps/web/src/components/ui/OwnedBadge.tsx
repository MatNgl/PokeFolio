import { CheckCircle2 } from 'lucide-react';
import styles from './OwnedBadge.module.css';

interface OwnedBadgeProps {
  isOwned: boolean;
  className?: string;
}

export function OwnedBadge({ isOwned, className = '' }: OwnedBadgeProps) {
  if (!isOwned) return null;

  return (
    <div className={`${styles.badge} ${className}`} title="Carte possédée">
      <CheckCircle2 size={16} />
      <span>Possédée</span>
    </div>
  );
}
