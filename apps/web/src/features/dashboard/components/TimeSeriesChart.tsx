import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';
import type { TimeSeriesDataPoint } from '../types/dashboard.types';
import styles from './TimeSeriesChart.module.css';

export interface TimeSeriesChartProps {
  title: string;
  data: TimeSeriesDataPoint[];
  loading?: boolean;
  valueFormatter?: (value: number) => string;
  color?: string;
}

export function TimeSeriesChart({
  title,
  data,
  loading = false,
  valueFormatter = (v: number) => v.toString(),
  color = '#7cf3ff',
}: TimeSeriesChartProps): JSX.Element {
  const [_activeIndex, setActiveIndex] = useState<number | undefined>();

  if (loading) {
    return (
      <div className={styles.chartContainer}>
        <div className={styles.header}>
          <div className={styles.title}>
            <div className={styles.iconWrapper} aria-hidden="true">
              <TrendingUp size={16} />
            </div>
            {title}
          </div>
        </div>
        <div className={styles.skeleton} role="status" aria-label="Loading chart" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={styles.chartContainer}>
        <div className={styles.header}>
          <div className={styles.title}>
            <div className={styles.iconWrapper} aria-hidden="true">
              <TrendingUp size={16} />
            </div>
            {title}
          </div>
        </div>
        <div className={styles.emptyState}>
          <BarChart3 className={styles.emptyIcon} aria-hidden="true" />
          <p className={styles.emptyText}>Aucune donnée disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chartContainer}>
      <div className={styles.header}>
        <div className={styles.title}>
          <div className={styles.iconWrapper} aria-hidden="true">
            <TrendingUp size={16} />
          </div>
          {title}
        </div>
      </div>

      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            onMouseMove={(state) => {
              if (state.isTooltipActive) {
                const idx = state.activeTooltipIndex;
                setActiveIndex(
                  idx !== null && idx !== undefined && typeof idx === 'number' ? idx : undefined
                );
              } else {
                setActiveIndex(undefined);
              }
            }}
            onMouseLeave={() => setActiveIndex(undefined)}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(124, 243, 255, 0.1)" />
            <XAxis
              dataKey="date"
              stroke="rgba(255, 255, 255, 0.5)"
              style={{ fontSize: '12px' }}
              tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
            />
            <YAxis
              stroke="rgba(255, 255, 255, 0.5)"
              style={{ fontSize: '12px' }}
              tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
              tickFormatter={valueFormatter}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(124, 243, 255, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                color: '#ffffff',
              }}
              labelStyle={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '4px' }}
              formatter={(value: number) => [valueFormatter(value), 'Valeur']}
              cursor={{ stroke: color, strokeWidth: 2, strokeDasharray: '5 5' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill="url(#colorValue)"
              dot={{
                fill: color,
                strokeWidth: 2,
                r: 4,
                stroke: '#0f172a',
              }}
              activeDot={{
                r: 6,
                fill: color,
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
              isAnimationActive={true}
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
