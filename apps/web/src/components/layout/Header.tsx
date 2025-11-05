import { useMemo, useLayoutEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from './Header.module.css';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/logo-pokefolio.png';
type Tab = 'portfolio' | 'dashboard' | 'decouvrir' | null;

export function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const headerRef = useRef<HTMLElement | null>(null);

  // Mesure dynamique pour l'offset sous header fixe
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const setVar = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--header-h', `${h}px`);
    };
    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    window.addEventListener('resize', setVar);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', setVar);
      document.documentElement.style.removeProperty('--header-h');
    };
  }, []);

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
    <>
      <header ref={headerRef} className={styles.header} role="banner">
        <Link to="/" className={styles.brand} aria-label="Accueil PokéFolio">
          <img src={logo} alt="PokéFolio" width="36" height="36" className={styles.logo} />
        </Link>

        <nav className={styles.radioWrap} aria-label="Sections">
          <div className={styles.glassGroup}>
            <input
              id="tab-portfolio"
              type="radio"
              name="glass-tabs"
              checked={activeTab === 'portfolio'}
              onChange={() => navigate('/portfolio')}
              aria-controls="section-portfolio"
            />
            <label htmlFor="tab-portfolio">Portfolio</label>

            <input
              id="tab-dashboard"
              type="radio"
              name="glass-tabs"
              checked={activeTab === 'dashboard'}
              onChange={() => navigate('/dashboard')}
              aria-controls="section-dashboard"
            />
            <label htmlFor="tab-dashboard">Dashboard</label>

            <input
              id="tab-decouvrir"
              type="radio"
              name="glass-tabs"
              checked={activeTab === 'decouvrir'}
              onChange={() => navigate('/decouvrir')}
              aria-controls="section-decouvrir"
            />
            <label htmlFor="tab-decouvrir">Découvrir</label>

            <span className={styles.glider} data-active={activeTab ?? 'none'} aria-hidden="true" />
          </div>
        </nav>

        <div className={styles.right}>
          <button
            className={styles.profile}
            title={user?.email ?? 'Profil'}
            onClick={() => navigate('/profile')}
            aria-label="Accéder au profil"
          >
            <div className={styles.avatar} aria-hidden="true">
              {userInitials}
            </div>
          </button>
        </div>
      </header>

      {/* Espace sous header fixe */}
      <div className={styles.headerOffset} aria-hidden="true" />
    </>
  );
}
