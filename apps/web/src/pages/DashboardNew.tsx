import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers, TrendingUp, Award, DollarSign } from 'lucide-react';
import { dashboardApi } from '@/features/dashboard/api/dashboard.api';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { TimeSeriesChart } from '@/features/dashboard/components/TimeSeriesChart';
import { GradedPieChart } from '@/features/dashboard/components/GradedPieChart';
import { TopSetsList } from '@/features/dashboard/components/TopSetsList';
import { TopExpensiveCards } from '@/features/dashboard/components/TopExpensiveCards';
import type { PeriodFilter } from '@/features/dashboard/components/PeriodSelector';
import {
  TimeSeriesMetric,
  PeriodType,
} from '@/features/dashboard/types/dashboard.types';
import { useDashboardPreferences } from '@/hooks/useUserPreferences';
import styles from './DashboardNew.module.css';

export function DashboardNew(): JSX.Element {
  // Définir le titre de la page
  useEffect(() => {
    document.title = 'PokéFolio - Dashboard';
  }, []);

  // Préférences persistantes pour masquer la valeur
  const { hideValue, setHideValue } = useDashboardPreferences();

  // Toujours afficher toutes les données depuis le début (pas de sélecteur de période)
  const globalPeriod: PeriodFilter = {
    type: PeriodType.ALL,
  };

  // Le bucket est déterminé automatiquement par le backend en fonction de la plage de dates
  const bucket = undefined;

  // Queries React Query
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.getSummary(globalPeriod),
  });

  const {
    data: countSeries,
    isLoading: countLoading,
    error: countError,
  } = useQuery({
    queryKey: ['dashboard', 'timeseries', 'count'],
    queryFn: () => dashboardApi.getTimeSeries(TimeSeriesMetric.COUNT, globalPeriod, bucket),
  });

  const {
    data: valueSeries,
    isLoading: valueLoading,
    error: valueError,
  } = useQuery({
    queryKey: ['dashboard', 'timeseries', 'value'],
    queryFn: () => dashboardApi.getTimeSeries(TimeSeriesMetric.VALUE, globalPeriod, bucket),
  });

  const {
    data: gradeDistribution,
    isLoading: gradeLoading,
    error: gradeError,
  } = useQuery({
    queryKey: ['dashboard', 'grade-distribution'],
    queryFn: () => dashboardApi.getGradeDistribution(),
  });

  const {
    data: topSets,
    isLoading: topSetsLoading,
    error: topSetsError,
  } = useQuery({
    queryKey: ['dashboard', 'top-sets'],
    queryFn: () => dashboardApi.getTopSets(5),
  });

  const {
    data: expensiveCards,
    isLoading: expensiveCardsLoading,
    error: expensiveCardsError,
  } = useQuery({
    queryKey: ['dashboard', 'expensive-cards'],
    queryFn: () => dashboardApi.getExpensiveCards(5),
  });

  // Formatters
  const formatCurrency = (value: number): string => `${value.toFixed(2)}€`;
  const formatNumber = (value: number): string => value.toLocaleString('fr-FR');

  // Gestion des erreurs globale
  const hasErrors =
    summaryError || countError || valueError || gradeError || topSetsError || expensiveCardsError;

  if (hasErrors) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <h2>Erreur de chargement</h2>
          <p>Une erreur s&apos;est produite lors du chargement du dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <p className={styles.pageSubtitle}>Vue d&apos;ensemble de votre collection Pokémon depuis le début</p>
      </header>

      {/* KPIs */}
      <section className={styles.kpiGrid} aria-label="Key Performance Indicators">
        <KpiCard
          title="cartes totales"
          icon={<Layers size={20} />}
          value={summary ? formatNumber(summary.totalCards) : '0'}
          loading={summaryLoading}
        />
        <KpiCard
          title="cartes distinctes"
          icon={<Layers size={20} />}
          value={summary ? formatNumber(summary.distinctCards) : '0'}
          loading={summaryLoading}
        />
        <KpiCard
          title="cartes gradées"
          icon={<TrendingUp size={20} />}
          value={summary ? formatNumber(summary.gradedCount) : '0'}
          loading={summaryLoading}
        />
        <KpiCard
          title="sets différents"
          icon={<Award size={20} />}
          value={summary ? formatNumber(summary.totalSets) : '0'}
          loading={summaryLoading}
        />
        <KpiCard
          title="valeur totale"
          icon={<DollarSign size={20} />}
          value={summary ? formatCurrency(summary.totalValue) : '0€'}
          loading={summaryLoading}
          hideable
          isHidden={hideValue}
          onToggleHidden={() => setHideValue(!hideValue)}
        />
      </section>

      {/* Charts Row 1: Time Series */}
      <section className={styles.chartsRow} aria-label="Time Series Charts">
        <TimeSeriesChart
          title="évolution du nombre de cartes"
          data={countSeries?.data || []}
          loading={countLoading}
          valueFormatter={formatNumber}
          color="#7cf3ff"
        />
        <TimeSeriesChart
          title="évolution de la valeur"
          data={valueSeries?.data || []}
          loading={valueLoading}
          valueFormatter={formatCurrency}
          color="#a78bfa"
        />
      </section>

      {/* Charts Row 2: Distribution & Top Sets */}
      <section className={styles.chartsRow} aria-label="Distribution and Rankings">
        <GradedPieChart data={gradeDistribution} loading={gradeLoading} />
        <TopSetsList data={topSets} loading={topSetsLoading} />
      </section>

      {/* Charts Row 3: Expensive Cards */}
      <section className={styles.chartsRow} aria-label="Expensive Cards">
        <TopExpensiveCards data={expensiveCards} loading={expensiveCardsLoading} />
      </section>
    </div>
  );
}

export default DashboardNew;
