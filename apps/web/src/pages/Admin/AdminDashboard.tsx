import { useEffect, useState } from 'react';
import {
  adminService,
  type GlobalStats,
  type TopCard,
  type TopUser,
  type SetDistribution,
} from '../../services/admin.service';
import { FullScreenLoader } from '../../components/ui/FullScreenLoader';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
  useEffect(() => {
    document.title = 'PokéFolio - Admin Dashboard';
  }, []);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [topCards, setTopCards] = useState<TopCard[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [setDistribution, setSetDistribution] = useState<SetDistribution[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [statsData, cardsData, usersData, setsData] = await Promise.all([
          adminService.getGlobalStats(),
          adminService.getTopCards(10),
          adminService.getTopUsers(10),
          adminService.getSetDistribution(10),
        ]);

        setStats(statsData);
        setTopCards(cardsData);
        setTopUsers(usersData);
        setSetDistribution(setsData);
      } catch (error) {
        console.error('Error loading admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  if (loading) {
    return <FullScreenLoader message="Chargement des statistiques..." />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin Dashboard</h1>
        <p className={styles.subtitle}>Vue d&apos;ensemble de la plateforme</p>
      </header>

      {/* Stats globales */}
      {stats && (
        <section className={styles.globalStats}>
          <div className={styles.statCard}>
            <h3>Total utilisateurs</h3>
            <p className={styles.bigNumber}>{stats.totalUsers}</p>
            <span className={styles.detail}>+{stats.newUsersThisWeek} cette semaine</span>
          </div>

          <div className={styles.statCard}>
            <h3>Total cartes</h3>
            <p className={styles.bigNumber}>{stats.totalCards.toLocaleString()}</p>
            <span className={styles.detail}>+{stats.newCardsThisWeek} cette semaine</span>
          </div>

          <div className={styles.statCard}>
            <h3>Valeur totale</h3>
            <p className={styles.bigNumber}>{stats.totalValue.toFixed(2)} €</p>
            <span className={styles.detail}>toutes collections</span>
          </div>
        </section>
      )}

      {/* Top cartes */}
      <section className={styles.section}>
        <h2>Top 10 - Cartes les plus possédées</h2>
        <div className={styles.topCards}>
          {topCards.map((card, index) => (
            <div key={card.cardId} className={styles.topCardItem}>
              <span className={styles.rank}>#{index + 1}</span>
              {card.imageUrl && (
                <img src={card.imageUrl} alt={card.name} className={styles.cardImage} />
              )}
              <div className={styles.cardInfo}>
                <p className={styles.cardName}>{card.name}</p>
                <p className={styles.cardSet}>{card.setName}</p>
                <p className={styles.cardStats}>
                  {card.totalQuantity} exemplaires • {card.ownersCount} possesseurs
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Top users */}
      <section className={styles.section}>
        <h2>Top 10 - Collections les plus chères</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Pseudo</th>
              <th>Email</th>
              <th>Cartes</th>
              <th>Valeur totale</th>
            </tr>
          </thead>
          <tbody>
            {topUsers.map((user, index) => (
              <tr key={user.userId}>
                <td>{index + 1}</td>
                <td>{user.pseudo}</td>
                <td>{user.email}</td>
                <td>{user.cardsCount}</td>
                <td>{user.totalValue.toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Distribution par sets */}
      <section className={styles.section}>
        <h2>Top 10 - Sets les plus collectionnés</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Set</th>
              <th>Cartes totales</th>
              <th>Cartes uniques</th>
            </tr>
          </thead>
          <tbody>
            {setDistribution.map((set, index) => (
              <tr key={set.setName}>
                <td>{index + 1}</td>
                <td>{set.setName}</td>
                <td>{set.cardsCount}</td>
                <td>{set.uniqueCards}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
