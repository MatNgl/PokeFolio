import { useEffect, useRef } from 'react';
import { Button } from './Button';
import styles from './DeleteConfirmModal.module.css';

interface DeleteConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function DeleteConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  loading = false,
}: DeleteConfirmModalProps) {
  const dialogRef = useRef<HTMLElement>(null);

  // Focus auto dans le modal
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // Fermer avec ESC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  // Accessibilité overlay
  const handleOverlayKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ' && e.target === e.currentTarget) {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      onKeyDown={handleOverlayKeyDown}
      role="button"
      aria-label="Fermer la fenêtre modale"
      tabIndex={0}
    >
      <section
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deleteConfirmTitle"
        tabIndex={-1}
      >
        <div className={styles.header}>
          <h2 id="deleteConfirmTitle">{title}</h2>
        </div>

        <div className={styles.content}>
          <p className={styles.message}>{message}</p>
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Annuler
          </Button>
          <Button type="button" onClick={onConfirm} loading={loading} className={styles.deleteBtn}>
            Supprimer
          </Button>
        </div>
      </section>
    </div>
  );
}
