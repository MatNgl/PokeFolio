import { useState, useEffect } from 'react';
import type { UserCard, PortfolioStats } from '@pokefolio/types';
import { portfolioService } from '../services/portfolio.service';
import { AddCardModal } from '../components/cards/AddCardModal';
import { Button } from '../components/ui/Button';
import { Loader } from '../components/ui/Loader';
import styles from './Portfolio.module.css';

export default function Portfolio() {
  const [cards, setCards] = useState<UserCard[]>([]);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadData = async () => {
    try {
      const [cardsData, statsData] = await Promise.all([
        portfolioService.getCards(),
        portfolioService.getStats(),
      ]);
      setCards(cardsData);
      setStats(statsData);
    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSuccess = () => {
    setShowAddModal(false);
    loadData();
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette carte ?')) return;

    try {
      await portfolioService.deleteCard(cardId);
      loadData();
    } catch (error) {
      console.error('Erreur de suppression:', error);
    }
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
          <p className={styles.subtitle}>Gérez votre collection de cartes Pokémon</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>+ Ajouter une carte</Button>
      </header>

      {stats && (
        <section className={styles.stats}>
          <div className={styles.statCard}>
            <h3>Cartes totales</h3>
            <p className={styles.statValue}>{stats.totalCards}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Cartes uniques</h3>
            <p className={styles.statValue}>{stats.uniqueCards}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Valeur totale</h3>
            <p className={styles.statValue}>{stats.totalValue.toFixed(2)} €</p>
          </div>
          <div className={styles.statCard}>
            <h3>Coût total</h3>
            <p className={styles.statValue}>{stats.totalCost.toFixed(2)} €</p>
          </div>
          <div className={styles.statCard}>
            <h3>Profit</h3>
            <p className={`${styles.statValue} ${stats.profit >= 0 ? styles.profit : styles.loss}`}>
              {stats.profit >= 0 ? '+' : ''}
              {stats.profit.toFixed(2)} €
            </p>
          </div>
          <div className={styles.statCard}>
            <h3>Cartes gradées</h3>
            <p className={styles.statValue}>{stats.gradedCards}</p>
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
        <section className={styles.grid}>
          {cards.map((card) => (
            <article key={card._id} className={styles.card}>
              <div className={styles.cardImageWrap}>
                <img
                  src={card.imageUrl || 'https://placehold.co/245x342'}
                  alt={card.name}
                  className={styles.cardImage}
                />
                {card.quantity > 1 && <span className={styles.quantity}>×{card.quantity}</span>}
                {card.isGraded && (
                  <span className={styles.gradeBadge}>
                    {card.gradeCompany} {card.gradeScore}
                  </span>
                )}
              </div>
              <div className={styles.cardInfo}>
                <h3 className={styles.cardName}>{card.name}</h3>
                <p className={styles.cardSet}>
                  {card.setName || 'Set inconnu'} · #{card.number}
                </p>
                {card.rarity && <p className={styles.cardRarity}>{card.rarity}</p>}
                {card.currentValue && (
                  <p className={styles.cardValue}>{card.currentValue.toFixed(2)} €</p>
                )}
              </div>
              <div className={styles.cardActions}>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDeleteCard(card._id)}
                  title="Supprimer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {showAddModal && (
        <AddCardModal onClose={() => setShowAddModal(false)} onSuccess={handleAddSuccess} />
      )}
    </main>
  );
}
