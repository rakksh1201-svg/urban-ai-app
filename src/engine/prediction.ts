import { HISTORICAL_DATA, SEASONAL_FACTORS, type CityData } from '../data/historicalData';

// Linear regression from scratch
export function linearRegress(years: number[], values: number[]) {
  const n = years.length;
  const sumX = years.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = years.reduce((s, x, i) => s + x * values[i], 0);
  const sumX2 = years.reduce((s, x) => s + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return {
    slope,
    intercept,
    predict: (yr: number) => slope * yr + intercept,
  };
}

const YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

export interface CityPrediction {
  city: string;
  state: string;
  regionType: string;
  population: number;
  // Current simulated
  currentTemp: number;
  currentPM25: number;
  currentUHI: number;
  currentGreenCover: number;
  currentRainfall: number;
  // Predictions
  temp2025: number; temp2027: number; temp2030: number;
  pm25_2025: number; pm25_2027: number; pm25_2030: number;
  uhi2025: number; uhi2027: number; uhi2030: number;
  greenCover2025: number; greenCover2027: number; greenCover2030: number;
  rainfall2025: number; rainfall2027: number; rainfall2030: number;
  // ENV Score
  envScore2025: number; envScore2027: number; envScore2030: number;
  breakingPointYear: number | null;
  // Regressions for charting
  tempRegress: ReturnType<typeof linearRegress>;
  pm25Regress: ReturnType<typeof linearRegress>;
  uhiRegress: ReturnType<typeof linearRegress>;
  rainfallRegress: ReturnType<typeof linearRegress>;
  greenCoverRegress: ReturnType<typeof linearRegress>;
  // Risk
  riskLevel: 'safe' | 'moderate' | 'high' | 'critical' | 'emergency';
  feelsLike: number;
  // Impact
  citizensAtRisk: number; // in lakhs
  economicLossPerYear: number; // ₹ crore
  co2SavedPotential: number; // tonnes
  tempReductionPossible: number; // °C
}

// Normalization helpers
function norm(val: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (val - min) / (max - min)));
}

function calcEnvScore(temp: number, pm25: number, uhi: number, greenCover: number, rainfall: number): number {
  const heatRiskNorm = norm(temp, 30, 45);
  const pm25Norm = norm(pm25, 20, 200);
  const uhiDeltaNorm = norm(uhi, 0, 6);
  const greenCoverInv = 1 - norm(greenCover, 5, 50);
  const rainfallInv = 1 - norm(rainfall, 400, 4000);
  return (
    heatRiskNorm * 0.35 +
    pm25Norm * 0.30 +
    uhiDeltaNorm * 0.20 +
    greenCoverInv * 0.10 +
    rainfallInv * 0.05
  ) * 10;
}

function calcFeelsLike(temp: number, humidity: number = 65): number {
  // Simplified heat index
  if (temp < 27) return temp;
  return -8.785 + 1.611 * temp + 2.339 * humidity - 0.146 * temp * humidity
    - 0.013 * temp * temp - 0.016 * humidity * humidity
    + 0.002 * temp * temp * humidity + 0.001 * temp * humidity * humidity
    - 0.000004 * temp * temp * humidity * humidity;
}

function getRiskLevel(score: number): CityPrediction['riskLevel'] {
  if (score < 3) return 'safe';
  if (score < 5) return 'moderate';
  if (score < 7) return 'high';
  if (score < 9) return 'critical';
  return 'emergency';
}

export function computeAllPredictions(): Record<string, CityPrediction> {
  const results: Record<string, CityPrediction> = {};

  for (const [city, data] of Object.entries(HISTORICAL_DATA)) {
    const tempR = linearRegress(YEARS, data.temps);
    const pm25R = linearRegress(YEARS, data.pm25);
    const uhiR = linearRegress(YEARS, data.uhi);
    const rainfallR = linearRegress(YEARS, data.rainfall_mm);
    const greenR = linearRegress(YEARS, data.greenCoverPct);

    const predict = (r: ReturnType<typeof linearRegress>, yr: number) => r.predict(yr);

    const t25 = predict(tempR, 2025); const t27 = predict(tempR, 2027); const t30 = predict(tempR, 2030);
    const p25 = predict(pm25R, 2025); const p27 = predict(pm25R, 2027); const p30 = predict(pm25R, 2030);
    const u25 = predict(uhiR, 2025); const u27 = predict(uhiR, 2027); const u30 = predict(uhiR, 2030);
    const g25 = predict(greenR, 2025); const g27 = predict(greenR, 2027); const g30 = predict(greenR, 2030);
    const r25 = predict(rainfallR, 2025); const r27 = predict(rainfallR, 2027); const r30 = predict(rainfallR, 2030);

    const es25 = calcEnvScore(t25, p25, u25, g25, r25);
    const es27 = calcEnvScore(t27, p27, u27, g27, r27);
    const es30 = calcEnvScore(t30, p30, u30, g30, r30);

    // Find breaking point year
    let breakingPointYear: number | null = null;
    for (let yr = 2025; yr <= 2060; yr++) {
      const score = calcEnvScore(
        predict(tempR, yr), predict(pm25R, yr), predict(uhiR, yr),
        predict(greenR, yr), predict(rainfallR, yr)
      );
      if (score >= 9.0) { breakingPointYear = yr; break; }
    }

    // Simulated "live" data with seasonal adjustment
    const month = new Date().getMonth();
    const seasonDelta = SEASONAL_FACTORS[data.regionType]?.[month] ?? 0;
    const noise = (Math.random() - 0.5) * 0.8;
    const currentTemp = data.temps[9] + seasonDelta + noise;

    const envScore = es25;
    const riskLevel = getRiskLevel(envScore);

    // Impact metrics
    const riskFraction = riskLevel === 'safe' ? 0.05 : riskLevel === 'moderate' ? 0.15 : riskLevel === 'high' ? 0.35 : riskLevel === 'critical' ? 0.55 : 0.75;
    const citizensAtRisk = data.population * riskFraction;
    const economicLossPerYear = Math.round(data.population * tempR.slope * 12);
    const tempReductionPossible = data.regionType === 'coastal' ? 2.5 : data.regionType === 'highland' ? 3.0 : 2.0;
    const co2SavedPotential = Math.round(data.population * 0.8 * tempReductionPossible * 10);

    results[city] = {
      city, state: data.state, regionType: data.regionType, population: data.population,
      currentTemp,
      currentPM25: data.pm25[9] * (0.9 + Math.random() * 0.2),
      currentUHI: data.uhi[9] + Math.random() * 0.3,
      currentGreenCover: data.greenCoverPct[9],
      currentRainfall: data.rainfall_mm[9],
      temp2025: t25, temp2027: t27, temp2030: t30,
      pm25_2025: p25, pm25_2027: p27, pm25_2030: p30,
      uhi2025: u25, uhi2027: u27, uhi2030: u30,
      greenCover2025: g25, greenCover2027: g27, greenCover2030: g30,
      rainfall2025: r25, rainfall2027: r27, rainfall2030: r30,
      envScore2025: es25, envScore2027: es27, envScore2030: es30,
      breakingPointYear,
      tempRegress: tempR, pm25Regress: pm25R, uhiRegress: uhiR,
      rainfallRegress: rainfallR, greenCoverRegress: greenR,
      riskLevel,
      feelsLike: calcFeelsLike(currentTemp),
      citizensAtRisk, economicLossPerYear, co2SavedPotential, tempReductionPossible,
    };
  }

  return results;
}

export { calcEnvScore, getRiskLevel, YEARS };
