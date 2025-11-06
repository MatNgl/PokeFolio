import { useId } from 'react';
import styles from './FullScreenLoader.module.css';
import loaderStyles from './Loader.module.css';

interface FullScreenLoaderProps {
  message?: string;
}

interface LoaderProps {
  size?: number;
  'aria-label'?: string;
}

// Composant Loader inline (réutilisé partout)
export function Loader({ size = 100, ...aria }: LoaderProps) {
  const uid = useId();
  const maskId = `waves-${uid}`;
  const gradId = `lava-grad-${uid}`;
  const clipId = `ball-clip-${uid}`;

  return (
    <div
      className={loaderStyles.loader}
      style={{ '--d': `${size}px` } as React.CSSProperties}
      role="status"
      {...aria}
    >
      <svg className={loaderStyles.core} viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="30%" stopColor="var(--color-one)" />
            <stop offset="70%" stopColor="var(--color-two)" />
          </linearGradient>

          <mask id={maskId} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
            <rect x="0" y="0" width="100" height="100" fill="black" />
            <polygon points="25,25 75,25 50,75" fill="white" />
            <polygon points="50,25 75,75 25,75" fill="white" />
            <polygon points="35,35 65,35 50,65" fill="white" />
            <polygon points="35,35 65,35 50,65" fill="white" />
            <polygon points="35,35 65,35 50,65" fill="white" />
            <polygon points="35,35 65,35 50,65" fill="white" />
          </mask>

          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            <circle cx="50" cy="50" r="49" />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          <circle cx="50" cy="50" r="49" fill={`url(#${gradId})`} mask={`url(#${maskId})`} />
        </g>
      </svg>
    </div>
  );
}

// Loader plein écran
export function FullScreenLoader({ message = 'Chargement...' }: FullScreenLoaderProps) {
  return (
    <div className={styles.overlay} role="status" aria-live="polite">
      <div className={styles.content}>
        <Loader size={120} aria-label={message} />
        {message && <p className={styles.message}>{message}</p>}
      </div>
    </div>
  );
}
