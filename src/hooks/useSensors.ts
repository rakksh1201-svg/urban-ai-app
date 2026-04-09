import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '../integrations/supabase/client';

interface SensorReading {
  temperature: number;
  humidity: number;
  aqi?: number;
  source: 'simulation' | 'bluetooth' | 'iot';
  deviceName?: string;
}

/** Realistic temperature simulation with natural fluctuations */
export function useSimulatedSensor(
  baseTemp: number,
  enabled: boolean,
  onReading: (reading: SensorReading) => void
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef(Math.random() * Math.PI * 2);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const tick = () => {
      phaseRef.current += 0.15;
      const t = phaseRef.current;

      // Natural fluctuation: sine wave + small random noise
      const tempVariation = Math.sin(t) * 1.5 + Math.sin(t * 2.3) * 0.5 + (Math.random() - 0.5) * 0.3;
      const humVariation = Math.cos(t * 0.7) * 5 + (Math.random() - 0.5) * 2;

      const temperature = Math.round((baseTemp + tempVariation) * 10) / 10;
      const humidity = Math.round(Math.max(20, Math.min(95, 55 + humVariation)));
      const aqi = Math.round(Math.max(10, Math.min(200, 60 + Math.sin(t * 0.3) * 30 + (Math.random() - 0.5) * 10)));

      onReading({ temperature, humidity, aqi, source: 'simulation', deviceName: 'Simulated Sensor' });
    };

    tick(); // Immediate first reading
    intervalRef.current = setInterval(tick, 3000); // Every 3 seconds

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, baseTemp, onReading]);
}

/** Web Bluetooth API for BLE temperature/humidity sensors */
export function useBluetoothSensor(
  onReading: (reading: SensorReading) => void,
  onStatus: (status: string) => void
) {
  const deviceRef = useRef<any>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(async () => {
    try {
      onStatus('Scanning for sensors...');

      // Environmental Sensing Service UUID
      const ENV_SENSING_UUID = '0000181a-0000-1000-8000-00805f9b34fb';
      const TEMP_CHAR_UUID = '00002a6e-0000-1000-8000-00805f9b34fb';
      const HUMIDITY_CHAR_UUID = '00002a6f-0000-1000-8000-00805f9b34fb';

      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: [ENV_SENSING_UUID] }],
        optionalServices: [ENV_SENSING_UUID],
      });

      deviceRef.current = device;
      onStatus(`Connecting to ${device.name || 'sensor'}...`);

      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService(ENV_SENSING_UUID);

      // Read temperature
      try {
        const tempChar = await service.getCharacteristic(TEMP_CHAR_UUID);
        await tempChar.startNotifications();
        tempChar.addEventListener('characteristicvaluechanged', (event: any) => {
          const value = event.target.value;
          const temp = value.getInt16(0, true) / 100;

          onReading({
            temperature: Math.round(temp * 10) / 10,
            humidity: 50, // Will be updated by humidity characteristic
            source: 'bluetooth',
            deviceName: device.name || 'BLE Sensor',
          });
        });
      } catch {
        console.warn('Temperature characteristic not available');
      }

      // Read humidity
      try {
        const humChar = await service.getCharacteristic(HUMIDITY_CHAR_UUID);
        await humChar.startNotifications();
        humChar.addEventListener('characteristicvaluechanged', (event: any) => {
          const value = event.target.value;
          const hum = value.getUint16(0, true) / 100;

          onReading({
            temperature: 25, // Will be combined with temp reading
            humidity: Math.round(hum),
            source: 'bluetooth',
            deviceName: device.name || 'BLE Sensor',
          });
        });
      } catch {
        console.warn('Humidity characteristic not available');
      }

      setConnected(true);
      onStatus(`Connected to ${device.name || 'sensor'}`);

      device.addEventListener('gattserverdisconnected', () => {
        setConnected(false);
        onStatus('Sensor disconnected');
      });
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        onStatus('No sensor found nearby');
      } else {
        onStatus(`Error: ${err.message}`);
      }
      setConnected(false);
    }
  }, [onReading, onStatus]);

  const disconnect = useCallback(() => {
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    setConnected(false);
  }, []);

  return { connect, disconnect, connected };
}

/** Subscribe to realtime IoT updates from the database */
export function useRealtimeSensor(
  userId: string | null,
  onReading: (reading: SensorReading & { room_name: string; comfort_score: number; recommendation: string | null }) => void
) {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('room-climate-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_climate',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row.source === 'iot' || row.source === 'bluetooth') {
            onReading({
              temperature: row.temperature,
              humidity: row.humidity,
              aqi: row.air_quality_index,
              source: row.source,
              deviceName: row.device_id,
              room_name: row.room_name,
              comfort_score: row.comfort_score,
              recommendation: row.recommendation,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onReading]);
}
