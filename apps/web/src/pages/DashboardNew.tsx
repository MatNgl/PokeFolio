import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers, TrendingUp, Award, DollarSign } from 'lucide-react';
import { dashboardApi } from '@/features/dashboard/api/dashboard.api';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { TimeSeriesChart } from '@/features/dashboard/components/TimeSeriesChart';
import { GradedPieChart } from '@/features/dashboard/components/GradedPieChart';
import { TopSetsList } from '@/features/dashboard/components/TopSetsList';
import {
  TimeSeriesMetric,
  TimeSeriesPeriod,
  TimeSeriesBucket,
} from '@/features/dashboard/types/dashboard.types';
import styles from './DashboardNew.module.css';

export function DashboardNew(): JSX.Element {
  const [countPeriod, setCountPeriod] = useState<TimeSeriesPeriod>(TimeSeriesPeriod.THIRTY_DAYS);
  const [valuePeriod, setValuePeriod] = useState<TimeSeriesPeriod>(TimeSeriesPeriod.THIRTY_DAYS);

  // Déterminer le bucket automatiquement selon la période
  const getAutoBucket = (period: TimeSeriesPeriod): TimeSeriesBucket => {
    if (period === TimeSeriesPeriod.SEVEN_DAYS || period === TimeSeriesPeriod.THIRTY_DAYS) {
      return TimeSeriesBucket.DAILY;
    }
    if (period === TimeSeriesPeriod.SIX_MONTHS) {
      return TimeSeriesBucket.WEEKLY;
    }
    return TimeSeriesBucket.MONTHLY;
  };

  // Queries React Query
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.getSummary(),
  });

  const {
    data: countSeries,
    isLoading: countLoading,
    error: countError,
  } = useQuery({
    queryKey: ['dashboard', 'timeseries', 'count', countPeriod],
    queryFn: () =>
      dashboardApi.getTimeSeries(TimeSeriesMetric.COUNT, countPeriod, getAutoBucket(countPeriod)),
  });

  const {
    data: valueSeries,
    isLoading: valueLoading,
    error: valueError,
  } = useQuery({
    queryKey: ['dashboard', 'timeseries', 'value', valuePeriod],
    queryFn: () =>
      dashboardApi.getTimeSeries(TimeSeriesMetric.VALUE, valuePeriod, getAutoBucket(valuePeriod)),
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

  // Formatters
  const formatCurrency = (value: number): string => `${value.toFixed(2)}€`;
  const formatNumber = (value: number): string => value.toLocaleString('fr-FR');

  // Gestion des erreurs globale
  const hasErrors = summaryError || countError || valueError || gradeError || topSetsError;

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

      {/* KPIs */}
      <section className={styles.kpiGrid} aria-label="Key Performance Indicators">
        <KpiCard
          title="Total Cartes"
          icon={<Layers size={20} />}
          value={summary ? formatNumber(summary.totalCards.value) : '0'}
          change={summary?.totalCards}
          loading={summaryLoading}
          formatter={formatNumber}
        />
        <KpiCard
          title="Total Sets"
          icon={<Award size={20} />}
          value={summary ? formatNumber(summary.totalSets.value) : '0'}
          change={summary?.totalSets}
          loading={summaryLoading}
          formatter={formatNumber}
        />
        <KpiCard
          title="Valeur Totale"
          icon={<DollarSign size={20} />}
          value={summary ? formatCurrency(summary.totalValue.value) : '0€'}
          change={summary?.totalValue}
          loading={summaryLoading}
          formatter={formatCurrency}
        />
        <KpiCard
          title="Cartes Gradées"
          icon={<TrendingUp size={20} />}
          value={summary ? formatNumber(summary.gradedCount.value) : '0'}
          change={summary?.gradedCount}
          loading={summaryLoading}
          formatter={formatNumber}
        />
      </section>

      {/* Charts Row 1: Time Series */}
      <section className={styles.chartsRow} aria-label="Time Series Charts">
        <TimeSeriesChart
          title="Évolution du Nombre de Cartes"
          data={countSeries?.data || []}
          loading={countLoading}
          period={countPeriod}
          onPeriodChange={setCountPeriod}
          valueFormatter={formatNumber}
          color="#7cf3ff"
        />
        <TimeSeriesChart
          title="Évolution de la Valeur"
          data={valueSeries?.data || []}
          loading={valueLoading}
          period={valuePeriod}
          onPeriodChange={setValuePeriod}
          valueFormatter={formatCurrency}
          color="#a78bfa"
        />
      </section>

      {/* Charts Row 2: Distribution & Top Sets */}
      <section className={styles.chartsRow} aria-label="Distribution and Rankings">
        <GradedPieChart data={gradeDistribution} loading={gradeLoading} />
        <TopSetsList data={topSets} loading={topSetsLoading} />
      </section>
    </div>
  );
}

export default DashboardNew;
