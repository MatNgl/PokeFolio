import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import styles from './QuickAddModal.module.css';

interface QuickAddModalProps {
  cardName: string;
  setName?: string;
  onClose: () => void;
  onAddDirect: () => void;
  onAddWithDetails: () => void;
}

export function QuickAddModal({
  cardName,
  setName,
  onClose,
  onAddDirect,
  onAddWithDetails,
}: QuickAddModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Bloquer le scroll du body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Focus auto
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // ESC pour fermer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="button"
      tabIndex={-1}
      aria-label="Fermer le modal"
    >
      <div
        ref={dialogRef}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-add-title"
        tabIndex={-1}
      >
        <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
          <X size={24} />
        </button>

        <h2 id="quick-add-title" className={styles.title}>
          Ajouter au portfolio
        </h2>

        <div className={styles.cardInfo}>
          <p className={styles.cardName}>{cardName}</p>
          {setName && <p className={styles.setName}>{setName}</p>}
        </div>

        <p className={styles.description}>
          Comment souhaitez-vous ajouter cette carte à votre portfolio ?
        </p>

        <div className={styles.actions}>
          <button onClick={onAddDirect} className={styles.quickBtn}>
            <span className={styles.btnTitle}>Ajouter directement</span>
            <span className={styles.btnDesc}>Sans prix ni date d'achat</span>
          </button>

          <button onClick={onAddWithDetails} className={styles.detailsBtn}>
            <span className={styles.btnTitle}>Ajouter avec détails</span>
            <span className={styles.btnDesc}>Prix, date, gradation…</span>
          </button>
        </div>
      </div>
    </div>
  );
}
