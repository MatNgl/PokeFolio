import { useState, useEffect, useMemo } from 'react';
import type { UserCard } from '@pokefolio/types';
import {
  portfolioService,
  type PortfolioCard,
  type PortfolioStats,
} from '../services/portfolio.service';
import { AddCardModal } from '../components/cards/AddCardModal';
import { EditCardModal } from '../components/cards/EditCardModal';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';
import PortfolioCardDetailsModal from '../components/cards/PortfolioCardDetailsModal';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Loader } from '../components/ui/Loader';
import styles from './Portfolio.module.css';
import { Toast } from '../components/ui/Toast';

/** ---- Types côté UI ---- */
type PortfolioVariant = {
  purchasePrice?: number;
  purchaseDate?: string | Date;
  isGraded?: boolean;
  gradeCompany?: string;
  gradeScore?: string | number;
  notes?: string;
};

type UserCardView = Partial<Omit<UserCard, 'gradeScore' | 'imageUrl'>> & {
  cardId: string; // obligatoire
  name: string; // obligatoire
  quantity: number; // obligatoire
  gradeScore?: string; // string côté UI (l'API peut renvoyer number)
  imageUrl?: string; // assuré par resolveImg
  _id?: string;
  id?: string;
  image?: string;
  images?: { small?: string; large?: string };
  variants?: PortfolioVariant[];
  setCardCount?: number;
  ownerId?: string;
  userId?: string;
  language?: string;
  types?: string[];
  supertype?: string;
  subtypes?: string[];
  currentValue?: number;
  createdAt?: string;
  updatedAt?: string;
};

/** ---- Types “bruts” possibles venant de l’API (tolérants) ---- */
type ApiCard = {
  _id?: string;
  id?: string;
  userId?: string; // parfois présent
  ownerId?: string; // alias fréquent côté backend
  cardId: string;
  name: string;
  quantity: number;
  imageUrl?: string;
  image?: string;
  images?: { small?: string; large?: string };
  setId?: string;
  setName?: string;
  number?: string;
  rarity?: string;
  isGraded?: boolean;
  gradeCompany?: string;
  gradeScore?: number | string;
  purchasePrice?: number;
  purchaseDate?: string;
  currentValue?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ApiStats = {
  // Champs de l'API backend
  nbCartes?: number;
  nbCartesDistinctes?: number;
  coutTotalAchatCents?: number;
  nbSets?: number;
  nbGraded?: number;
  // Champs de l'ancien système
  totalCards?: number;
  distinctCards?: number;
  uniqueCards?: number;
  totalCost?: number;
  totalCurrent?: number;
  totalValue?: number;
  gradedCards?: number;
  graded?: number;
};

const PLACEHOLDER_IMG = 'https://placehold.co/245x342?text=Card';

/** ---- Utils ---- */
function euro(n: number | undefined | null): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return '0,00 €';
  return `${n.toFixed(2)} €`;
}

const resolveImg = (c: ApiCard) => {
  let img = c.imageUrl || c.image || c.images?.small;

  // Si l'URL provient de assets.tcgdex.net et n'a pas d'extension, ajouter /high.webp
  if (img && img.includes('assets.tcgdex.net') && !img.match(/\.(webp|png|jpg|jpeg)$/i)) {
    img = `${img}/high.webp`;
  }

  return img || PLACEHOLDER_IMG;
};

const normalizeCard = (c: ApiCard): UserCardView => {
  const gradeScore = typeof c.gradeScore === 'number' ? String(c.gradeScore) : c.gradeScore;

  return {
    ...c,
    userId: c.userId ?? c.ownerId, // mappe ownerId -> userId si besoin
    imageUrl: resolveImg(c),
    gradeScore,
  };
};

const normalizeStats = (s: ApiStats): PortfolioStats => {
  const uniqueCards = s.uniqueCards ?? s.distinctCards ?? 0;
  const totalValue = s.totalValue ?? s.totalCurrent ?? s.totalCost ?? 0; // Utilise totalCost si pas de currentValue
  const gradedCards = s.gradedCards ?? s.graded ?? 0;

  return {
    // Champs obligatoires de l'API
    nbCartes: s.totalCards ?? s.nbCartes ?? 0,
    nbCartesDistinctes: uniqueCards,
    coutTotalAchatCents: s.totalCost ?? s.coutTotalAchatCents ?? 0, // Stocké en euros (float)
    nbSets: s.nbSets ?? 0,
    nbGraded: gradedCards,
    // Champs optionnels pour compatibilité
    totalCards: s.totalCards ?? 0,
    uniqueCards,
    totalCost: s.totalCost ?? 0,
    totalValue,
    profit: 0, // hors affichage
    gradedCards,
  };
};

// Convertit une entry API (PortfolioCard) en UserCardView pour EditModal
function toUserCardView(entry: PortfolioCard): UserCardView {
  return {
    _id: entry._id,
    id: entry._id,
    cardId: entry.cardId,
    name: entry.name,
    quantity: entry.quantity,
    imageUrl: entry.imageUrl,
    image: entry.imageUrl,
    images: entry.imageUrl ? { small: entry.imageUrl, large: entry.imageUrlHiRes } : undefined,
    setId: entry.setId,
    setName: entry.setName,
    number: entry.number,
    rarity: entry.rarity,
    isGraded: entry.isGraded,
    gradeCompany: entry.gradeCompany,
    gradeScore: typeof entry.gradeScore === 'number' ? String(entry.gradeScore) : entry.gradeScore,
    purchasePrice: entry.purchasePrice,
    purchaseDate: entry.purchaseDate,
    currentValue: entry.currentValue,
    notes: entry.notes,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  } as UserCardView;
}

export default function Portfolio() {
  const [cards, setCards] = useState<UserCardView[]>([]);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCard, setEditingCard] = useState<UserCardView | null>(null);
  const [deletingCard, setDeletingCard] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ➕ Nouveau : entrée sélectionnée pour détails
  const [detailsEntry, setDetailsEntry] = useState<PortfolioCard | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cardsData, statsData] = await Promise.all([
        portfolioService.getCards(), // ApiCard[]
        portfolioService.getStats(), // ApiStats
      ]);

      const cardsNormalized = (cardsData as ApiCard[] | undefined)?.map(normalizeCard) ?? [];
      setCards(cardsNormalized);

      setStats(statsData ? normalizeStats(statsData as ApiStats) : null);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erreur de chargement:', error);
      setToast({ message: 'Erreur de chargement des données', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleAddSuccess = () => {
    setShowAddModal(false);
    void loadData();
    setToast({ message: 'Carte ajoutée avec succès', type: 'success' });
  };

  const handleEditSuccess = () => {
    setEditingCard(null);
    void loadData();
    setToast({ message: 'Carte modifiée avec succès', type: 'success' });
  };

  const handleDeleteCard = async () => {
    if (!deletingCard) return;
    setDeleting(true);
    try {
      await portfolioService.deleteCard(deletingCard.id);
      await loadData();
      setDeletingCard(null);
      setToast({ message: 'Carte supprimée avec succès', type: 'success' });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erreur de suppression:', error);
      setToast({ message: 'Erreur lors de la suppression de la carte', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const resolveId = (card: UserCardView): string =>
    card._id ?? card.id ?? `${card.cardId}-${card.number ?? ''}`;

  const resolveImage = (card: UserCardView): string => {
    let img = card.imageUrl || card.image || card.images?.small;

    if (img && img.includes('assets.tcgdex.net') && !img.match(/\.(webp|png|jpg|jpeg)$/i)) {
      img = `${img}/high.webp`;
    }

    return img || PLACEHOLDER_IMG;
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader />
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Mon Portfolio</h1>
        </div>
        <Button onClick={() => setShowAddModal(true)}>+ Ajouter une carte</Button>
      </header>

      {stats && (
        <section className={styles.stats} aria-label="Statistiques du portfolio">
          <div className={styles.statCard}>
            <h3>Cartes totales</h3>
            <p className={styles.statValue}>{stats.totalCards ?? 0}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Cartes uniques</h3>
            <p className={styles.statValue}>{stats.uniqueCards ?? 0}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Valeur totale</h3>
            <p className={styles.statValue}>{euro(stats.totalCost)}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Cartes gradées</h3>
            <p className={styles.statValue}>{stats.gradedCards ?? 0}</p>
          </div>
        </section>
      )}

      {cards.length === 0 ? (
        <div className={styles.empty}>
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <h2>Aucune carte dans votre portfolio</h2>
          <p>Commencez par ajouter des cartes à votre collection</p>
          <Button onClick={() => setShowAddModal(true)}>+ Ajouter votre première carte</Button>
        </div>
      ) : (
        <section className={styles.grid} aria-label="Mes cartes">
          {cards.map((card) => {
            const docId = resolveId(card);
            const img = resolveImage(card);

            // Entry complète pour le modal (PortfolioCard shape)
            const entryLike = {
              _id: (card._id ?? card.id ?? '') as string,
              ownerId: card.ownerId ?? card.userId ?? '',
              cardId: card.cardId,
              language: card.language ?? 'fr',
              name: card.name,
              setId: card.setId,
              setName: card.setName,
              number: card.number,
              rarity: card.rarity,
              imageUrl: card.imageUrl ?? card.image,
              imageUrlHiRes: card.images?.large,
              types: card.types,
              supertype: card.supertype,
              subtypes: card.subtypes,
              quantity: card.quantity ?? 1,
              isGraded: Boolean(card.isGraded),
              gradeCompany: card.gradeCompany,
              gradeScore: card.gradeScore ? Number(card.gradeScore) : undefined,
              purchasePrice: card.purchasePrice,
              purchaseDate: card.purchaseDate
                ? typeof card.purchaseDate === 'string'
                  ? new Date(card.purchaseDate)
                  : card.purchaseDate
                : undefined,
              currentValue: card.currentValue,
              notes: card.notes,
              createdAt: card.createdAt ?? new Date().toISOString(),
              updatedAt: card.updatedAt ?? new Date().toISOString(),
            };

            return (
              <article key={docId} className={styles.card}>
                {/* ✅ bouton accessible pour ouvrir les détails */}
                <button
                  type="button"
                  className={styles.cardImageWrap}
                  onClick={() => setDetailsEntry(entryLike as PortfolioCard)}
                  aria-label={`Voir les détails de ${card.name}`}
                  title={`Voir les détails de ${card.name}`}
                >
                  <img
                    src={img}
                    alt={card.name}
                    className={styles.cardImage}
                    loading="lazy"
                    width={245}
                    height={342}
                    onError={(e) => {
                      const t = e.currentTarget as HTMLImageElement;
                      t.src = 'https://images.pokemontcg.io/swsh1/back.png';
                    }}
                  />
                  {card.quantity > 1 && <span className={styles.quantity}>×{card.quantity}</span>}
                  {card.isGraded && (
                    <span className={styles.gradeBadge}>
                      {card.gradeCompany} {card.gradeScore}
                    </span>
                  )}
                </button>

                <div className={styles.cardInfo}>
                  <h3 className={styles.cardName}>{card.name}</h3>
                  <p className={styles.cardSet}>
                    {card.setName || 'Set inconnu'} · #{card.number ?? '—'}
                    {card.setCardCount && `/${card.setCardCount}`}
                  </p>
                  {card.rarity && <p className={styles.cardRarity}>{card.rarity}</p>}
                  {(() => {
                    // Si la carte a des variantes, calculer le prix total
                    const hasVariants =
                      card.variants && Array.isArray(card.variants) && card.variants.length > 0;

                    if (hasVariants && card.variants) {
                      const total = card.variants.reduce(
                        (sum: number, v: PortfolioVariant) => sum + (v.purchasePrice ?? 0),
                        0
                      );
                      if (total > 0) {
                        return <p className={styles.cardValue}>Total : {euro(total)}</p>;
                      }
                    } else if (typeof card.purchasePrice === 'number') {
                      // Mode simple
                      const total = card.purchasePrice * (card.quantity ?? 1);
                      return (
                        <p className={styles.cardValue}>
                          {card.quantity > 1 ? `Total : ${euro(total)}` : euro(card.purchasePrice)}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className={styles.cardActions}>
                  <IconButton
                    icon="edit"
                    label={`Modifier ${card.name}`}
                    onClick={() => setEditingCard(card)}
                  />
                  <IconButton
                    icon="delete"
                    label={`Supprimer ${card.name}`}
                    onClick={() => setDeletingCard({ id: docId, name: card.name })}
                  />
                </div>
              </article>
            );
          })}
        </section>
      )}

      {showAddModal && (
        <AddCardModal onClose={() => setShowAddModal(false)} onSuccess={handleAddSuccess} />
      )}

      {editingCard && (
        <EditCardModal
          card={editingCard as UserCard}
          onClose={() => setEditingCard(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deletingCard && (
        <DeleteConfirmModal
          title="Supprimer la carte"
          message={`Êtes-vous sûr de vouloir supprimer "${deletingCard.name}" de votre portfolio ? Cette action est irréversible.`}
          onConfirm={handleDeleteCard}
          onCancel={() => setDeletingCard(null)}
          loading={deleting}
        />
      )}

      {/* 🔍 Modal de détails du portfolio */}
      {detailsEntry && (
        <PortfolioCardDetailsModal
          entry={detailsEntry}
          onClose={() => setDetailsEntry(null)}
          onEdit={(entry) => {
            setDetailsEntry(null);
            setEditingCard(toUserCardView(entry));
          }}
          onDelete={(entry) => {
            setDetailsEntry(null);
            setDeletingCard({ id: entry._id || '', name: entry.name || 'Carte sans nom' });
          }}
        />
      )}

      {/* ✅ Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
          <Toast
            message={toast.message}
            type={toast.type}
            duration={3500}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </main>
  );
}
