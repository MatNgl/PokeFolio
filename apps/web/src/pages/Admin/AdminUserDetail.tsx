import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService, type UserDetails, type UserCard } from '../../services/admin.service';
import { FullScreenLoader } from '../../components/ui/FullScreenLoader';
import { Button } from '../../components/ui/Button';
import styles from './AdminUserDetail.module.css';

export default function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<UserDetails | null>(null);

  useEffect(() => {
    if (userId) {
      loadUserDetails(userId);
    }
  }, [userId]);

  useEffect(() => {
    if (details) {
      document.title = `PokéFolio - Admin - ${details.user.pseudo}`;
    }
  }, [details]);

  const loadUserDetails = async (id: string) => {
    try {
      setLoading(true);
      const data = await adminService.getUserDetails(id);
      setDetails(data);
    } catch (error) {
      console.error('Error loading user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!userId || !confirm('Supprimer cette carte du portfolio ?')) {
      return;
    }

    try {
      await adminService.deleteUserCard(userId, cardId);
      if (details) {
        setDetails({
          ...details,
          cards: details.cards.filter((c: UserCard) => c._id !== cardId),
        });
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleDeleteUser = async () => {
    if (!userId || !details) {
      return;
    }

    if (!confirm(`Supprimer l'utilisateur ${details.user.email} et toute sa collection ?`)) {
      return;
    }

    try {
      await adminService.deleteUser(userId);
      navigate('/admin/users');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return <FullScreenLoader message="Chargement..." />;
  }

  if (!details) {
    return (
      <div className={styles.page}>
        <p>Utilisateur non trouvé</p>
      </div>
    );
  }

  // Helper pour construire l'URL de l'image TCGdex
  const buildImageUrl = (imageUrl?: string): string | undefined => {
    if (!imageUrl) return undefined;
    // Si l'URL provient de assets.tcgdex.net et n'a pas d'extension, ajouter /high.webp
    if (imageUrl.includes('assets.tcgdex.net') && !imageUrl.match(/\.(png|jpg|jpeg|webp)$/i)) {
      return `${imageUrl}/high.webp`;
    }
    return imageUrl;
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{details.user.pseudo}</h1>
          <p className={styles.subtitle}>{details.user.email}</p>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => navigate('/admin/users')}>
            Retour
          </Button>
          {details.user.role !== 'admin' && (
            <Button variant="danger" onClick={handleDeleteUser}>
              Supprimer utilisateur
            </Button>
          )}
        </div>
      </header>

      <section className={styles.stats}>
        <div className={styles.statCard}>
          <h3>Cartes</h3>
          <p className={styles.bigNumber}>{details.stats.cardsCount}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Valeur totale</h3>
          <p className={styles.bigNumber}>{details.stats.totalValue.toFixed(2)} €</p>
        </div>
        <div className={styles.statCard}>
          <h3>Inscrit le</h3>
          <p className={styles.bigNumber}>
            {new Date(details.user.createdAt).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </section>

      <section className={styles.portfolio}>
        <h2>Portfolio ({details.cards.length} cartes)</h2>

        {details.cards.length === 0 ? (
          <div className={styles.empty}>
            <p>Aucune carte dans le portfolio</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {details.cards.map((card: UserCard) => (
              <div key={card._id} className={styles.card}>
                {card.imageUrl && (
                  <img
                    src={buildImageUrl(card.imageUrl)}
                    alt={card.name}
                    className={styles.cardImage}
                  />
                )}
                <div className={styles.cardInfo}>
                  <p className={styles.cardName}>{card.name}</p>
                  <p className={styles.cardSet}>{card.setName}</p>
                  <p className={styles.cardQuantity}>Quantité: {card.quantity}</p>
                  <p className={styles.cardValue}>
                    {((card.purchasePrice || 0) * (card.quantity || 0)).toFixed(2)} €
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDeleteCard(card._id)}
                  className={styles.deleteBtn}
                >
                  Supprimer
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
