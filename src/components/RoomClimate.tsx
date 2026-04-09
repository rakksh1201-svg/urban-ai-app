import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { type LangCode } from '../data/languages';
import { Thermometer, Droplets, Wind, Zap, Plus, RefreshCw, Radio, Bluetooth, Wifi, Activity } from 'lucide-react';
import { useSimulatedSensor, useBluetoothSensor, useRealtimeSensor } from '../hooks/useSensors';

interface RoomClimateProps {
  city: string;
  lang: LangCode;
  userId: string | null;
  outdoorTemp?: number;
}

interface ClimateReading {
  id: string;
  room_name: string;
  temperature: number;
  humidity: number;
  comfort_score: number;
  air_quality_index: number | null;
  recommendation: string | null;
  recorded_at: string;
  source?: string;
  device_id?: string | null;
}

function calcComfort(temp: number, humidity: number): number {
  const tempScore = temp >= 22 && temp <= 26 ? 100 : Math.max(0, 100 - Math.abs(temp - 24) * 8);
  const humScore = humidity >= 40 && humidity <= 60 ? 100 : Math.max(0, 100 - Math.abs(humidity - 50) * 2.5);
  return Math.round(tempScore * 0.65 + humScore * 0.35);
}

function getRecommendation(temp: number, humidity: number, outdoorTemp?: number): string {
  const tips: string[] = [];
  if (temp > 30) tips.push('🔴 Room is very hot — turn on AC or fan immediately');
  else if (temp > 28) tips.push('🟠 Room is warm — consider turning on the fan');
  else if (temp < 18) tips.push('🔵 Room is cold — consider closing windows');
  if (humidity > 70) tips.push('💧 High humidity — use a dehumidifier');
  else if (humidity < 30) tips.push('🏜️ Air is very dry — consider a humidifier');
  if (outdoorTemp !== undefined && outdoorTemp < temp - 3) tips.push(`🌬️ It's ${outdoorTemp.toFixed(0)}°C outside — open windows`);
  if (outdoorTemp !== undefined && outdoorTemp > 35) tips.push('☀️ Extreme heat outside — keep windows closed');
  if (tips.length === 0) tips.push('✅ Room conditions are comfortable');
  return tips.join('\n');
}

const comfortLabel = (score: number) => {
  if (score >= 80) return { text: 'Excellent', color: 'text-env-safe', bg: 'bg-env-safe' };
  if (score >= 60) return { text: 'Good', color: 'text-primary', bg: 'bg-primary' };
  if (score >= 40) return { text: 'Fair', color: 'text-accent', bg: 'bg-accent' };
  return { text: 'Poor', color: 'text-env-high', bg: 'bg-env-high' };
};

type SensorMode = 'manual' | 'simulation' | 'bluetooth' | 'iot';

const RoomClimate: React.FC<RoomClimateProps> = ({ city, lang, userId, outdoorTemp }) => {
  const [readings, setReadings] = useState<ClimateReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTemp, setNewTemp] = useState('');
  const [newHumidity, setNewHumidity] = useState('');
  const [newRoom, setNewRoom] = useState('Living Room');
  const [saving, setSaving] = useState(false);

  // Sensor state
  const [sensorMode, setSensorMode] = useState<SensorMode>('manual');
  const [liveTemp, setLiveTemp] = useState<number | null>(null);
  const [liveHumidity, setLiveHumidity] = useState<number | null>(null);
  const [liveAqi, setLiveAqi] = useState<number | null>(null);
  const [liveComfort, setLiveComfort] = useState<number | null>(null);
  const [liveRec, setLiveRec] = useState<string | null>(null);
  const [btStatus, setBtStatus] = useState('');
  const [sensorPulse, setSensorPulse] = useState(false);

  const fetchReadings = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('room_climate')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(20);
    setReadings((data as ClimateReading[] | null) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchReadings(); }, [fetchReadings]);

  // Handle any live sensor reading
  const handleSensorReading = useCallback((reading: { temperature: number; humidity: number; aqi?: number }) => {
    const comfort = calcComfort(reading.temperature, reading.humidity);
    const rec = getRecommendation(reading.temperature, reading.humidity, outdoorTemp);
    setLiveTemp(reading.temperature);
    setLiveHumidity(reading.humidity);
    setLiveAqi(reading.aqi ?? null);
    setLiveComfort(comfort);
    setLiveRec(rec);
    setSensorPulse(true);
    setTimeout(() => setSensorPulse(false), 300);
  }, [outdoorTemp]);

  // Simulation sensor
  useSimulatedSensor(outdoorTemp ?? 28, sensorMode === 'simulation', handleSensorReading);

  // Bluetooth sensor
  const { connect: btConnect, disconnect: btDisconnect, connected: btConnected } = useBluetoothSensor(
    handleSensorReading,
    setBtStatus
  );

  // Realtime IoT from database
  useRealtimeSensor(userId, useCallback((reading) => {
    handleSensorReading(reading);
    // Also refresh the readings list
    fetchReadings();
  }, [handleSensorReading, fetchReadings]));

  // Auto-save simulation readings every 30 seconds
  useEffect(() => {
    if (sensorMode !== 'simulation' || !userId || liveTemp === null || liveHumidity === null) return;

    const interval = setInterval(async () => {
      if (liveTemp === null || liveHumidity === null) return;
      await supabase.from('room_climate').insert({
        user_id: userId,
        room_name: newRoom,
        temperature: liveTemp,
        humidity: liveHumidity,
        comfort_score: liveComfort ?? 50,
        air_quality_index: liveAqi,
        recommendation: liveRec,
        city,
        source: 'simulation',
        device_id: 'sim-sensor-01',
      });
      fetchReadings();
    }, 30000);

    return () => clearInterval(interval);
  }, [sensorMode, userId, liveTemp, liveHumidity, liveComfort, liveAqi, liveRec, city, newRoom, fetchReadings]);

  const handleAdd = useCallback(async () => {
    if (!userId || !newTemp || !newHumidity) return;
    setSaving(true);
    const temp = parseFloat(newTemp);
    const hum = parseFloat(newHumidity);
    const comfort = calcComfort(temp, hum);
    const rec = getRecommendation(temp, hum, outdoorTemp);

    await supabase.from('room_climate').insert({
      user_id: userId,
      room_name: newRoom,
      temperature: temp,
      humidity: hum,
      comfort_score: comfort,
      recommendation: rec,
      city,
      source: 'manual',
    });

    setNewTemp('');
    setNewHumidity('');
    setShowAdd(false);
    setSaving(false);
    fetchReadings();
  }, [userId, newTemp, newHumidity, newRoom, city, outdoorTemp, fetchReadings]);

  // Active live data or last reading
  const displayTemp = liveTemp ?? readings[0]?.temperature ?? null;
  const displayHumidity = liveHumidity ?? readings[0]?.humidity ?? null;
  const displayComfort = liveComfort ?? readings[0]?.comfort_score ?? null;
  const displayAqi = liveAqi ?? readings[0]?.air_quality_index ?? null;
  const displayRec = liveRec ?? readings[0]?.recommendation ?? null;
  const comfort = displayComfort !== null ? comfortLabel(displayComfort) : null;
  const isLive = liveTemp !== null;

  return (
    <div className="space-y-4">
      {/* Comfort Score Hero */}
      {displayComfort !== null ? (
        <div className="env-card relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className={`w-full h-full ${comfort!.bg}`} />
          </div>
          <div className="relative flex flex-col items-center py-4 gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Room Comfort Score
            </span>
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke={`hsl(var(--${displayComfort >= 60 ? 'primary' : displayComfort >= 40 ? 'accent' : 'env-high'}))`}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${(displayComfort / 100) * 327} 327`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-black text-foreground transition-transform ${sensorPulse ? 'scale-110' : ''}`}>
                  {displayComfort}
                </span>
                <span className={`text-xs font-bold ${comfort!.color}`}>{comfort!.text}</span>
              </div>
            </div>
            <span className="text-sm text-muted-foreground">{newRoom} • {city}</span>
          </div>
        </div>
      ) : (
        <div className="env-card text-center py-8">
          <Thermometer className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No room climate data yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Select a sensor source above or add manually</p>
        </div>
      )}

      {/* Live Metrics Grid */}
      {displayTemp !== null && (
        <div className="grid grid-cols-3 gap-2">
          <MetricTile icon={<Thermometer className="w-4 h-4" />} label="Temp" value={`${displayTemp}°`} color="text-env-high" pulse={sensorPulse} />
          <MetricTile icon={<Droplets className="w-4 h-4" />} label="Humidity" value={`${displayHumidity}%`} color="text-primary" pulse={sensorPulse} />
          <MetricTile icon={<Wind className="w-4 h-4" />} label="AQI" value={displayAqi?.toString() ?? '—'} color="text-accent" pulse={sensorPulse} />
        </div>
      )}

      {/* Smart Recommendation */}
      {displayRec && (
        <div className="env-card">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
            <Zap className="w-3.5 h-3.5 inline -mt-0.5 mr-1 text-accent" />
            Smart Recommendations
          </h3>
          <div className="space-y-1.5">
            {displayRec.split('\n').map((line, i) => (
              <p key={i} className="text-sm text-foreground/90">{line}</p>
            ))}
          </div>
        </div>
      )}

      {/* Manual Add (only in manual mode) */}
      {sensorMode === 'manual' && (
        showAdd ? (
          <div className="env-card space-y-3">
            <h3 className="text-sm font-bold text-foreground">Add Room Reading</h3>
            <select value={newRoom} onChange={e => setNewRoom(e.target.value)}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary">
              {['Living Room', 'Bedroom', 'Kitchen', 'Office', 'Balcony'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Temperature (°C)</label>
                <input type="number" step="0.1" value={newTemp} onChange={e => setNewTemp(e.target.value)} placeholder="28.5"
                  className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Humidity (%)</label>
                <input type="number" step="1" value={newHumidity} onChange={e => setNewHumidity(e.target.value)} placeholder="65"
                  className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            {newTemp && newHumidity && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/60">
                <span className="text-xs text-muted-foreground">Comfort preview:</span>
                <span className={`text-sm font-bold ${comfortLabel(calcComfort(parseFloat(newTemp), parseFloat(newHumidity))).color}`}>
                  {calcComfort(parseFloat(newTemp), parseFloat(newHumidity))} — {comfortLabel(calcComfort(parseFloat(newTemp), parseFloat(newHumidity))).text}
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={saving || !newTemp || !newHumidity}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Reading'}
              </button>
              <button onClick={() => setShowAdd(false)}
                className="px-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-semibold">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors">
              <Plus className="w-4 h-4" /> Add Reading
            </button>
            <button onClick={fetchReadings}
              className="px-4 py-3 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )
      )}

      {/* History */}
      {readings.length > 0 && (
        <div className="env-card">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Recent Readings</h3>
          <div className="space-y-2">
            {readings.slice(0, 6).map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  {r.source === 'iot' && <Wifi className="w-3 h-3 text-primary" />}
                  {r.source === 'bluetooth' && <Bluetooth className="w-3 h-3 text-primary" />}
                  {r.source === 'simulation' && <Activity className="w-3 h-3 text-accent" />}
                  {(r.source === 'manual' || !r.source) && <Radio className="w-3 h-3 text-muted-foreground" />}
                  <div>
                    <span className="text-sm font-medium text-foreground">{r.room_name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {new Date(r.recorded_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-env-high font-semibold">{r.temperature}°</span>
                  <span className="text-primary font-semibold">{r.humidity}%</span>
                  <span className={`font-bold ${comfortLabel(r.comfort_score).color}`}>{r.comfort_score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function SensorModeBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-semibold transition-all ${
        active
          ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
          : 'bg-secondary text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MetricTile({ icon, label, value, color, pulse }: { icon: React.ReactNode; label: string; value: string; color: string; pulse?: boolean }) {
  return (
    <div className="env-card flex flex-col items-center gap-1 py-3">
      <span className={color}>{icon}</span>
      <span className={`text-lg font-black text-foreground transition-transform ${pulse ? 'scale-110' : ''}`}>{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}

export default RoomClimate;
