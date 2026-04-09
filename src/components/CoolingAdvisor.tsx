import React, { useState, useMemo, useCallback } from 'react';
import { t, type LangCode } from '../data/languages';
import type { CityPrediction } from '../engine/prediction';

interface CoolingAdvisorProps {
  city: string;
  prediction: CityPrediction;
  lang: LangCode;
}

type BuildingType = 'residential' | 'commercial' | 'industrial' | 'government';
type RoofType = 'concrete' | 'metal' | 'tile' | 'green';

interface Intervention {
  name: string;
  tempReduction: number;
  acCostCut: number;
  co2Saved: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  cost: 'Low' | 'Medium' | 'High';
}

const INTERVENTIONS: Record<string, Intervention> = {
  coolRoof: { name: 'Cool Roof Coating', tempReduction: 2.5, acCostCut: 20, co2Saved: 1.2, difficulty: 'Easy', cost: 'Low' },
  greenRoof: { name: 'Green Roof Installation', tempReduction: 3.5, acCostCut: 30, co2Saved: 2.5, difficulty: 'Hard', cost: 'High' },
  shadingDevices: { name: 'External Shading Devices', tempReduction: 1.8, acCostCut: 15, co2Saved: 0.8, difficulty: 'Easy', cost: 'Low' },
  naturalVent: { name: 'Natural Ventilation Design', tempReduction: 2.0, acCostCut: 25, co2Saved: 1.5, difficulty: 'Medium', cost: 'Medium' },
  thermalMass: { name: 'Thermal Mass Walls', tempReduction: 2.8, acCostCut: 22, co2Saved: 1.8, difficulty: 'Hard', cost: 'High' },
  treePlanting: { name: 'Perimeter Tree Planting', tempReduction: 1.5, acCostCut: 10, co2Saved: 3.0, difficulty: 'Easy', cost: 'Low' },
  reflectivePaint: { name: 'Reflective Wall Paint', tempReduction: 1.2, acCostCut: 8, co2Saved: 0.5, difficulty: 'Easy', cost: 'Low' },
  radiantBarrier: { name: 'Radiant Barrier in Attic', tempReduction: 2.2, acCostCut: 18, co2Saved: 1.0, difficulty: 'Medium', cost: 'Medium' },
};

const CoolingAdvisor: React.FC<CoolingAdvisorProps> = React.memo(({ city, prediction, lang }) => {
  const [buildingType, setBuildingType] = useState<BuildingType>('residential');
  const [floorCount, setFloorCount] = useState(2);
  const [roofType, setRoofType] = useState<RoofType>('concrete');

  const handleFloorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFloorCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)));
  }, []);

  const results = useMemo(() => {
    // Calculate cooling potential based on inputs
    const roofMultiplier = { concrete: 1.0, metal: 1.3, tile: 0.8, green: 0.4 }[roofType];
    const typeMultiplier = { residential: 1.0, commercial: 1.2, industrial: 1.4, government: 1.1 }[buildingType];
    const floorFactor = Math.max(0.3, 1 - (floorCount - 1) * 0.05);

    const coolingPotential = Math.min(10, prediction.envScore2025 * roofMultiplier * typeMultiplier * floorFactor);

    // Rank interventions
    let ranked = Object.values(INTERVENTIONS)
      .map(iv => ({
        ...iv,
        tempReduction: iv.tempReduction * typeMultiplier * floorFactor,
        acCostCut: iv.acCostCut * roofMultiplier,
        co2Saved: iv.co2Saved * prediction.population * 0.1,
      }))
      .sort((a, b) => (b.tempReduction + b.acCostCut * 0.1) - (a.tempReduction + a.acCostCut * 0.1))
      .slice(0, 5);

    const totalTempReduction = ranked.reduce((s, r) => s + r.tempReduction, 0) / ranked.length;
    const totalACCut = ranked.reduce((s, r) => s + r.acCostCut, 0) / ranked.length;
    const totalCO2 = ranked.reduce((s, r) => s + r.co2Saved, 0);

    return { coolingPotential, ranked, totalTempReduction, totalACCut, totalCO2 };
  }, [buildingType, floorCount, roofType, prediction]);

  const buildingTypes: BuildingType[] = ['residential', 'commercial', 'industrial', 'government'];
  const roofTypes: RoofType[] = ['concrete', 'metal', 'tile', 'green'];
  const difficultyColors: Record<string, string> = { Easy: 'text-env-safe', Medium: 'text-env-moderate', Hard: 'text-env-high' };

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="env-card">
          <label className="env-label">{t(lang, 'buildingType')}</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {buildingTypes.map(bt => (
              <button
                key={bt}
                onClick={() => setBuildingType(bt)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  buildingType === bt ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {t(lang, bt)}
              </button>
            ))}
          </div>
        </div>
        <div className="env-card">
          <label className="env-label">{t(lang, 'floorCount')}</label>
          <input
            type="number"
            value={floorCount}
            onChange={handleFloorChange}
            min={1}
            max={50}
            className="mt-2 w-full bg-secondary text-foreground rounded-xl px-3 py-2 text-sm font-semibold border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="env-card">
          <label className="env-label">{t(lang, 'roofType')}</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {roofTypes.map(rt => (
              <button
                key={rt}
                onClick={() => setRoofType(rt)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  roofType === rt ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {t(lang, rt)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cooling Potential Score */}
      <div className="env-card flex flex-col items-center py-6">
        <span className="env-label">{t(lang, 'coolingPotential')}</span>
        <div className="env-score text-primary mt-2">{results.coolingPotential.toFixed(1)}</div>
        <span className="text-sm text-muted-foreground">/ 10</span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="env-card text-center">
          <span className="env-label">{t(lang, 'tempReduction')}</span>
          <div className="text-xl font-bold text-env-safe mt-1">-{results.totalTempReduction.toFixed(1)}°C</div>
        </div>
        <div className="env-card text-center">
          <span className="env-label">{t(lang, 'acCostCut')}</span>
          <div className="text-xl font-bold text-env-moderate mt-1">{results.totalACCut.toFixed(0)}%</div>
        </div>
        <div className="env-card text-center">
          <span className="env-label">{t(lang, 'co2Saved')}</span>
          <div className="text-xl font-bold text-primary mt-1">{results.totalCO2.toFixed(0)} T</div>
        </div>
      </div>

      {/* Ranked Interventions */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-3">{t(lang, 'interventions')}</h3>
        <div className="space-y-2">
          {results.ranked.map((iv, i) => (
            <div key={iv.name} className="env-card flex items-center gap-4">
              <span className="text-2xl font-black text-muted-foreground tabular-nums w-8">#{i + 1}</span>
              <div className="flex-1">
                <div className="font-semibold text-foreground text-sm">{iv.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  -{iv.tempReduction.toFixed(1)}°C · {iv.acCostCut.toFixed(0)}% AC cut · {iv.co2Saved.toFixed(1)}T CO₂
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs font-semibold ${difficultyColors[iv.difficulty]}`}>{iv.difficulty}</span>
                <div className="text-xs text-muted-foreground">{iv.cost} cost</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

CoolingAdvisor.displayName = 'CoolingAdvisor';
export default CoolingAdvisor;
