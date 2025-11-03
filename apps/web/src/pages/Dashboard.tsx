import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import styles from './Dashboard.module.css';

export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <h2 className={styles.logo}>PokéFolio</h2>
        <Button variant="ghost" onClick={handleLogout}>
          Se déconnecter
        </Button>
      </nav>

      <div className={styles.content}>
        <Card>
          <h1 className={styles.welcome}>
            Bienvenue, <span className={styles.email}>{user?.email}</span>
          </h1>
          <p className={styles.info}>Votre portfolio est prêt à être rempli !</p>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statValue}>0</div>
              <div className={styles.statLabel}>Cartes</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>0</div>
              <div className={styles.statLabel}>Distinctes</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>0€</div>
              <div className={styles.statLabel}>Valeur</div>
            </div>
          </div>

          <p className={styles.comingSoon}>🚧 Le module Portfolio arrive bientôt (Phase 3) !</p>
        </Card>
      </div>
    </div>
  );
}
