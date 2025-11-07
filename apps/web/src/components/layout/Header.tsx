import { useMemo, useLayoutEffect, useRef, useState, useEffect, useCallback } from 'react';
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

  // Ferme le menu si la route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Ferme au clavier (Esc)
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
        {/* Burger (mobile seulement) */}
        <button
          type="button"
          className={styles.burger}
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span aria-hidden="true" className={styles.burgerBar} />
          <span aria-hidden="true" className={styles.burgerBar} />
          <span aria-hidden="true" className={styles.burgerBar} />
        </button>

        {/* Logo au centre */}
        <Link to="/" className={styles.brand} aria-label="Accueil PokéFolio">
          <img src={logo} alt="PokéFolio" width="36" height="36" className={styles.logo} />
        </Link>

        {/* Profil à droite */}
        <div className={styles.right}>
          <button
            className={styles.profile}
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

      {/* Overlay + menu mobile */}
      <button
        type="button"
        className={`${styles.overlay} ${menuOpen ? styles.overlayOpen : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
        aria-label="Fermer le menu mobile"
      />
      <nav
        id="mobile-menu"
        className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ''}`}
        aria-label="Navigation mobile"
      >
        <ul>
          <li>
            <button
              className={styles.mobileLink}
              onClick={() => navigate('/portfolio')}
              aria-current={activeTab === 'portfolio' ? 'page' : undefined}
            >
              Portfolio
            </button>
          </li>
          <li>
            <button
              className={styles.mobileLink}
              onClick={() => navigate('/dashboard')}
              aria-current={activeTab === 'dashboard' ? 'page' : undefined}
            >
              Dashboard
            </button>
          </li>
          <li>
            <button
              className={styles.mobileLink}
              onClick={() => navigate('/decouvrir')}
              aria-current={activeTab === 'decouvrir' ? 'page' : undefined}
            >
              Découvrir
            </button>
          </li>
          <li className={styles.mobileDivider} />
          <li>
            <button className={styles.mobileLinkSecondary} onClick={() => navigate('/profile')}>
              Mon profil
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
