import React, { useState } from 'react';
import { type LangCode, t } from '../data/languages';
import { Bell, AlertTriangle, Thermometer, Wind, Zap, Save, Plus, Trash2 } from 'lucide-react';

interface AlertsSetupProps {
  city: string;
  lang: LangCode;
}

interface Alert {
  id: string;
  type: 'temperature' | 'aqi' | 'humidity';
  condition: 'above' | 'below';
  value: number;
  enabled: boolean;
}

const AlertsSetup: React.FC<AlertsSetupProps> = ({ city, lang }) => {
  const [alerts, setAlerts] = useState<Alert[]>([
    { id: '1', type: 'temperature', condition: 'above', value: 35, enabled: true },
    { id: '2', type: 'aqi', condition: 'above', value: 100, enabled: true },
  ]);

  const [newAlert, setNewAlert] = useState({
    type: 'temperature' as const,
    condition: 'above' as const,
    value: 30,
  });

  const [saving, setSaving] = useState(false);

  const handleAddAlert = () => {
    if (!newAlert.value || newAlert.value < 0) return;

    const alert: Alert = {
      id: Date.now().toString(),
      ...newAlert,
      enabled: true,
    };

    setAlerts([...alerts, alert]);
    setNewAlert({ type: 'temperature', condition: 'above', value: 30 });
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const handleToggleAlert = (id: string) => {
    setAlerts(alerts.map(a => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 500));
    setSaving(false);
  };

  const getMetricIcon = (type: Alert['type']) => {
    switch (type) {
      case 'temperature':
        return <Thermometer className="w-5 h-5" />;
      case 'aqi':
        return <Wind className="w-5 h-5" />;
      case 'humidity':
        return <Zap className="w-5 h-5" />;
    }
  };

  const getMetricLabel = (type: Alert['type']) => {
    switch (type) {
      case 'temperature':
        return 'Temperature';
      case 'aqi':
        return 'Air Quality Index';
      case 'humidity':
        return 'Humidity';
    }
  };

  const getMetricUnit = (type: Alert['type']) => {
    switch (type) {
      case 'temperature':
        return '°C';
      case 'aqi':
        return '';
      case 'humidity':
        return '%';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="env-card">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Alert Settings</h2>
            <p className="text-xs text-muted-foreground">{city} • Manage environmental alerts</p>
          </div>
        </div>
      </div>

      {/* Add New Alert */}
      <div className="env-card">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Add New Alert
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Metric</label>
              <select
                value={newAlert.type}
                onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value as Alert['type'] })}
                className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="temperature">Temperature</option>
                <option value="aqi">Air Quality</option>
                <option value="humidity">Humidity</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Condition</label>
              <select
                value={newAlert.condition}
                onChange={(e) => setNewAlert({ ...newAlert, condition: e.target.value as 'above' | 'below' })}
                className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Value</label>
              <input
                type="number"
                value={newAlert.value}
                onChange={(e) => setNewAlert({ ...newAlert, value: parseInt(e.target.value) || 0 })}
                className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <button
            onClick={handleAddAlert}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add Alert
          </button>
        </div>
      </div>

      {/* Active Alerts */}
      <div className="env-card">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Active Alerts ({alerts.filter(a => a.enabled).length})
        </h3>

        {alerts.length === 0 ? (
          <div className="text-center py-6">
            <AlertTriangle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No alerts configured</p>
            <p className="text-xs text-muted-foreground/60">Add alerts to get notified about environmental changes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/60 border border-border"
              >
                <input
                  type="checkbox"
                  checked={alert.enabled}
                  onChange={() => handleToggleAlert(alert.id)}
                  className="w-4 h-4 rounded border-border bg-secondary"
                />

                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${alert.enabled ? 'bg-primary/20 text-primary' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                  {getMetricIcon(alert.type)}
                </div>

                <div className="flex-1">
                  <p className={`text-sm font-semibold ${alert.enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {getMetricLabel(alert.type)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Alert when {alert.condition} {alert.value}{getMetricUnit(alert.type)}
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notification Preferences */}
      <div className="env-card">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Notification Preferences
        </h3>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Push Notifications</p>
              <p className="text-xs text-muted-foreground">Get alerts on your device</p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 rounded border-border bg-secondary"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Email Notifications</p>
              <p className="text-xs text-muted-foreground">Receive alerts via email</p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 rounded border-border bg-secondary"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Sound Alerts</p>
              <p className="text-xs text-muted-foreground">Play sound for critical alerts</p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 rounded border-border bg-secondary"
            />
          </div>
        </div>
      </div>

      {/* Quick Settings */}
      <div className="env-card">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Quick Settings
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button className="py-2.5 rounded-lg bg-secondary text-foreground font-semibold text-sm hover:bg-secondary/80 transition-colors">
            🌡️ Heat Alert
          </button>
          <button className="py-2.5 rounded-lg bg-secondary text-foreground font-semibold text-sm hover:bg-secondary/80 transition-colors">
            💨 AQI Alert
          </button>
          <button className="py-2.5 rounded-lg bg-secondary text-foreground font-semibold text-sm hover:bg-secondary/80 transition-colors">
            💧 Humidity Alert
          </button>
          <button className="py-2.5 rounded-lg bg-secondary text-foreground font-semibold text-sm hover:bg-secondary/80 transition-colors">
            🌧️ Rain Alert
          </button>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
};

export default AlertsSetup;
