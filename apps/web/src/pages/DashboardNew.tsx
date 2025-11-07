import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers, TrendingUp, Award, DollarSign } from 'lucide-react';
import { dashboardApi } from '@/features/dashboard/api/dashboard.api';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { TimeSeriesChart } from '@/features/dashboard/components/TimeSeriesChart';
import { GradedPieChart } from '@/features/dashboard/components/GradedPieChart';
import { TopSetsList } from '@/features/dashboard/components/TopSetsList';
import { TopExpensiveCards } from '@/features/dashboard/components/TopExpensiveCards';
import { PeriodSelector, type PeriodFilter } from '@/features/dashboard/components/PeriodSelector';
import {
  TimeSeriesMetric,
  TimeSeriesBucket,
  PeriodType,
} from '@/features/dashboard/types/dashboard.types';
import styles from './DashboardNew.module.css';

export function DashboardNew(): JSX.Element {
  // Période globale partagée par tous les composants - par défaut 'all'
  const [globalPeriod, setGlobalPeriod] = useState<PeriodFilter>({
    type: PeriodType.ALL,
  });

  // Déterminer le bucket automatiquement selon la période
  const getAutoBucket = (period: PeriodFilter): TimeSeriesBucket => {
    if (period.type === PeriodType.WEEK) {
      return TimeSeriesBucket.DAILY;
    }
    if (period.type === PeriodType.MONTH) {
      return TimeSeriesBucket.DAILY;
    }
    if (period.type === PeriodType.YEAR) {
      return TimeSeriesBucket.MONTHLY;
    }
    // Pour 'all', utiliser mensuel pour avoir une vue d'ensemble
    return TimeSeriesBucket.MONTHLY;
  };

  // Générer une clé de query unique basée sur le filtre de période
  const getPeriodQueryKey = (period: PeriodFilter): string => {
    const parts = [period.type || 'all'];
    if (period.year) parts.push(period.year.toString());
    if (period.month) parts.push(period.month.toString());
    if (period.week) parts.push(period.week.toString());
    return parts.join('-');
  };

  // Queries React Query
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useQuery({
    queryKey: ['dashboard', 'summary', getPeriodQueryKey(globalPeriod)],
    queryFn: () => dashboardApi.getSummary(globalPeriod),
  });

  const {
    data: countSeries,
    isLoading: countLoading,
    error: countError,
  } = useQuery({
    queryKey: ['dashboard', 'timeseries', 'count', getPeriodQueryKey(globalPeriod)],
    queryFn: () =>
      dashboardApi.getTimeSeries(TimeSeriesMetric.COUNT, globalPeriod, getAutoBucket(globalPeriod)),
  });

  const {
    data: valueSeries,
    isLoading: valueLoading,
    error: valueError,
  } = useQuery({
    queryKey: ['dashboard', 'timeseries', 'value', getPeriodQueryKey(globalPeriod)],
    queryFn: () =>
      dashboardApi.getTimeSeries(TimeSeriesMetric.VALUE, globalPeriod, getAutoBucket(globalPeriod)),
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
        <p className={styles.pageSubtitle}>Vue d&apos;ensemble de votre collection Pokémon</p>
      </header>

      {/* Global Period Selector - Déplacé au-dessus des KPIs */}
      <section className={styles.periodSelector} aria-label="Period Selector">
        <PeriodSelector currentPeriod={globalPeriod} onPeriodChange={setGlobalPeriod} />
      </section>

      {/* KPIs */}
      <section className={styles.kpiGrid} aria-label="Key Performance Indicators">
        <KpiCard
          title="Total Cartes"
          icon={<Layers size={20} />}
          value={summary ? formatNumber(summary.totalCards) : '0'}
          loading={summaryLoading}
        />
        <KpiCard
          title="Total Sets"
          icon={<Award size={20} />}
          value={summary ? formatNumber(summary.totalSets) : '0'}
          loading={summaryLoading}
        />
        <KpiCard
          title="Valeur Totale"
          icon={<DollarSign size={20} />}
          value={summary ? formatCurrency(summary.totalValue) : '0€'}
          loading={summaryLoading}
        />
        <KpiCard
          title="Cartes Gradées"
          icon={<TrendingUp size={20} />}
          value={summary ? formatNumber(summary.gradedCount) : '0'}
          loading={summaryLoading}
        />
      </section>

      {/* Charts Row 1: Time Series */}
      <section className={styles.chartsRow} aria-label="Time Series Charts">
        <TimeSeriesChart
          title="Évolution du Nombre de Cartes"
          data={countSeries?.data || []}
          loading={countLoading}
          valueFormatter={formatNumber}
          color="#7cf3ff"
        />
        <TimeSeriesChart
          title="Évolution de la Valeur"
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
