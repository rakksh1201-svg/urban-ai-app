import React, { useState, useEffect, useMemo } from 'react';
import { type LangCode, t } from '../data/languages';
import { HISTORICAL_DATA } from '../data/historicalData';
import { computeAllPredictions } from '../engine/prediction';
import { Thermometer, Droplets, Wind, Eye, MapPin, TrendingUp, Clock } from 'lucide-react';

interface RoomReadingProps {
  city: string;
  lang: LangCode;
}

interface Reading {
  metric: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'stable';
}

const RoomReading: React.FC<RoomReadingProps> = ({ city, lang }) => {
  const predictions = useMemo(() => computeAllPredictions(), []);
  const prediction = predictions[city];
  const cityData = HISTORICAL_DATA[city];

  const [readings, setReadings] = useState<Reading[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!prediction || !cityData) return;

    // Calculate trends
    const tempTrend = prediction.temp2025 > prediction.temp2020 ? 'up' : prediction.temp2025 < prediction.temp2020 ? 'down' : 'stable';
    const aqi = Math.round(prediction.pm25_2025 / 10);
    const aqiTrend = aqi > (Math.round(prediction.pm25_2020 / 10)) ? 'up' : 'down';

    const newReadings: Reading[] = [
      {
        metric: 'Temperature',
        value: `${prediction.temp2025.toFixed(1)}°C`,
        icon: <Thermometer className="w-5 h-5" />,
        color: 'text-red-500',
        trend: tempTrend as 'up' | 'down' | 'stable',
      },
      {
        metric: 'Humidity',
        value: `${(50 + Math.random() * 30).toFixed(0)}%`,
        icon: <Droplets className="w-5 h-5" />,
        color: 'text-blue-500',
        trend: 'stable',
      },
      {
        metric: 'Air Quality (AQI)',
        value: aqi.toString(),
        icon: <Wind className="w-5 h-5" />,
        color: aqi > 100 ? 'text-red-500' : aqi > 50 ? 'text-yellow-500' : 'text-green-500',
        trend: aqiTrend as 'up' | 'down',
      },
      {
        metric: 'Visibility',
        value: `${(5 + cityData.pm25[0] / 50).toFixed(1)} km`,
        icon: <Eye className="w-5 h-5" />,
        color: 'text-purple-500',
        trend: 'stable',
      },
    ];

    setReadings(newReadings);
    setLastUpdate(new Date());
  }, [city, prediction, cityData]);

  if (!prediction || !cityData) {
    return (
      <div className="env-card text-center py-12">
        <MapPin className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Location Header */}
      <div className="env-card">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">{city}</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {cityData.state} • {cityData.regionType}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black text-primary mb-1">
              {prediction.temp2025.toFixed(1)}°
            </div>
            <p className="text-xs text-muted-foreground">Current</p>
          </div>
        </div>

        {/* Update time */}
        {lastUpdate && (
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Live Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {readings.map((reading, idx) => (
          <div key={idx} className="env-card">
            <div className="flex items-start justify-between mb-2">
              <span className={`${reading.color}`}>{reading.icon}</span>
              {reading.trend && (
                <span className={`text-xs font-bold ${reading.trend === 'up' ? 'text-red-500' : reading.trend === 'down' ? 'text-green-500' : 'text-gray-500'}`}>
                  {reading.trend === 'up' ? '↑' : reading.trend === 'down' ? '↓' : '→'}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-1">{reading.metric}</p>
            <p className={`text-2xl font-bold ${reading.color}`}>{reading.value}</p>
          </div>
        ))}
      </div>

      {/* Environmental Score */}
      <div className="env-card">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Environmental Score
        </h3>
        <div className="space-y-2.5">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-semibold text-foreground">Air Quality</span>
              <span className="text-sm font-bold text-primary">{Math.round(prediction.pm25_2025 * 0.8)}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-primary rounded-full h-2" style={{ width: `${Math.min(100, (prediction.pm25_2025 * 0.8) / 2)}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-semibold text-foreground">Green Coverage</span>
              <span className="text-sm font-bold text-green-500">{cityData.greenCoverPct[cityData.greenCoverPct.length - 1]}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-green-500 rounded-full h-2" style={{ width: `${cityData.greenCoverPct[cityData.greenCoverPct.length - 1]}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-semibold text-foreground">Urban Heat Island</span>
              <span className="text-sm font-bold text-orange-500">{(prediction.uhi_2025 * 10).toFixed(1)}°</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-orange-500 rounded-full h-2" style={{ width: `${Math.min(100, (prediction.uhi_2025 * 10) * 5)}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Temperature Trend */}
      <div className="env-card">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Temperature Trend (2020-2025)
        </h3>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground w-16">2020:</span>
            <span className="text-lg font-bold text-foreground">{prediction.temp2020.toFixed(1)}°C</span>
          </div>
          <div className="h-1 bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500 rounded-full"></div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground w-16">2025:</span>
            <span className="text-lg font-bold text-red-500">{prediction.temp2025.toFixed(1)}°C</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <span className="font-semibold text-red-500">+{(prediction.temp2025 - prediction.temp2020).toFixed(2)}°C</span> increase in 5 years
          </p>
        </div>
      </div>

      {/* City Statistics */}
      <div className="env-card">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          City Information
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Population</span>
            <span className="font-semibold">{cityData.population} lakhs</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Region Type</span>
            <span className="font-semibold capitalize">{cityData.regionType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Coordinates</span>
            <span className="font-semibold text-xs">{cityData.lat.toFixed(2)}°N, {cityData.lng.toFixed(2)}°E</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Annual Rainfall</span>
            <span className="font-semibold">{(cityData.rainfall_mm[cityData.rainfall_mm.length - 1] / 10).toFixed(1)}mm</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomReading;
