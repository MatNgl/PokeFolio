import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { PriceHistory, CardPricing } from '@pokefolio/types';
import { pricingService } from '../../services/pricing.service';
import { Loader } from '../ui/FullScreenLoader';
import styles from './CardPriceChart.module.css';

type Props = {
  cardId: string;
  variant?: 'normal' | 'holofoil' | 'reverseHolofoil';
};

type Period = '7d' | '30d' | '90d' | '1y';

const PERIOD_LABELS: Record<Period, string> = {
  '7d': '7 jours',
  '30d': '30 jours',
  '90d': '90 jours',
  '1y': '1 an',
};

export default function CardPriceChart({ cardId, variant = 'normal' }: Props) {
  const [period, setPeriod] = useState<Period>('30d');
  const [history, setHistory] = useState<PriceHistory | null>(null);
  const [pricing, setPricing] = useState<CardPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Récupérer les prix actuels et l'historique en parallèle
        const [historyData, pricingData] = await Promise.all([
          pricingService.getPriceHistory(cardId, period, variant),
          pricingService.getCardPricing(cardId),
        ]);

        if (!mounted) return;

        if (!historyData) {
          setError('Aucune donnée de prix disponible pour cette carte');
          setHistory(null);
          setPricing(null);
        } else {
          setHistory(historyData);
          setPricing(pricingData);
        }
      } catch (err) {
        if (!mounted) return;
        console.error('Erreur lors du chargement des prix:', err);
        setError('Erreur lors du chargement des données de prix');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, [cardId, period, variant]);

  const formatPrice = (value: number) => {
    return `${value.toFixed(2)} $`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Loader />
        </div>
      </div>
    );
  }

  if (error || !history) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h4 className={styles.title}>Évolution du prix TCGPlayer</h4>
        </div>
        <div className={styles.error}>
          <p>
            {error ||
              "Les données de prix ne sont pas disponibles pour cette carte. Cela peut être dû à : une carte exclusive à certaines régions, un problème temporaire de l'API Pokemon TCG, ou une carte trop récente."}
          </p>
        </div>
      </div>
    );
  }

  // Calculer les statistiques
  const prices = history.data.map((d) => d.price);
  const currentPrice = prices[prices.length - 1] ?? 0;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

  // Prix actuel depuis l'API
  const tcgPlayerPrice = pricing?.prices[variant]?.market ?? pricing?.prices[variant]?.mid ?? null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>Évolution du prix TCGPlayer</h4>
        <div className={styles.periodSelector}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              className={`${styles.periodBtn} ${period === p ? styles.active : ''}`}
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.stats}>
        {tcgPlayerPrice !== null && (
          <div className={styles.stat}>
            <span className={styles.statLabel}>Prix actuel</span>
            <span className={styles.statValue}>{formatPrice(tcgPlayerPrice)}</span>
          </div>
        )}
        <div className={styles.stat}>
          <span className={styles.statLabel}>Minimum</span>
          <span className={styles.statValue}>{formatPrice(minPrice)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Maximum</span>
          <span className={styles.statValue}>{formatPrice(maxPrice)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Moyenne</span>
          <span className={styles.statValue}>{formatPrice(avgPrice)}</span>
        </div>
      </div>

      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={history.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#666"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              tickFormatter={(value) => `${value}$`}
              stroke="#666"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              formatter={(value: number) => formatPrice(value)}
              labelFormatter={(label) => formatDate(label as string)}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '8px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Prix du marché"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.disclaimer}>
        <p>
          💡 Les données historiques sont simulées à partir du prix actuel TCGPlayer. Pour des
          données historiques réelles, une intégration avec un service de suivi de prix tiers serait
          nécessaire.
        </p>
      </div>
    </div>
  );
}
