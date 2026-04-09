import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { t, type LangCode } from '../data/languages';
import { HISTORICAL_DATA } from '../data/historicalData';
import type { CityPrediction } from '../engine/prediction';
import { YEARS } from '../engine/prediction';

interface TrendsProps {
  city: string;
  prediction: CityPrediction;
  lang: LangCode;
}

type MetricKey = 'temperature' | 'pm25' | 'uhiDelta' | 'rainfall' | 'greenCover';

const METRIC_CONFIGS: Record<MetricKey, { dataKey: string; unit: string; color: string }> = {
  temperature: { dataKey: 'temps', unit: '°C', color: '#EF4444' },
  pm25: { dataKey: 'pm25', unit: 'µg/m³', color: '#F59E0B' },
  uhiDelta: { dataKey: 'uhi', unit: '°C', color: '#8B5CF6' },
  rainfall: { dataKey: 'rainfall_mm', unit: 'mm', color: '#3B82F6' },
  greenCover: { dataKey: 'greenCoverPct', unit: '%', color: '#10B981' },
};

const REGRESS_MAP: Record<MetricKey, keyof CityPrediction> = {
  temperature: 'tempRegress',
  pm25: 'pm25Regress',
  uhiDelta: 'uhiRegress',
  rainfall: 'rainfallRegress',
  greenCover: 'greenCoverRegress',
};

const Trends: React.FC<TrendsProps> = React.memo(({ city, prediction, lang }) => {
  const [metric, setMetric] = useState<MetricKey>('temperature');
  const config = METRIC_CONFIGS[metric];
  const histData = HISTORICAL_DATA[city];

  const chartData = useMemo(() => {
    if (!histData) return [];
    const regress = prediction[REGRESS_MAP[metric]] as { predict: (yr: number) => number };
    const dataArr = (histData as any)[config.dataKey] as number[];

    const points = YEARS.map((yr, i) => ({
      year: yr,
      actual: +dataArr[i].toFixed(1),
    }));

    // Add predicted years
    for (const yr of [2025, 2026, 2027, 2028, 2029, 2030]) {
      points.push({
        year: yr,
        actual: undefined as any,
        predicted: +regress.predict(yr).toFixed(1),
      } as any);
    }

    return points;
  }, [city, metric, histData, prediction, config.dataKey]);

  const yoyChanges = useMemo(() => {
    if (!histData) return [];
    const dataArr = (histData as any)[config.dataKey] as number[];
    return dataArr.slice(1).map((v, i) => ({
      year: YEARS[i + 1],
      change: (((v - dataArr[i]) / dataArr[i]) * 100),
    }));
  }, [city, metric, histData, config.dataKey]);

  const metrics: MetricKey[] = ['temperature', 'pm25', 'uhiDelta', 'rainfall', 'greenCover'];

  return (
    <div className="space-y-6">
      {/* Metric Selector */}
      <div className="flex flex-wrap gap-2">
        {metrics.map(m => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              metric === m
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {t(lang, m)}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="env-card" style={{ height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="year" stroke="hsl(215, 14%, 65%)" fontSize={12} />
            <YAxis stroke="hsl(215, 14%, 65%)" fontSize={12} />
            <Tooltip
              contentStyle={{
                background: 'hsl(220, 33%, 9%)',
                border: '1px solid hsl(220, 20%, 18%)',
                borderRadius: '0.75rem',
                color: 'hsl(210, 40%, 98%)',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="actual"
              stroke={config.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              name={t(lang, 'historical')}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="predicted"
              stroke={config.color}
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={{ r: 3 }}
              name={t(lang, 'predicted')}
              connectNulls={false}
            />
            {prediction.breakingPointYear && prediction.breakingPointYear <= 2030 && (
              <ReferenceLine
                x={prediction.breakingPointYear}
                stroke="#EF4444"
                strokeDasharray="3 3"
                label={{ value: t(lang, 'breakingPoint'), fill: '#EF4444', fontSize: 11 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* YoY Changes */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-3">{t(lang, 'yoyChange')}</h3>
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
          {yoyChanges.map(c => (
            <div key={c.year} className="env-card text-center py-2">
              <div className="text-xs text-muted-foreground">{c.year}</div>
              <div className={`text-sm font-bold tabular-nums ${c.change > 0 ? (metric === 'greenCover' || metric === 'rainfall' ? 'text-env-safe' : 'text-env-high') : (metric === 'greenCover' || metric === 'rainfall' ? 'text-env-high' : 'text-env-safe')}`}>
                {c.change > 0 ? '+' : ''}{c.change.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

Trends.displayName = 'Trends';
export default Trends;
