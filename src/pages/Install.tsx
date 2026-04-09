import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install: React.FC = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <img src="/icon-512.png" alt="ENVIQ AI" className="w-24 h-24 rounded-2xl mb-6" />
      <h1 className="text-2xl font-black text-foreground mb-2">ENVIQ AI</h1>
      <p className="text-muted-foreground mb-8 max-w-sm">
        Install ENVIQ AI on your device for instant access to environmental monitoring, predictions, and cooling advisories.
      </p>

      {isInstalled ? (
        <div className="space-y-4">
          <div className="px-6 py-3 rounded-xl bg-env-safe/20 text-env-safe font-semibold">
            ✅ App Installed!
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold"
          >
            Open App
          </button>
        </div>
      ) : deferredPrompt ? (
        <button
          onClick={handleInstall}
          className="px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-lg active:scale-95 transition-transform"
        >
          📲 Install ENVIQ AI
        </button>
      ) : isIOS ? (
        <div className="bg-card rounded-2xl p-6 max-w-sm border border-border">
          <p className="text-foreground font-semibold mb-3">Install on iPhone/iPad:</p>
          <ol className="text-muted-foreground text-sm text-left space-y-2">
            <li>1. Tap the <strong className="text-foreground">Share</strong> button (📤) in Safari</li>
            <li>2. Scroll down and tap <strong className="text-foreground">Add to Home Screen</strong></li>
            <li>3. Tap <strong className="text-foreground">Add</strong></li>
          </ol>
        </div>
      ) : (
        <div className="bg-card rounded-2xl p-6 max-w-sm border border-border">
          <p className="text-foreground font-semibold mb-3">Install on your device:</p>
          <ol className="text-muted-foreground text-sm text-left space-y-2">
            <li>1. Open in <strong className="text-foreground">Chrome</strong> browser</li>
            <li>2. Tap the <strong className="text-foreground">⋮ menu</strong> (top right)</li>
            <li>3. Tap <strong className="text-foreground">Install app</strong> or <strong className="text-foreground">Add to Home Screen</strong></li>
          </ol>
        </div>
      )}

      <button
        onClick={() => navigate('/')}
        className="mt-8 text-muted-foreground text-sm underline"
      >
        Continue in browser instead
      </button>
    </div>
  );
};

export default Install;
