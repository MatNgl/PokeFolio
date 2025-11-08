import { useEffect, useState } from 'react';
import { adminService, type ActivityLog } from '../../services/admin.service';
import { FullScreenLoader } from '../../components/ui/FullScreenLoader';
import styles from './AdminLogs.module.css';

const ACTIVITY_TYPES = [
  { value: '', label: 'Tous' },
  { value: 'login', label: 'Connexions' },
  { value: 'logout', label: 'Déconnexions' },
  { value: 'user_created', label: 'Créations' },
];

export default function AdminLogs() {
  useEffect(() => {
    document.title = 'PokéFolio - Admin Logs';
  }, []);

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, page]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await adminService.getActivityLogs({
        limit,
        skip: page * limit,
        type: filterType || undefined,
      });

      setLogs(data.logs as ActivityLog[]);
      setTotal(data.total);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityLabel = (type: string) => {
    const activity = ACTIVITY_TYPES.find((a) => a.value === type);
    return activity?.label || type;
  };

  if (loading && logs.length === 0) {
    return <FullScreenLoader message="Chargement des logs..." />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Logs d&apos;activité</h1>
          <p className={styles.subtitle}>{total} événements au total</p>
        </div>
      </header>

      <div className={styles.filters}>
        <label>
          Type d&apos;activité:
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(0);
            }}
            className={styles.select}
          >
            {ACTIVITY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Utilisateur</th>
              <th>Email</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log._id}>
                <td>{new Date(log.createdAt).toLocaleString('fr-FR')}</td>
                <td>
                  <span className={styles[`type${log.type.replace('_', '')}`] || styles.type}>
                    {getActivityLabel(log.type)}
                  </span>
                </td>
                <td>{log.userEmail}</td>
                <td>{log.userEmail}</td>
                <td>{log.ipAddress || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {logs.length === 0 && !loading && (
          <div className={styles.empty}>
            <p>Aucun log trouvé</p>
          </div>
        )}
      </div>

      <div className={styles.pagination}>
        <button disabled={page === 0} onClick={() => setPage(page - 1)} className={styles.pageBtn}>
          Précédent
        </button>
        <span className={styles.pageInfo}>
          Page {page + 1} / {Math.ceil(total / limit)}
        </span>
        <button
          disabled={(page + 1) * limit >= total}
          onClick={() => setPage(page + 1)}
          className={styles.pageBtn}
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
