import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader } from './Loader';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?:
    | 'primary'
    | 'secondary'
    | 'ghost'
    | 'danger'
    | 'action'
    | 'success'
    | 'info'
    | 'warning';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${styles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      <span className={styles.buttonInner}>
        {loading ? (
          <div className={styles.loaderWrapper}>
            <Loader />
          </div>
        ) : (
          children
        )}
      </span>
    </button>
  );
}
