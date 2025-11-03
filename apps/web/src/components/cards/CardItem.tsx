// apps/web/src/components/cards/CardItem.tsx
import styles from './CardItem.module.css';
import type { Card } from '@pokefolio/types';

type Props = {
  card: Card;
  onAdd?: (card: Card) => void;
};

export default function CardItem({ card, onAdd }: Props) {
  const img = card.images?.small ?? card.image ?? 'https://placehold.co/223x310?text=No+Image';

  const setLabel = card.set?.name?.trim() || card.set?.id?.trim() || 'Set inconnu';

  const localRef = card.localId?.trim() || card.id;

  function handleAdd() {
    if (onAdd) onAdd(card);
  }

  return (
    <article className={styles.card} aria-label={`${card.name} • ${setLabel}`}>
      <div className={styles.thumbWrap}>
        <img
          className={styles.thumb}
          src={img}
          alt={card.name}
          loading="lazy"
          sizes="(max-width: 600px) 45vw, 220px"
        />
        {card.rarity && (
          <span className={styles.badge} title="Rareté">
            {card.rarity}
          </span>
        )}
      </div>

      <div className={styles.meta}>
        <h3 className={styles.title} title={card.name}>
          {card.name}
        </h3>
        <p className={styles.sub} title={`${setLabel} • #${localRef}`}>
          {setLabel} · #{localRef}
        </p>
      </div>

      {onAdd && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.addBtn}
            onClick={handleAdd}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleAdd();
              }
            }}
            aria-label={`Ajouter ${card.name} (${setLabel}) au portfolio`}
          >
            Ajouter au portfolio
          </button>
        </div>
      )}
    </article>
  );
}
