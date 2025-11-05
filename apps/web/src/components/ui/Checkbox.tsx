import { type InputHTMLAttributes, forwardRef } from 'react';
import styles from './Checkbox.module.css';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, className = '', ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={`${styles.container} ${className}`}>
        <input ref={ref} type="checkbox" id={checkboxId} className={styles.cbx} {...props} />
        <label htmlFor={checkboxId} className={styles.check} aria-label={label || 'checkbox'}>
          <svg width="18px" height="18px" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M1,9 L1,3.5 C1,2 2,1 3.5,1 L14.5,1 C16,1 17,2 17,3.5 L17,14.5 C17,16 16,17 14.5,17 L3.5,17 C2,17 1,16 1,14.5 L1,9 Z"></path>
            <polyline points="1 9 7 14 15 4"></polyline>
          </svg>
        </label>
        {label && (
        <label htmlFor={checkboxId} className={styles.label}>
          {label}
        </label>
      )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
