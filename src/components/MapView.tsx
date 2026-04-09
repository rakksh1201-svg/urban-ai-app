import React, { useState, useMemo } from 'react';
import { t, type LangCode } from '../data/languages';
import type { CityPrediction } from '../engine/prediction';

interface MapViewProps {
  predictions: Record<string, CityPrediction>;
  lang: LangCode;
  onCitySelect: (city: string) => void;
}

// Simplified SVG paths for South Indian states
const STATE_PATHS: Record<string, { d: string; labelX: number; labelY: number }> = {
  'Goa': { d: 'M 60 80 L 75 75 L 80 95 L 65 100 Z', labelX: 70, labelY: 90 },
  'Karnataka': { d: 'M 65 100 L 80 95 L 120 85 L 140 100 L 150 140 L 140 180 L 100 190 L 70 170 L 55 140 Z', labelX: 105, labelY: 140 },
  'Telangana': { d: 'M 120 85 L 190 70 L 220 90 L 230 130 L 200 150 L 150 140 L 140 100 Z', labelX: 175, labelY: 110 },
  'Andhra Pradesh': { d: 'M 140 140 L 150 140 L 200 150 L 230 130 L 260 140 L 280 180 L 250 240 L 200 260 L 170 230 L 140 200 L 140 180 Z', labelX: 210, labelY: 195 },
  'Kerala': { d: 'M 100 190 L 120 195 L 130 230 L 125 270 L 110 310 L 95 320 L 90 290 L 85 250 L 90 220 Z', labelX: 108, labelY: 255 },
  'Tamil Nadu': { d: 'M 120 195 L 140 200 L 170 230 L 200 260 L 190 290 L 170 310 L 145 330 L 120 320 L 110 310 L 125 270 L 130 230 Z', labelX: 155, labelY: 275 },
  'Puducherry': { d: 'M 168 265 L 178 262 L 180 272 L 170 275 Z', labelX: 175, labelY: 268 },
};

function getStateColor(score: number): string {
  if (score < 3) return 'hsl(160, 84%, 39%)';
  if (score < 5) return 'hsl(50, 90%, 50%)';
  if (score < 7) return 'hsl(30, 95%, 50%)';
  if (score < 9) return 'hsl(0, 84%, 60%)';
  return 'hsl(263, 70%, 50%)';
}

const MapView: React.FC<MapViewProps> = React.memo(({ predictions, lang, onCitySelect }) => {
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const stateScores = useMemo(() => {
    const scores: Record<string, { avg: number; cities: { name: string; score: number }[] }> = {};
    for (const [city, p] of Object.entries(predictions)) {
      if (!scores[p.state]) scores[p.state] = { avg: 0, cities: [] };
      scores[p.state].cities.push({ name: city, score: p.envScore2025 });
    }
    for (const s of Object.values(scores)) {
      s.avg = s.cities.reduce((a, c) => a + c.score, 0) / s.cities.length;
      s.cities.sort((a, b) => b.score - a.score);
    }
    return scores;
  }, [predictions]);

  const { mostAtRisk, mostImproved } = useMemo(() => {
    const allCities = Object.entries(predictions);
    const sorted = [...allCities].sort((a, b) => b[1].envScore2025 - a[1].envScore2025);
    return {
      mostAtRisk: sorted[0]?.[0] ?? '',
      mostImproved: sorted[sorted.length - 1]?.[0] ?? '',
    };
  }, [predictions]);

  return (
    <div className="space-y-6">
      {/* Badges */}
      <div className="flex flex-wrap gap-3">
        <div className="env-card flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-env-high" />
          <span className="text-sm font-semibold text-foreground">{t(lang, 'mostAtRisk')}: {mostAtRisk}</span>
        </div>
        <div className="env-card flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-env-safe" />
          <span className="text-sm font-semibold text-foreground">{t(lang, 'mostImproved')}: {mostImproved}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SVG Map */}
        <div className="env-card p-2">
          <svg viewBox="40 60 260 280" className="w-full h-auto" style={{ maxHeight: 420 }}>
            {Object.entries(STATE_PATHS).map(([state, { d, labelX, labelY }]) => {
              const score = stateScores[state]?.avg ?? 5;
              return (
                <g key={state} onClick={() => setSelectedState(state === selectedState ? null : state)} className="cursor-pointer">
                  <path
                    d={d}
                    fill={getStateColor(score)}
                    fillOpacity={selectedState === state ? 0.9 : 0.6}
                    stroke="hsl(220, 20%, 18%)"
                    strokeWidth="1.5"
                    style={{ transition: 'fill-opacity 0.3s' }}
                  />
                  <text x={labelX} y={labelY} textAnchor="middle" fill="hsl(210, 40%, 98%)" fontSize="7" fontWeight="700">
                    {state.length > 10 ? state.slice(0, 6) + '..' : state}
                  </text>
                  <text x={labelX} y={labelY + 9} textAnchor="middle" fill="hsl(210, 40%, 98%)" fontSize="6" fontWeight="500">
                    {score.toFixed(1)}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="flex justify-center gap-2 mt-3 flex-wrap">
            {[
              { color: 'bg-env-safe', label: '< 3' },
              { color: 'bg-env-moderate', label: '3-5' },
              { color: 'bg-[hsl(30,95%,50%)]', label: '5-7' },
              { color: 'bg-env-high', label: '7-9' },
              { color: 'bg-env-critical', label: '9+' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <span className={`w-3 h-3 rounded-sm ${l.color}`} />
                <span className="text-xs text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* State Detail */}
        <div className="space-y-3">
          {selectedState && stateScores[selectedState] ? (
            <>
              <h3 className="text-lg font-bold text-foreground">{selectedState}</h3>
              <div className="text-sm text-muted-foreground mb-2">
                Avg ENV Score: {stateScores[selectedState].avg.toFixed(2)}
              </div>
              {stateScores[selectedState].cities.map(c => (
                <button
                  key={c.name}
                  onClick={() => onCitySelect(c.name)}
                  className="env-card w-full text-left flex justify-between items-center hover:border-primary/30 transition-colors"
                >
                  <span className="font-semibold text-foreground">{c.name}</span>
                  <span className={`tabular-nums font-bold ${c.score < 5 ? 'text-env-safe' : c.score < 7 ? 'text-env-moderate' : 'text-env-high'}`}>
                    {c.score.toFixed(1)}
                  </span>
                </button>
              ))}
            </>
          ) : (
            <div className="env-card flex items-center justify-center h-full">
              <p className="text-muted-foreground text-sm">{t(lang, 'selectState')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

MapView.displayName = 'MapView';
export default MapView;
