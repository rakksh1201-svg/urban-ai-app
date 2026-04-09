import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { t, type LangCode, LANG_NAMES } from '../data/languages';
import { User, Mail, Building2, Shield, Globe, Bell, Moon, Image, MapPin, Calendar } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface ProfileProps {
  lang: LangCode;
  onLangChange: (lang: LangCode) => void;
}

interface FieldPhoto {
  id: string;
  city: string;
  description: string | null;
  photo_url: string | null;
  env_score_at_capture: number | null;
  captured_at: string;
}

const Profile: React.FC<ProfileProps> = ({ lang, onLangChange }) => {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [organization, setOrganization] = useState('');
  const [photos, setPhotos] = useState<FieldPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<FieldPhoto | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setEmail(data.user.email ?? '');

      // Fetch profile
      supabase.from('profiles').select('*').eq('user_id', data.user.id).maybeSingle().then(({ data: profile }) => {
        if (profile) {
          setDisplayName(profile.display_name ?? '');
          setOrganization(profile.organization ?? '');
        }
      });

      // Fetch synced photos
      supabase
        .from('field_photos')
        .select('id, city, description, photo_url, env_score_at_capture, captured_at')
        .eq('user_id', data.user.id)
        .eq('synced', true)
        .order('captured_at', { ascending: false })
        .then(({ data: photoData }) => {
          setPhotos(photoData ?? []);
          setLoadingPhotos(false);
        });
    });
  }, []);

  const langKeys = Object.keys(LANG_NAMES) as LangCode[];

  return (
    <div className="space-y-6">
      {/* Avatar & Name */}
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
          <User className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-foreground">{displayName || 'User'}</h2>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-3">Account</h3>
        <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
          <SettingRow icon={<Mail className="w-5 h-5 text-primary" />} label="Email" value={email} />
          <SettingRow icon={<Building2 className="w-5 h-5 text-primary" />} label="Organization" value={organization || '—'} />
          <SettingRow icon={<Shield className="w-5 h-5 text-primary" />} label="Plan" value="Free" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-3">Preferences</h3>
        <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Globe className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground flex-1">Language</span>
            <select
              value={lang}
              onChange={(e) => onLangChange(e.target.value as LangCode)}
              className="bg-secondary text-foreground rounded-xl px-3 py-1.5 text-sm font-semibold border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {langKeys.map(l => <option key={l} value={l}>{LANG_NAMES[l]}</option>)}
            </select>
          </div>
          <SettingRow icon={<Moon className="w-5 h-5 text-primary" />} label="Theme" value="Dark" />
          <SettingRow icon={<Bell className="w-5 h-5 text-primary" />} label="Notifications" value="Enabled" />
        </div>
      </div>

      {/* Photo Gallery */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1 mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Image className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            Field Photos ({photos.length})
          </h3>
        </div>

        {loadingPhotos ? (
          <div className="bg-card rounded-2xl border border-border p-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : photos.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <Image className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No synced photos yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Capture and sync photos from the camera to see them here</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 rounded-2xl overflow-hidden">
            {photos.map(photo => (
              <button
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="relative aspect-square overflow-hidden rounded-xl group focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {photo.photo_url ? (
                  <img
                    src={photo.photo_url}
                    alt={photo.description || photo.city}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center">
                    <Image className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="bg-card rounded-2xl border border-border max-w-md w-full overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {selectedPhoto.photo_url && (
              <img
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.description || selectedPhoto.city}
                className="w-full aspect-video object-cover"
              />
            )}
            <div className="p-4 space-y-3">
              {selectedPhoto.description && (
                <p className="text-sm text-foreground">{selectedPhoto.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {selectedPhoto.city}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(selectedPhoto.captured_at).toLocaleDateString()}
                </span>
                {selectedPhoto.env_score_at_capture != null && (
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">
                    ENV {selectedPhoto.env_score_at_capture.toFixed(1)}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="w-full py-2.5 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

function SettingRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      {icon}
      <span className="text-sm font-medium text-foreground flex-1">{label}</span>
      <span className="text-sm text-muted-foreground">{value}</span>
    </div>
  );
}

export default Profile;
