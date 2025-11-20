import { useMemo, useLayoutEffect, useRef, useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import styles from './Header.module.css';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import logo from '../../assets/logo-pokefolio.png';

type Tab = 'portfolio' | 'dashboard' | 'decouvrir' | 'admin' | null;

export function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
        : pathname.startsWith('/admin')
          ? 'admin'
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
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                role="tab"
                aria-selected={activeTab === 'admin'}
                aria-current={activeTab === 'admin' ? 'page' : undefined}
                className={styles.tab}
              >
                Admin
              </Link>
            )}
          </div>
        </nav>

        {/* Theme toggle + Profil à droite */}
        <div className={styles.right}>
          <label className={styles.themeSwitch}>
            <span className={styles.themeSwitchSun}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <g fill="currentColor">
                  <circle r="5" cy="12" cx="12"></circle>
                  <path d="m21 13h-1a1 1 0 0 1 0-2h1a1 1 0 0 1 0 2zm-17 0h-1a1 1 0 0 1 0-2h1a1 1 0 0 1 0 2zm13.66-5.66a1 1 0 0 1 -.66-.29 1 1 0 0 1 0-1.41l.71-.71a1 1 0 1 1 1.41 1.41l-.71.71a1 1 0 0 1 -.75.29zm-12.02 12.02a1 1 0 0 1 -.71-.29 1 1 0 0 1 0-1.41l.71-.66a1 1 0 0 1 1.41 1.41l-.71.71a1 1 0 0 1 -.7.24zm6.36-14.36a1 1 0 0 1 -1-1v-1a1 1 0 0 1 2 0v1a1 1 0 0 1 -1 1zm0 17a1 1 0 0 1 -1-1v-1a1 1 0 0 1 2 0v1a1 1 0 0 1 -1 1zm-5.66-14.66a1 1 0 0 1 -.7-.29l-.71-.71a1 1 0 0 1 1.41-1.41l.71.71a1 1 0 0 1 0 1.41 1 1 0 0 1 -.71.29zm12.02 12.02a1 1 0 0 1 -.7-.29l-.66-.71a1 1 0 0 1 1.36-1.36l.71.71a1 1 0 0 1 0 1.41 1 1 0 0 1 -.71.24z"></path>
                </g>
              </svg>
            </span>
            <span className={styles.themeSwitchMoon}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
                <path d="m223.5 32c-123.5 0-223.5 100.3-223.5 224s100 224 223.5 224c60.6 0 115.5-24.2 155.8-63.4 5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6-96.9 0-175.5-78.8-175.5-176 0-65.8 36-123.1 89.3-153.3 6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z"></path>
              </svg>
            </span>
            <input
              type="checkbox"
              className={styles.themeSwitchInput}
              checked={theme === 'dark'}
              onChange={toggleTheme}
              aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
            />
            <span className={styles.themeSwitchSlider}></span>
          </label>
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
          {user?.role === 'admin' && (
            <li>
              <Link
                to="/admin"
                className={styles.mobileLink}
                aria-current={activeTab === 'admin' ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
              >
                Admin
              </Link>
            </li>
          )}
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
