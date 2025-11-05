import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Toast } from '../components/ui/Toast';
import { userService } from '../services/user.service';
import styles from './Profile.module.css';

export function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // États pour les formulaires
  const [pseudo, setPseudo] = useState(user?.pseudo || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // États pour les confirmations de suppression
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // États de chargement et toast
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChangePseudo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pseudo.trim().length < 2) {
      showToast('Le pseudo doit contenir au moins 2 caractères', 'error');
      return;
    }

    setLoading(true);
    try {
      await userService.updatePseudo({ pseudo });
      showToast('Pseudo mis à jour avec succès', 'success');
    } catch (error) {
      console.error('Error updating pseudo:', error);
      const errorMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
            'Erreur lors de la mise à jour du pseudo'
          : 'Erreur lors de la mise à jour du pseudo';
      showToast(`❌ ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showToast('Les mots de passe ne correspondent pas', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Le mot de passe doit contenir au moins 6 caractères', 'error');
      return;
    }

    setLoading(true);
    try {
      await userService.updatePassword({
        currentPassword,
        newPassword,
      });
      showToast('Mot de passe mis à jour avec succès', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      const errorMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
            'Erreur lors de la mise à jour du mot de passe'
          : 'Erreur lors de la mise à jour du mot de passe';
      showToast(`❌ ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleClearPortfolio = async () => {
    if (deleteConfirmText !== 'SUPPRIMER') {
      showToast('Veuillez taper "SUPPRIMER" pour confirmer', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await userService.clearPortfolio();
      showToast(`${result.deletedCount} carte(s) supprimée(s) avec succès`, 'success');
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    } catch (error) {
      console.error('Error clearing portfolio:', error);
      showToast('Erreur lors de la suppression du portfolio', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Mon Profil</h1>
        <p className={styles.email}>{user?.email}</p>
      </div>

      <div className={styles.sections}>
        {/* Section Pseudo */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Pseudo</h2>
          <form onSubmit={handleChangePseudo} className={styles.form}>
            <Input
              id="pseudo"
              type="text"
              label="Nouveau pseudo"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="Votre pseudo"
              required
            />
            <Button type="submit" disabled={loading}>
              Mettre à jour le pseudo
            </Button>
          </form>
        </section>

        {/* Section Mot de passe */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Mot de passe</h2>
          <form onSubmit={handleChangePassword} className={styles.form}>
            <Input
              id="currentPassword"
              type="password"
              label="Mot de passe actuel"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              showPasswordToggle
              required
            />
            <Input
              id="newPassword"
              type="password"
              label="Nouveau mot de passe"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              showPasswordToggle
              required
            />
            <Input
              id="confirmPassword"
              type="password"
              label="Confirmer le nouveau mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              showPasswordToggle
              required
            />
            <Button type="submit" disabled={loading}>
              Changer le mot de passe
            </Button>
          </form>
        </section>

        {/* Section Déconnexion */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Déconnexion</h2>
          <p className={styles.description}>Déconnectez-vous de votre compte PokéFolio</p>
          <Button onClick={handleLogout} variant="secondary">
            Se déconnecter
          </Button>
        </section>

        {/* Section Danger Zone */}
        <section className={`${styles.section} ${styles.dangerZone}`}>
          <h2 className={styles.sectionTitle}>Zone de danger</h2>
          <p className={styles.description}>
            Action irréversible : supprimer toutes les cartes de votre portfolio
          </p>

          {!showDeleteConfirm ? (
            <Button onClick={() => setShowDeleteConfirm(true)} variant="danger">
              Vider le portfolio
            </Button>
          ) : (
            <div className={styles.confirmBox}>
              <p className={styles.confirmText}>⚠️ Cette action est irréversible !</p>
              <p className={styles.confirmText}>
                Tapez <strong>SUPPRIMER</strong> pour confirmer
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className={styles.input}
                placeholder="SUPPRIMER"
              />
              <div className={styles.confirmButtons}>
                <Button
                  onClick={handleClearPortfolio}
                  variant="danger"
                  disabled={loading || deleteConfirmText !== 'SUPPRIMER'}
                >
                  Confirmer la suppression
                </Button>
                <Button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                  variant="secondary"
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Toast UI */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
          <Toast
            message={toast.message}
            type={toast.type}
            duration={3500}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
}
