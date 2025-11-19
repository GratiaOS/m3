import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/flows/pads/pad-registry';
import '@/flows/relational/relationalAlignment';
import { ProfileProvider } from '@/state/profile';
import { ReversePolesProvider } from '@/state/reversePoles';
import App from '@/App';
import PadHost from '@/flows/pads/PadHost';
import { useProfile } from '@/state/profile';
import { usePadRoute } from '@/flows/pads/hooks/usePadRoute';
import { Toaster } from '@gratiaos/ui';
import { Heartbeat, ConstellationHUD, kernelAuthority, authority$, mood$, phase$, pulse$, getAuthority, mood$ as moodSignal } from '@gratiaos/presence-kernel';
import './styles/accessibility.css';
import './styles.css';
import { startCodexBridge, stopCodexBridge } from '@/flows/codex/codexBridge';
import { broadcaster } from '@/lib/gardenBroadcaster';
import { attachGhostPartnerBridge } from '@/flows/games/ghostPartnerBridge';

console.log('🌬️ Presence Kernel Authority:', kernelAuthority);

import { mountSrAnnouncer } from './lib/srAnnouncer';
mountSrAnnouncer();
startCodexBridge();
window.addEventListener('unload', () => stopCodexBridge());

window.addEventListener(
  'keydown',
  () => {
    document.documentElement.dataset.kbm = 'on';
  },
  { passive: true }
);
window.addEventListener(
  'pointerdown',
  () => {
    document.documentElement.dataset.kbm = 'off';
  },
  { passive: true }
);

const html = document.documentElement;
html.dataset.authority = getAuthority();
html.dataset.mood = moodSignal.value;
authority$.subscribe((value) => {
  html.dataset.authority = value;
});
mood$.subscribe((value) => {
  html.dataset.mood = value;
});

const detachGhostPartnerBridge = attachGhostPartnerBridge();

window.addEventListener('unload', () => {
  detachGhostPartnerBridge?.();
});

const RootApp: React.FC = () => {
  const route = usePadRoute();
  const { me } = useProfile();

  if (route) {
    return (
      <>
        <PadHost padId={route.id} sceneId={route.scene} me={me} />
        <Toaster position="bottom-center" />
        <Heartbeat />
        <ConstellationHUD />
      </>
    );
  }

  return (
    <>
      <App />
      <Toaster position="bottom-center" />
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ReversePolesProvider>
      <ProfileProvider>
        <RootApp />
      </ProfileProvider>
    </ReversePolesProvider>
  </React.StrictMode>
);

if (typeof document !== 'undefined') {
  const unsubscribePulse = pulse$.subscribe((tick) => {
    if (document.hidden) return;
    broadcaster.mirrorPulse({ tick, phase: phase$.value, mood: mood$.value });
  });
  window.addEventListener('unload', () => unsubscribePulse());
}
