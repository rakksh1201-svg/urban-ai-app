import React, { useMemo, useCallback } from 'react';
import { t, type LangCode, LANG_NAMES, type LangCode as LC } from '../data/languages';
import type { CityPrediction } from '../engine/prediction';

interface AlertsProps {
  predictions: Record<string, CityPrediction>;
  lang: LangCode;
  selectedCity: string;
}

const Alerts: React.FC<AlertsProps> = React.memo(({ predictions, lang, selectedCity }) => {
  const alertCities = useMemo(() => {
    return Object.entries(predictions)
      .filter(([, p]) => p.envScore2025 > 7.5)
      .sort((a, b) => b[1].envScore2025 - a[1].envScore2025);
  }, [predictions]);

  const currentPrediction = predictions[selectedCity];

  const generateAdvisory = useCallback((city: string, p: CityPrediction): string => {
    const riskTexts: Record<string, string> = {
      safe: 'No immediate action required. Continue monitoring.',
      moderate: 'Stay hydrated. Limit outdoor activities during 12-3pm. Check on elderly neighbors.',
      high: 'Heat advisory in effect. Avoid outdoor work 11am-4pm. Drink 3+ liters water. Open cooling shelters.',
      critical: 'DANGER: Extreme heat. Stay indoors. All outdoor labor suspended. Emergency cooling centers active.',
      emergency: 'EMERGENCY: Life-threatening heat. Evacuate vulnerable populations. All non-essential movement banned.',
    };
    return `${city}: ${riskTexts[p.riskLevel] ?? riskTexts.moderate} Temp: ${p.currentTemp.toFixed(1)}°C, PM2.5: ${p.currentPM25.toFixed(0)}µg/m³, ENV Score: ${p.envScore2025.toFixed(1)}/10.`;
  }, []);

  const generateSMS = useCallback((city: string, p: CityPrediction, smsLang: LC): string => {
    const risk = t(smsLang, p.riskLevel).toUpperCase();
    const msg = `ENVIQ ${city}: ${risk} ${p.currentTemp.toFixed(0)}°C PM2.5:${p.currentPM25.toFixed(0)} Score:${p.envScore2025.toFixed(1)}/10`;
    return msg.slice(0, 160);
  }, []);

  const downloadReport = useCallback(() => {
    const report = {
      generatedAt: new Date().toISOString(),
      city: selectedCity,
      prediction: currentPrediction ? {
        envScore: currentPrediction.envScore2025,
        riskLevel: currentPrediction.riskLevel,
        temperature: currentPrediction.currentTemp,
        pm25: currentPrediction.currentPM25,
        uhiDelta: currentPrediction.currentUHI,
        breakingPoint: currentPrediction.breakingPointYear,
        citizensAtRisk: currentPrediction.citizensAtRisk,
        economicLoss: currentPrediction.economicLossPerYear,
      } : null,
      allAlerts: alertCities.map(([c, p]) => ({
        city: c, score: p.envScore2025.toFixed(2), risk: p.riskLevel
      })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enviq-report-${selectedCity}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedCity, currentPrediction, alertCities]);

  // South India summary
  const summary = useMemo(() => {
    const all = Object.values(predictions);
    const highRisk = all.filter(p => p.envScore2025 >= 7);
    const totalPopHighRisk = highRisk.reduce((s, p) => s + p.population, 0);
    const combinedExposure = all.reduce((s, p) => s + p.economicLossPerYear, 0);
    const unsafePM = all.filter(p => p.currentPM25 > 60).length;

    // State urgency
    const stateMap: Record<string, number[]> = {};
    for (const p of all) {
      if (!stateMap[p.state]) stateMap[p.state] = [];
      stateMap[p.state].push(p.envScore2025);
    }
    const stateRanked = Object.entries(stateMap)
      .map(([s, scores]) => ({ state: s, avg: scores.reduce((a, b) => a + b, 0) / scores.length }))
      .sort((a, b) => b.avg - a.avg);

    return { totalPopHighRisk, combinedExposure, unsafePM, totalCities: all.length, stateRanked };
  }, [predictions]);

  const smsLangs: LC[] = ['en', 'ta', 'te', 'kn', 'ml', 'kok'];

  return (
    <div className="space-y-6">
      {/* Today's Advisory */}
      {currentPrediction && (
        <div className="env-card border-env-high/20">
          <h3 className="text-sm font-bold text-foreground mb-2">{t(lang, 'todayAdvisory')} — {selectedCity}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {generateAdvisory(selectedCity, currentPrediction)}
          </p>
        </div>
      )}

      {/* SMS Formats */}
      {currentPrediction && (
        <div className="env-card">
          <h3 className="text-sm font-bold text-foreground mb-3">{t(lang, 'smsFormat')}</h3>
          <div className="space-y-2">
            {smsLangs.map(sl => (
              <div key={sl} className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground w-16 shrink-0 pt-0.5">{LANG_NAMES[sl]}</span>
                <code className="text-xs bg-secondary text-foreground px-2 py-1 rounded-lg break-all flex-1">
                  {generateSMS(selectedCity, currentPrediction, sl)}
                </code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Download */}
      <button
        onClick={downloadReport}
        className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-colors hover:opacity-90"
      >
        {t(lang, 'downloadReport')}
      </button>

      {/* Alert Cities */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-3">
          🚨 {alertCities.length} {t(lang, 'alerts')} (Score &gt; 7.5)
        </h3>
        <div className="space-y-2">
          {alertCities.map(([city, p]) => (
            <div key={city} className="env-card flex justify-between items-center">
              <div>
                <span className="font-semibold text-foreground text-sm">{city}</span>
                <span className="text-xs text-muted-foreground ml-2">{p.state}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`env-badge text-background ${
                  p.riskLevel === 'emergency' ? 'bg-env-emergency' :
                  p.riskLevel === 'critical' ? 'bg-env-critical' : 'bg-env-high'
                }`}>
                  {t(lang, p.riskLevel).toUpperCase()}
                </span>
                <span className="text-lg font-black tabular-nums text-env-high">{p.envScore2025.toFixed(1)}</span>
              </div>
            </div>
          ))}
          {alertCities.length === 0 && (
            <p className="text-sm text-muted-foreground">{t(lang, 'noData')}</p>
          )}
        </div>
      </div>

      {/* South India Summary */}
      <div className="env-card border-gold/20">
        <h3 className="text-sm font-bold text-foreground mb-4">{t(lang, 'southIndiaSummary')}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <span className="env-label">{t(lang, 'totalPopHighRisk')}</span>
            <div className="text-xl font-bold text-env-high mt-1">
              {(summary.totalPopHighRisk / 100).toFixed(1)} {t(lang, 'crore')}
            </div>
          </div>
          <div>
            <span className="env-label">{t(lang, 'combinedExposure')}</span>
            <div className="text-xl font-bold text-env-moderate mt-1">
              ₹{summary.combinedExposure.toLocaleString()} {t(lang, 'crore')}
            </div>
          </div>
          <div>
            <span className="env-label">{t(lang, 'citiesUnsafePM')}</span>
            <div className="text-xl font-bold text-foreground mt-1">
              {summary.unsafePM} / {summary.totalCities}
            </div>
          </div>
          <div>
            <span className="env-label">{t(lang, 'statesRanked')}</span>
            <div className="mt-1 space-y-0.5">
              {summary.stateRanked.map((s, i) => (
                <div key={s.state} className="text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">{i + 1}.</span> {s.state} ({s.avg.toFixed(1)})
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

Alerts.displayName = 'Alerts';
export default Alerts;
