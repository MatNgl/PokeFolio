// apps/web/src/components/layout/Header.tsx
import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from './Header.module.css';
import { useAuth } from '../../contexts/AuthContext';
import type { Card } from '@pokefolio/types'; // ✅ typage strict des résultats

export function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();

  const userInitials = useMemo(() => {
    const email = user?.email ?? 'Profil';
    const base = (email.split('@')[0] ?? email).trim();
    return base.slice(0, 2).toUpperCase();
  }, [user]);

  const activeTab: 'portfolio' | 'stats' | null = pathname.startsWith('/portfolio')
    ? 'portfolio'
    : pathname.startsWith('/stats')
      ? 'stats'
      : null;

  // search bar avec dropdown de résultats
  const [q, setQ] = useState('');
  const [searchResults, setSearchResults] = useState<Card[]>([]); // ✅ plus de any
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);

  const handleSearchChange = async (value: string): Promise<void> => {
    setQ(value);

    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setSearching(true);
    try {
      const { cardsService } = await import('../../services/cards.service');
      const result = await cardsService.searchCards({ q: value, limit: 10 });
      setSearchResults(result.cards as Card[]);
      setShowDropdown(result.cards.length > 0);
    } catch (error) {
      // on évite console.* pour respecter no-console
      // Option: brancher un logger applicatif si besoin
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCard = (card: Card): void => {
    setQ('');
    setSearchResults([]);
    setShowDropdown(false);
    navigate(`/portfolio?cardId=${card.id}`);
  };

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    setShowDropdown(false);
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <header className={styles.header} role="banner">
      <Link to="/" className={styles.brand} aria-label="Accueil Pokéfolio">
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
        Pokéfolio
      </Link>

      {/* Glass Radio Group: Portfolio / Statistiques - CENTRÉ */}
      <div className={styles.radioWrap} role="navigation" aria-label="Sections">
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

          {/* Statistiques */}
          <input
            id="tab-stats"
            type="radio"
            name="glass-tabs"
            checked={activeTab === 'stats'}
            onChange={() => navigate('/stats')}
            aria-controls="section-stats"
          />
          <label htmlFor="tab-stats">Statistiques</label>

          {/* Glider */}
          <span className={styles.glider} data-active={activeTab ?? 'none'} aria-hidden="true" />
        </div>
      </div>

      <div className={styles.right}>
        {/* Barre de recherche avec dropdown */}
        <div className={styles.searchContainer}>
          <form
            className={styles.searchWrap}
            role="search"
            aria-label="Rechercher des cartes"
            onSubmit={onSearchSubmit}
          >
            <svg
              className={styles.searchIcon}
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79L20 21.49 21.49 20 15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
              />
            </svg>

            <input
              className={styles.input}
              type="search"
              placeholder="Rechercher une carte…"
              value={q}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              aria-label="Terme de recherche"
            />

            <button type="submit" className={styles.searchBtn} aria-label="Lancer la recherche">
              Rechercher
            </button>
          </form>

          {/* Dropdown des résultats */}
          {showDropdown && searchResults.length > 0 && (
            <div className={styles.dropdown}>
              {searching && <div className={styles.dropdownLoading}>Recherche...</div>}
              {searchResults.map((card) => {
                const imageUrl =
                  card.image || `https://api.tcgdex.net/v2/fr/cards/${card.id}/image`;
                const setId = card.id?.split('-')[0] || '';
                const setName = card.set?.name || setId.toUpperCase() || 'Set';

                return (
                  <button
                    key={card.id}
                    type="button"
                    className={styles.dropdownItem}
                    onClick={() => handleSelectCard(card)}
                  >
                    <img
                      src={imageUrl}
                      alt={card.name}
                      className={styles.dropdownImage}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.src.includes('placeholder')) {
                          target.src = 'https://via.placeholder.com/50x70/1a1d29/7cf3ff?text=?';
                        }
                      }}
                    />
                    <div className={styles.dropdownInfo}>
                      <div className={styles.dropdownName}>{card.name}</div>
                      <div className={styles.dropdownSet}>
                        {setName} · #{card.localId}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Profil */}
        <div className={styles.profile} title={user?.email ?? 'Profil'}>
          <div className={styles.avatar} aria-hidden="true">
            {userInitials}
          </div>
        </div>
      </div>
    </header>
  );
}
