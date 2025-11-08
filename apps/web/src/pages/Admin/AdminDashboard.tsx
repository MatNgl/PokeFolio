import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  adminService,
  type GlobalStats,
  type TopCard,
  type TopUser,
  type SetDistribution,
  type BackfillResult,
} from '../../services/admin.service';
import { FullScreenLoader } from '../../components/ui/FullScreenLoader';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'PokéFolio - Admin Dashboard';
  }, []);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [topCards, setTopCards] = useState<TopCard[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [setDistribution, setSetDistribution] = useState<SetDistribution[]>([]);
  const [backfilling, setBackfilling] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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

  const handleBackfillMetadata = async () => {
    if (
      !confirm(
        'Voulez-vous vraiment lancer la récupération des métadonnées manquantes des cartes ? Cette opération peut prendre plusieurs minutes.'
      )
    ) {
      return;
    }

    try {
      setBackfilling(true);
      const result: BackfillResult = await adminService.backfillCardMetadata();

      setToast({
        message: `Backfill terminé : ${result.updated} cartes mises à jour, ${result.failed} échecs`,
        type: result.failed > 0 ? 'error' : 'success',
      });

      // Recharger les données après le backfill
      const [statsData, cardsData] = await Promise.all([
        adminService.getGlobalStats(),
        adminService.getTopCards(10),
      ]);
      setStats(statsData);
      setTopCards(cardsData);
    } catch (error) {
      console.error('Error during backfill:', error);
      setToast({
        message: 'Erreur lors de la récupération des métadonnées',
        type: 'error',
      });
    } finally {
      setBackfilling(false);
    }
  };

  if (loading) {
    return <FullScreenLoader message="Chargement des statistiques..." />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <p className={styles.subtitle}>Vue d&apos;ensemble de la plateforme</p>
        </div>
        <div className={styles.actions}>
          <Button onClick={() => navigate('/admin/users')} variant="primary">
            Gérer les utilisateurs
          </Button>
          <Button onClick={() => navigate('/admin/logs')} variant="secondary">
            Voir les logs
          </Button>
        </div>
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
        {topCards.length === 0 ? (
          <p className={styles.empty}>Aucune carte dans la base de données</p>
        ) : (
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
        )}
      </section>

      {/* Top users */}
      <section className={styles.section}>
        <h2>Top 10 - Collections les plus chères</h2>
        {topUsers.length === 0 ? (
          <p className={styles.empty}>Aucun utilisateur avec des cartes</p>
        ) : (
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
        )}
      </section>

      {/* Distribution par sets */}
      <section className={styles.section}>
        <h2>Top 10 - Sets les plus collectionnés</h2>
        {setDistribution.length === 0 ? (
          <p className={styles.empty}>Aucune carte collectionnée</p>
        ) : (
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
        )}
      </section>

      {/* Maintenance */}
      <section className={styles.section}>
        <h2>Maintenance</h2>
        <div className={styles.maintenance}>
          <div className={styles.maintenanceItem}>
            <div>
              <h3>Récupérer les métadonnées manquantes des cartes</h3>
              <p className={styles.maintenanceDesc}>
                Récupère les images et métadonnées manquantes pour toutes les cartes depuis
                l&apos;API TCGdex. Utile si des cartes ont été ajoutées sans images.
              </p>
            </div>
            <Button onClick={handleBackfillMetadata} loading={backfilling} variant="secondary">
              {backfilling ? 'En cours...' : 'Lancer'}
            </Button>
          </div>
        </div>
      </section>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
