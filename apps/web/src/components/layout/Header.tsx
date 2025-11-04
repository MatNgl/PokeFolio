import React, { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from './Header.module.css';
import { useAuth } from '../../contexts/AuthContext';

type Tab = 'portfolio' | 'dashboard' | 'decouvrir' | null;

export function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();

  const userInitials = useMemo(() => {
    const email = user?.email ?? 'Profil';
    const base = (email.split('@')[0] ?? email).trim();
    return base.slice(0, 2).toUpperCase();
  }, [user]);

  const activeTab: Tab = pathname.startsWith('/portfolio')
    ? 'portfolio'
    : pathname.startsWith('/dashboard')
      ? 'dashboard'
      : pathname.startsWith('/decouvrir')
        ? 'decouvrir'
        : null;

  return (
    <header className={styles.header} role="banner">
      <Link to="/" className={styles.brand} aria-label="Accueil PokéFolio">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={styles.dot}
          aria-hidden="true"
        >
          <path d="M12 2C10.0222 2 8.08879 2.58649 6.4443 3.6853C4.79981 4.78412 3.51809 6.3459 2.76121 8.17317C2.00433 10.0004 1.8063 12.0111 2.19215 13.9509C2.578 15.8907 3.53041 17.6725 4.92894 19.0711C6.32746 20.4696 8.10929 21.422 10.0491 21.8079C11.9889 22.1937 13.9996 21.9957 15.8268 21.2388C17.6541 20.4819 19.2159 19.2002 20.3147 17.5557C21.4135 15.9112 22 13.9778 22 12C22 10.6868 21.7413 9.38642 21.2388 8.17317C20.7363 6.95991 19.9997 5.85752 19.0711 4.92893C18.1425 4.00035 17.0401 3.26375 15.8268 2.7612C14.6136 2.25866 13.3132 2 12 2Z" />
        </svg>
        PokéFolio
      </Link>

      {/* Glass Radio Group: Portfolio / Dashboard / Découvrir - CENTRÉ */}
      <nav className={styles.radioWrap} aria-label="Sections">
        <div className={styles.glassGroup}>
          {/* Portfolio */}
          <input
            id="tab-portfolio"
            type="radio"
            name="glass-tabs"
            checked={activeTab === 'portfolio'}
            onChange={() => navigate('/portfolio')}
            aria-controls="section-portfolio"
          />
          <label htmlFor="tab-portfolio">Portfolio</label>

          {/* Dashboard */}
          <input
            id="tab-dashboard"
            type="radio"
            name="glass-tabs"
            checked={activeTab === 'dashboard'}
            onChange={() => navigate('/dashboard')}
            aria-controls="section-dashboard"
          />
          <label htmlFor="tab-dashboard">Dashboard</label>

          {/* Découvrir */}
          <input
            id="tab-decouvrir"
            type="radio"
            name="glass-tabs"
            checked={activeTab === 'decouvrir'}
            onChange={() => navigate('/decouvrir')}
            aria-controls="section-decouvrir"
          />
          <label htmlFor="tab-decouvrir">Découvrir</label>

          {/* Glider */}
          <span className={styles.glider} data-active={activeTab ?? 'none'} aria-hidden="true" />
        </div>
      </nav>

      {/* Profil (pas de barre de recherche) */}
      <div className={styles.right}>
        <div className={styles.profile} title={user?.email ?? 'Profil'}>
          <div className={styles.avatar} aria-hidden="true">
            {userInitials}
          </div>
        </div>
      </div>
    </header>
  );
}
