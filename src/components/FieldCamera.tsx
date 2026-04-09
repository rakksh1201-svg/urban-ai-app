import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { t, type LangCode } from '../data/languages';

interface FieldCameraProps {
  city: string;
  envScore: number;
  lang: LangCode;
  userId: string | null;
}

interface PendingPhoto {
  id: string;
  dataUrl: string;
  city: string;
  description: string;
  envScore: number;
  timestamp: string;
  synced: boolean;
}

const FieldCamera: React.FC<FieldCameraProps> = React.memo(({ city, envScore, lang, userId }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [description, setDescription] = useState('');
  const [streaming, setStreaming] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStreaming(true);
      setIsCapturing(true);
    } catch (err) {
      console.error('Camera access denied:', err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStreaming(false);
    setIsCapturing(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    // Add overlay stamp
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 16px system-ui';
    ctx.fillText(`ENVIQ AI • ${city} • ENV Score: ${envScore.toFixed(1)}`, 12, canvas.height - 35);
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '12px system-ui';
    ctx.fillText(new Date().toLocaleString(), 12, canvas.height - 14);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const newPhoto: PendingPhoto = {
      id: crypto.randomUUID(),
      dataUrl,
      city,
      description: description || `Field observation at ${city}`,
      envScore,
      timestamp: new Date().toISOString(),
      synced: false,
    };
    setPhotos(prev => [newPhoto, ...prev]);
    setDescription('');
  }, [city, envScore, description]);

  const syncPhoto = useCallback(async (photo: PendingPhoto) => {
    if (!userId) return;
    try {
      // Convert data URL to blob
      const res = await fetch(photo.dataUrl);
      const blob = await res.blob();
      const filePath = `${userId}/${photo.id}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('field-photos')
        .upload(filePath, blob, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('field-photos').getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('field_photos').insert({
        user_id: userId,
        city: photo.city,
        description: photo.description,
        photo_url: urlData.publicUrl,
        env_score_at_capture: photo.envScore,
        captured_at: photo.timestamp,
        synced: true,
      });
      if (dbError) throw dbError;

      setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, synced: true } : p));
    } catch (err) {
      console.error('Sync failed:', err);
    }
  }, [userId]);

  const syncAll = useCallback(async () => {
    const unsynced = photos.filter(p => !p.synced);
    for (const photo of unsynced) {
      await syncPhoto(photo);
    }
  }, [photos, syncPhoto]);

  const unsyncedCount = photos.filter(p => !p.synced).length;

  return (
    <div className="space-y-4">
      {/* Camera Controls */}
      <div className="env-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground">📷 Field Camera</h3>
          <div className="flex gap-2">
            {!isCapturing ? (
              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs"
              >
                Open Camera
              </button>
            ) : (
              <>
                <button
                  onClick={capturePhoto}
                  className="px-4 py-2 rounded-xl bg-env-safe text-background font-semibold text-xs"
                >
                  📸 Capture
                </button>
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 rounded-xl bg-env-high text-background font-semibold text-xs"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>

        {streaming && (
          <div className="space-y-3">
            <video ref={videoRef} className="w-full rounded-xl bg-secondary" playsInline muted />
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe what you see (heat damage, pollution, vegetation loss...)"
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-2 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Sync Bar */}
      {photos.length > 0 && (
        <div className="env-card flex items-center justify-between">
          <span className="text-sm text-foreground">
            {photos.length} photos • {unsyncedCount} pending sync
          </span>
          {unsyncedCount > 0 && userId && (
            <button
              onClick={syncAll}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs"
            >
              ☁️ Sync All
            </button>
          )}
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {photos.map(photo => (
            <div key={photo.id} className="relative rounded-xl overflow-hidden">
              <img src={photo.dataUrl} alt={photo.description} className="w-full aspect-video object-cover" />
              <div className="absolute top-2 right-2">
                <span className={`env-badge text-xs ${photo.synced ? 'bg-env-safe text-background' : 'bg-env-moderate text-background'}`}>
                  {photo.synced ? '☁️ Synced' : '📱 Local'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

FieldCamera.displayName = 'FieldCamera';
export default FieldCamera;
