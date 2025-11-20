import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Award } from 'lucide-react';
import type { GradeDistribution } from '../types/dashboard.types';
import styles from './TimeSeriesChart.module.css';

const COLORS = {
  graded: '#7cf3ff',
  normal: '#0ea5e9',
};

interface PieData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number; // Index signature pour Recharts
}

interface PieLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}

export interface GradedPieChartProps {
  data: GradeDistribution | undefined;
  loading?: boolean;
}

export function GradedPieChart({ data, loading = false }: GradedPieChartProps): JSX.Element {
  if (loading) {
    return (
      <div className={styles.chartContainer}>
        <div className={styles.header}>
          <div className={styles.title}>
            <div className={styles.iconWrapper} aria-hidden="true">
              <Award size={16} />
            </div>
            Distribution Gradé vs Normal
          </div>
        </div>
        <div className={styles.skeleton} role="status" aria-label="Loading chart" />
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className={styles.chartContainer}>
        <div className={styles.header}>
          <div className={styles.title}>
            <div className={styles.iconWrapper} aria-hidden="true">
              <Award size={16} />
            </div>
            Distribution Gradé vs Normal
          </div>
        </div>
        <div className={styles.emptyState}>
          <Award className={styles.emptyIcon} aria-hidden="true" />
          <p className={styles.emptyText}>Aucune donnée disponible</p>
        </div>
      </div>
    );
  }

  const pieData: PieData[] = [
    { name: 'Gradées', value: data.graded, color: COLORS.graded },
    { name: 'Normales', value: data.normal, color: COLORS.normal },
  ];

  const renderCustomLabel = (props: any): JSX.Element | null => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    if (percent < 0.05) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        style={{ fontSize: '14px', fontWeight: 600 }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className={styles.chartContainer}>
      <div className={styles.header}>
        <div className={styles.title}>
          <div className={styles.iconWrapper} aria-hidden="true">
            <Award size={16} />
          </div>
          Distribution Gradé vs Normal
        </div>
      </div>

      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              animationDuration={500}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(124, 243, 255, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                color: '#ffffff',
              }}
              itemStyle={{
                color: '#ffffff',
              }}
              labelStyle={{
                color: '#ffffff',
              }}
              formatter={(value: number) => [value, 'Cartes']}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {data.byCompany.length > 0 && (
        <div style={{ marginTop: '16px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>Par compagnie :</div>
          {data.byCompany.map((company) => (
            <div
              key={company.company}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0',
              }}
            >
              <span>{company.company}</span>
              <span style={{ color: '#7cf3ff' }}>
                {company.count} ({company.percentage.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
