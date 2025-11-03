import { Link } from 'react-router-dom';

import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import styles from './Home.module.css';

export function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <h1 className={styles.title}>PokéFolio</h1>
        <p className={styles.subtitle}>Gérez votre collection de cartes Pokémon comme un pro</p>

        <div className={styles.actions}>
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button size="lg">Accéder au Portfolio</Button>
            </Link>
          ) : (
            <>
              <Link to="/register">
                <Button size="lg">Commencer gratuitement</Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" size="lg">
                  Se connecter
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className={styles.features}>
          <div className={styles.feature}>
            <div className={styles.icon}>🔍</div>
            <h3>Recherche TCGdex</h3>
            <p>Accédez à toutes les cartes Pokémon en FR/EN</p>
          </div>
          <div className={styles.feature}>
            <div className={styles.icon}>📊</div>
            <h3>Statistiques</h3>
            <p>Suivez la valeur et l&apos;évolution de votre collection</p>
          </div>
          <div className={styles.feature}>
            <div className={styles.icon}>💎</div>
            <h3>Grading</h3>
            <p>Gérez vos cartes gradées PSA, BGS, CGC...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
