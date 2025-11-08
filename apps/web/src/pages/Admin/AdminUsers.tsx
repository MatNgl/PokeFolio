import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminService, type UserWithStats } from '../../services/admin.service';
import { FullScreenLoader } from '../../components/ui/FullScreenLoader';
import { Button } from '../../components/ui/Button';
import styles from './AdminUsers.module.css';

export default function AdminUsers() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'PokéFolio - Admin Users';
  }, []);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return user.email.toLowerCase().includes(query) || user.pseudo.toLowerCase().includes(query);
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
              <th>Email</th>
              <th>Pseudo</th>
              <th>Rôle</th>
              <th>Cartes</th>
              <th>Valeur</th>
              <th>Inscription</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
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

        {filteredUsers.length === 0 && (
          <div className={styles.empty}>
            <p>Aucun utilisateur trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}
