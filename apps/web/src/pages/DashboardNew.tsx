import { useState, useEffect } from 'react';
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
  // Définir le titre de la page
  useEffect(() => {
    document.title = 'PokéFolio - Dashboard';
  }, []);

  // Période globale partagée par tous les composants - par défaut 'all'
  const [globalPeriod, setGlobalPeriod] = useState<PeriodFilter>({
    type: PeriodType.ALL,
  });

  // Déterminer le bucket automatiquement selon la période
  const getAutoBucket = (period: PeriodFilter): TimeSeriesBucket => {
    // Si on utilise des ISO dates, calculer le bucket selon la durée
    if (period.startDate && period.endDate) {
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 31) return TimeSeriesBucket.DAILY;
      if (diffDays <= 90) return TimeSeriesBucket.WEEKLY;
      return TimeSeriesBucket.MONTHLY;
    }

    // Sinon, utiliser la logique hiérarchique
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
    const parts: string[] = [];

    // Priorité 1: ISO dates (startDate/endDate)
    if (period.startDate || period.endDate) {
      parts.push('iso');
      if (period.startDate) parts.push(`start:${period.startDate}`);
      if (period.endDate) parts.push(`end:${period.endDate}`);
    } else {
      // Priorité 2: Filtres hiérarchiques (type/year/month/week)
      parts.push(period.type || 'all');
      if (period.year) parts.push(period.year.toString());
      if (period.month) parts.push(period.month.toString());
      if (period.week) parts.push(period.week.toString());
    }

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
          title="total cartes"
          icon={<Layers size={20} />}
          value={summary ? formatNumber(summary.totalCards) : '0'}
          loading={summaryLoading}
        />
        <KpiCard
          title="total sets"
          icon={<Award size={20} />}
          value={summary ? formatNumber(summary.totalSets) : '0'}
          loading={summaryLoading}
        />
        <KpiCard
          title="cartes gradées"
          icon={<TrendingUp size={20} />}
          value={summary ? formatNumber(summary.gradedCount) : '0'}
          loading={summaryLoading}
        />
        <KpiCard
          title="valeur totale"
          icon={<DollarSign size={20} />}
          value={summary ? formatCurrency(summary.totalValue) : '0€'}
          loading={summaryLoading}
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
