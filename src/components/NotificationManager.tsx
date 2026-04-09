import React, { useState, useEffect, useCallback } from 'react';
import type { CityPrediction } from '../engine/prediction';
import type { LangCode } from '../data/languages';

interface NotificationManagerProps {
  predictions: Record<string, CityPrediction>;
  selectedCity: string;
  lang: LangCode;
}

const NOTIF_KEY = 'enviq_notif_prefs';

const NotificationManager: React.FC<NotificationManagerProps> = ({ predictions, selectedCity, lang }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(40); // ENV score threshold
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    const prefs = localStorage.getItem(NOTIF_KEY);
    if (prefs) {
      const p = JSON.parse(prefs);
      setEnabled(p.enabled);
      setThreshold(p.threshold ?? 40);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      alert('Notifications not supported in this browser');
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      setEnabled(true);
      localStorage.setItem(NOTIF_KEY, JSON.stringify({ enabled: true, threshold }));
    }
  }, [threshold]);

  const toggleNotifications = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(NOTIF_KEY, JSON.stringify({ enabled: next, threshold }));
  }, [enabled, threshold]);

  const updateThreshold = useCallback((val: number) => {
    setThreshold(val);
    localStorage.setItem(NOTIF_KEY, JSON.stringify({ enabled, threshold: val }));
  }, [enabled]);

  // Check for alerts periodically
  useEffect(() => {
    if (!enabled || permission !== 'granted') return;

    const checkAlerts = () => {
      Object.entries(predictions).forEach(([city, pred]) => {
        if (pred.envScore2025 <= threshold) {
          const key = `notif_${city}_${new Date().toDateString()}`;
          if (localStorage.getItem(key)) return;

          new Notification(`⚠️ ENVIQ Alert: ${city}`, {
            body: `Environmental score is ${pred.envScore2025.toFixed(0)}/100 (${pred.riskLevel}). Temperature: ${pred.currentTemp.toFixed(1)}°C, PM2.5: ${pred.currentPM25.toFixed(0)}µg/m³`,
            icon: '/icon-192.png',
            tag: `enviq-${city}`,
          });
          localStorage.setItem(key, '1');
        }
      });
      setLastChecked(new Date().toLocaleTimeString());
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, 5 * 60 * 1000); // Every 5 min
    return () => clearInterval(interval);
  }, [enabled, permission, predictions, threshold]);

  // Get critical cities count
  const criticalCities = Object.entries(predictions).filter(([, p]) => p.envScore2025 <= threshold);

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">🔔 Push Notifications</h3>
        {permission === 'granted' && (
          <button
            onClick={toggleNotifications}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
              enabled ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {enabled ? 'ON' : 'OFF'}
          </button>
        )}
      </div>

      {permission === 'default' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Get notified when environmental conditions reach critical levels in your cities.
          </p>
          <button
            onClick={requestPermission}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Enable Notifications
          </button>
        </div>
      )}

      {permission === 'denied' && (
        <p className="text-sm text-destructive">
          Notifications are blocked. Please enable them in your browser settings.
        </p>
      )}

      {permission === 'granted' && (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground block mb-2">
              Alert when ENV score drops below: <span className="text-foreground font-bold">{threshold}</span>
            </label>
            <input
              type="range"
              min={10}
              max={70}
              value={threshold}
              onChange={(e) => updateThreshold(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>10 (Critical only)</span>
              <span>70 (Most cities)</span>
            </div>
          </div>

          {criticalCities.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3">
              <p className="text-sm font-semibold text-destructive mb-2">
                {criticalCities.length} cities below threshold:
              </p>
              <div className="flex flex-wrap gap-1">
                {criticalCities.slice(0, 10).map(([city, pred]) => (
                  <span key={city} className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-lg">
                    {city} ({pred.envScore2025.toFixed(0)})
                  </span>
                ))}
                {criticalCities.length > 10 && (
                  <span className="text-xs text-muted-foreground">+{criticalCities.length - 10} more</span>
                )}
              </div>
            </div>
          )}

          {lastChecked && (
            <p className="text-xs text-muted-foreground">Last checked: {lastChecked}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationManager;
