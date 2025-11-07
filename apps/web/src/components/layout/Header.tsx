import { useMemo, useLayoutEffect, useRef, useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import styles from './Header.module.css';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/logo-pokefolio.png';

type Tab = 'portfolio' | 'dashboard' | 'decouvrir' | null;

export function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const headerRef = useRef<HTMLElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Verrouille le scroll quand le menu mobile est ouvert
  useEffect(() => {
    const { body } = document;
    const prev = body.style.overflow;
    if (menuOpen) body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prev;
    };
  }, [menuOpen]);

  // Ferme si route change + Esc
  useEffect(() => setMenuOpen(false), [pathname]);
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setMenuOpen(false);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen, onKeyDown]);

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
        {/* Burger (mobile) */}
        <button
          type="button"
          className={styles.burger}
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Menu aria-hidden="true" size={20} />
        </button>

        {/* Logo */}
        <Link to="/" className={styles.brand} aria-label="Accueil PokéFolio">
          <img src={logo} alt="PokéFolio" width="36" height="36" className={styles.logo} />
        </Link>

        {/* NAV DESKTOP (onglets glass) */}
        <nav className={styles.radioWrap} aria-label="Sections">
          <div className={styles.glassGroup} role="tablist" aria-label="Onglets principaux">
            <span className={styles.glider} data-active={activeTab ?? 'none'} aria-hidden="true" />
            <Link
              to="/portfolio"
              role="tab"
              aria-selected={activeTab === 'portfolio'}
              aria-current={activeTab === 'portfolio' ? 'page' : undefined}
              className={styles.tab}
            >
              Portfolio
            </Link>
            <Link
              to="/dashboard"
              role="tab"
              aria-selected={activeTab === 'dashboard'}
              aria-current={activeTab === 'dashboard' ? 'page' : undefined}
              className={styles.tab}
            >
              Dashboard
            </Link>
            <Link
              to="/decouvrir"
              role="tab"
              aria-selected={activeTab === 'decouvrir'}
              aria-current={activeTab === 'decouvrir' ? 'page' : undefined}
              className={styles.tab}
            >
              Découvrir
            </Link>
          </div>
        </nav>

        {/* Profil à droite */}
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

      {/* Overlay + Drawer gauche (mobile) */}
      <button
        type="button"
        className={`${styles.overlay} ${menuOpen ? styles.overlayOpen : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
        aria-label="Fermer le menu mobile"
      />
      <nav
        id="mobile-menu"
        className={`${styles.mobileMenuLeft} ${menuOpen ? styles.mobileMenuOpen : ''}`}
        aria-label="Navigation mobile"
      >
        <ul>
          <li>
            <Link
              to="/portfolio"
              className={styles.mobileLink}
              aria-current={activeTab === 'portfolio' ? 'page' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              Portfolio
            </Link>
          </li>
          <li>
            <Link
              to="/dashboard"
              className={styles.mobileLink}
              aria-current={activeTab === 'dashboard' ? 'page' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              to="/decouvrir"
              className={styles.mobileLink}
              aria-current={activeTab === 'decouvrir' ? 'page' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              Découvrir
            </Link>
          </li>
          <li className={styles.mobileDivider} />
          <li>
            <Link
              to="/profile"
              className={styles.mobileLinkSecondary}
              onClick={() => setMenuOpen(false)}
            >
              Mon profil
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
}
