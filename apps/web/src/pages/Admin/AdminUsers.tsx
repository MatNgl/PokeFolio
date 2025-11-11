import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminService, type UserWithStats } from '../../services/admin.service';
import { FullScreenLoader } from '../../components/ui/FullScreenLoader';
import { Button } from '../../components/ui/Button';
import { ChevronUp, ChevronDown } from 'lucide-react';
import styles from './AdminUsers.module.css';

export default function AdminUsers() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'PokéFolio - Admin Users';
  }, []);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof UserWithStats | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Supprimer l'utilisateur ${email} et toute sa collection ?`)) {
      return;
    }

    try {
      await adminService.deleteUser(userId);
      setUsers(users.filter((u) => u._id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleSort = (field: keyof UserWithStats) => {
    if (sortField === field) {
      // Toggle direction si même colonne
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nouvelle colonne, commencer par ascendant
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return user.email.toLowerCase().includes(query) || user.pseudo.toLowerCase().includes(query);
  });

  // Appliquer le tri
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortField) return 0;

    const aValue = a[sortField];
    const bValue = b[sortField];

    // Gérer les valeurs nulles/undefined
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    let comparison = 0;

    // Tri numérique
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    }
    // Tri alphabétique ou par date (les dates sont des strings dans UserWithStats)
    else if (typeof aValue === 'string' && typeof bValue === 'string') {
      // Si le champ est createdAt ou updatedAt, comparer comme des dates
      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        const dateA = new Date(aValue).getTime();
        const dateB = new Date(bValue).getTime();
        comparison = dateA - dateB;
      } else {
        // Sinon, tri alphabétique
        comparison = aValue.localeCompare(bValue);
      }
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  if (loading) {
    return <FullScreenLoader message="Chargement des utilisateurs..." />;
  }

  return (
    <div className={styles.page}>
      <Button onClick={() => navigate('/admin')} variant="secondary" className={styles.backBtn}>
        ← Retour au dashboard
      </Button>

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestion des utilisateurs</h1>
          <p className={styles.subtitle}>{users.length} utilisateurs au total</p>
        </div>
      </header>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Rechercher par email ou pseudo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => handleSort('email')} className={styles.sortableHeader}>
                Email
                <div className={styles.sortIcons}>
                  <ChevronUp
                    size={14}
                    className={
                      sortField === 'email' && sortDirection === 'asc'
                        ? styles.activeIcon
                        : styles.inactiveIcon
                    }
                  />
                  <ChevronDown
                    size={14}
                    className={
                      sortField === 'email' && sortDirection === 'desc'
                        ? styles.activeIcon
                        : styles.inactiveIcon
                    }
                  />
                </div>
              </th>
              <th onClick={() => handleSort('pseudo')} className={styles.sortableHeader}>
                Pseudo
                <div className={styles.sortIcons}>
                  <ChevronUp
                    size={14}
                    className={
                      sortField === 'pseudo' && sortDirection === 'asc'
                        ? styles.activeIcon
                        : styles.inactiveIcon
                    }
                  />
                  <ChevronDown
                    size={14}
                    className={
                      sortField === 'pseudo' && sortDirection === 'desc'
                        ? styles.activeIcon
                        : styles.inactiveIcon
                    }
                  />
                </div>
              </th>
              <th onClick={() => handleSort('role')} className={styles.sortableHeader}>
                Rôle
                <div className={styles.sortIcons}>
                  <ChevronUp
                    size={14}
                    className={
                      sortField === 'role' && sortDirection === 'asc'
                        ? styles.activeIcon
                        : styles.inactiveIcon
                    }
                  />
                  <ChevronDown
                    size={14}
                    className={
                      sortField === 'role' && sortDirection === 'desc'
                        ? styles.activeIcon
                        : styles.inactiveIcon
                    }
                  />
                </div>
              </th>
              <th onClick={() => handleSort('cardsCount')} className={styles.sortableHeader}>
                Cartes
                <div className={styles.sortIcons}>
                  <ChevronUp
                    size={14}
                    className={
                      sortField === 'cardsCount' && sortDirection === 'asc'
                        ? styles.activeIcon
                        : styles.inactiveIcon
                    }
                  />
                  <ChevronDown
                    size={14}
                    className={
                      sortField === 'cardsCount' && sortDirection === 'desc'
                        ? styles.activeIcon
                        : styles.inactiveIcon
                    }
                  />
                </div>
              </th>
              <th onClick={() => handleSort('totalValue')} className={styles.sortableHeader}>
                Valeur
                <div className={styles.sortIcons}>
                  <ChevronUp
                    size={14}
                    className={
                      sortField === 'totalValue' && sortDirection === 'asc'
                        ? styles.activeIcon
                        : styles.inactiveIcon
                    }
                  />
                  <ChevronDown
                    size={14}
                    className={
                      sortField === 'totalValue' && sortDirection === 'desc'
                        ? styles.activeIcon
                        : styles.inactiveIcon
                    }
                  />
                </div>
              </th>
              <th onClick={() => handleSort('createdAt')} className={styles.sortableHeader}>
                Inscription
                <div className={styles.sortIcons}>
                  <ChevronUp
                    size={14}
                    className={
                      sortField === 'createdAt' && sortDirection === 'asc'
                        ? styles.activeIcon
                        : styles.inactiveIcon
                    }
                  />
                  <ChevronDown
                    size={14}
                    className={
                      sortField === 'createdAt' && sortDirection === 'desc'
                        ? styles.activeIcon
                        : styles.inactiveIcon
                    }
                  />
                </div>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((user) => (
              <tr key={user._id}>
                <td>{user.email}</td>
                <td>{user.pseudo}</td>
                <td>
                  <span className={user.role === 'admin' ? styles.roleAdmin : styles.roleUser}>
                    {user.role}
                  </span>
                </td>
                <td>{user.cardsCount}</td>
                <td>{user.totalValue.toFixed(2)} €</td>
                <td>{new Date(user.createdAt).toLocaleDateString('fr-FR')}</td>
                <td>
                  <div className={styles.actions}>
                    <Link to={`/admin/users/${user._id}`}>
                      <Button size="sm" variant="secondary">
                        Voir
                      </Button>
                    </Link>
                    {user.role !== 'admin' && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(user._id, user.email)}
                      >
                        Supprimer
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedUsers.length === 0 && (
          <div className={styles.empty}>
            <p>Aucun utilisateur trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}
