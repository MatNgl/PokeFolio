import { forwardRef, type InputHTMLAttributes } from 'react';

import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    // Empêcher le scroll de changer la valeur des inputs number
    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      if (props.type === 'number') {
        e.currentTarget.blur();
      }
    };

    return (
      <div className={styles.wrapper}>
        {label && <label className={styles.label}>{label}</label>}
        <input
          ref={ref}
          className={`${styles.input} ${className}`}
          onWheel={handleWheel}
          {...props}
        />
        {error && <span className={styles.error}>{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
