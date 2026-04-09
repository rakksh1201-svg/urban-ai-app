import React, { useMemo } from 'react';
import { t, type LangCode } from '../data/languages';
import type { CityPrediction } from '../engine/prediction';
import { HISTORICAL_DATA } from '../data/historicalData';
import EnvGauge from './EnvGauge';

interface DashboardProps {
  city: string;
  prediction: CityPrediction;
  lang: LangCode;
}

const RISK_COLORS: Record<string, string> = {
  safe: 'bg-env-safe',
  moderate: 'bg-env-moderate',
  high: 'bg-env-high',
  critical: 'bg-env-critical',
  emergency: 'bg-env-emergency',
};

const MetricCard: React.FC<{
  label: string;
  value: string;
  unit: string;
  trend?: number;
}> = React.memo(({ label, value, unit, trend }) => (
  <div className="env-card flex flex-col gap-1">
    <span className="env-label">{label}</span>
    <div className="flex items-end gap-2">
      <span className="text-2xl font-black tabular-nums text-foreground">{value}</span>
      <span className="text-sm text-muted-foreground">{unit}</span>
    </div>
    {trend !== undefined && (
      <span className={`text-xs font-semibold ${trend > 0 ? 'text-env-high' : 'text-env-safe'}`}>
        {trend > 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}% YoY
      </span>
    )}
  </div>
));
MetricCard.displayName = 'MetricCard';

const Dashboard: React.FC<DashboardProps> = React.memo(({ city, prediction, lang }) => {
  const p = prediction;

  const tempTrend = useMemo(() => {
    const data = HISTORICAL_DATA[city];
    if (!data) return 0;
    const last = data.temps[9];
    const prev = data.temps[8];
    return ((last - prev) / prev) * 100;
  }, [city]);

  const pm25Trend = useMemo(() => {
    const data = HISTORICAL_DATA[city];
    if (!data) return 0;
    return ((data.pm25[9] - data.pm25[8]) / data.pm25[8]) * 100;
  }, [city]);

  return (
    <div className="space-y-6">
      {/* Main Score */}
      <div className="env-card flex flex-col items-center py-8">
        <h2 className="text-lg font-bold text-foreground mb-2">{city}</h2>
        <EnvGauge score={p.envScore2025} size={220} />
        <div className="mt-4 flex items-center gap-3">
          <span className={`env-badge text-background ${RISK_COLORS[p.riskLevel]}`}>
            {t(lang, p.riskLevel).toUpperCase()}
          </span>
          <span className="text-sm text-muted-foreground">
            {t(lang, 'feelsLike')}: {p.feelsLike.toFixed(1)}°C
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label={t(lang, 'temperature')} value={p.currentTemp.toFixed(1)} unit="°C" trend={tempTrend} />
        <MetricCard label={t(lang, 'pm25')} value={p.currentPM25.toFixed(0)} unit="µg/m³" trend={pm25Trend} />
        <MetricCard label={t(lang, 'uhiDelta')} value={`+${p.currentUHI.toFixed(1)}`} unit="°C" />
        <MetricCard label={t(lang, 'greenCover')} value={p.currentGreenCover.toFixed(1)} unit="%" />
      </div>

      {/* Predictions Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="env-card">
          <span className="env-label">{t(lang, 'currentYear')}</span>
          <div className="text-xl font-bold tabular-nums text-foreground mt-1">{p.envScore2025.toFixed(2)}</div>
        </div>
        <div className="env-card">
          <span className="env-label">{t(lang, 'prediction2027')}</span>
          <div className="text-xl font-bold tabular-nums text-env-moderate mt-1">{p.envScore2027.toFixed(2)}</div>
        </div>
        <div className="env-card">
          <span className="env-label">{t(lang, 'prediction2030')}</span>
          <div className="text-xl font-bold tabular-nums text-env-high mt-1">{p.envScore2030.toFixed(2)}</div>
        </div>
      </div>

      {/* Breaking Point + Impact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="env-card border-env-high/30">
          <span className="env-label">{t(lang, 'breakingPoint')}</span>
          <div className="text-2xl font-black tabular-nums text-env-high mt-1">
            {p.breakingPointYear ?? '2060+'}
          </div>
        </div>
        <div className="env-card">
          <span className="env-label">{t(lang, 'citizensAtRisk')}</span>
          <div className="text-lg font-bold tabular-nums text-foreground mt-1">
            {p.citizensAtRisk.toFixed(1)} {t(lang, 'lakhs')}
          </div>
        </div>
        <div className="env-card">
          <span className="env-label">{t(lang, 'economicLoss')}</span>
          <div className="text-lg font-bold tabular-nums text-env-moderate mt-1">
            ₹{p.economicLossPerYear} {t(lang, 'crore')}
          </div>
        </div>
        <div className="env-card">
          <span className="env-label">{t(lang, 'co2Saved')}</span>
          <div className="text-lg font-bold tabular-nums text-env-safe mt-1">
            {p.co2SavedPotential} {t(lang, 'tonnes')}
          </div>
        </div>
      </div>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';
export default Dashboard;
