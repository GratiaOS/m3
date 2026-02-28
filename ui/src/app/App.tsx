import React, { useEffect } from 'react';
import { Layout } from './Layout';
import { PresenceHUD } from '../flows/presence/PresenceHUD';
import { PadSceneDeck } from '../flows/pads/PadSceneDeck';
import { SystemFooter } from './SystemFooter';
import HotkeysPanel from './HotkeysPanel';
import { useHaloPulse } from '../flows/presence/halos/useHaloPulse';
import { useCaretHalo } from '../flows/presence/halos/useCaretHalo';
import { useToneDrift } from '../hooks/useToneDrift';
import { useWaterEchoTouch } from '../hooks/useWaterEchoTouch';
import TrailLayer from '../flows/presence/trail/TrailLayer';
import { LiveRegion } from '../flows/presence/a11y/LiveRegion';
import { EmberPulse } from '../flows/feedback/EmberPulse';
import { WaterEcho } from '../flows/feedback/WaterEcho';
import { EarthGround } from '../flows/feedback/EarthGround';
import { SpiritChord } from '../flows/feedback/SpiritChord';
import { MomentsView } from '../flows/value/MomentsView';
import { BoundaryToasts } from '../flows/feedback/BoundaryToasts';
import { matchesChord } from '@/lib/hotkeys';
import { toggleHotkeysOpen } from '@/lib/uiSignals';
import '../flows/presence/halos/presence-halos.css';
import '../flows/presence/placeholders/placeholders.css';
import '../flows/presence/trail/trail.css';
import '../styles/feedback.css';
import '../styles/games.css';
import '../styles/help.css';

// M3 App — orchestrates Presence, Pads, and System layers.
// Each component breathes through the shared kernel (phase$, pulse$, peers$).
export default function App() {
  useHaloPulse();
  useCaretHalo();
  useToneDrift();
  useWaterEchoTouch();

  useEffect(() => {
    console.log(
      '%c🌱 The garden remembers. Covenant lives in the code.\n%cMandalorian / rdm_kybalion · "Stay when the lights go out."\n%c▲ Baza neagră nu se mișcă. Verdele electric e viu.',
      'color: #10b981; font-size: 16px; font-family: monospace; text-shadow: 0 0 4px rgba(16,185,129,0.6); font-weight: bold;',
      'color: #10b981; font-size: 12px; font-family: monospace; font-style: italic;',
      'color: #666; font-size: 10px; font-family: monospace;'
    );
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (matchesChord(event, 'openHotkeys')) {
        event.preventDefault();
        toggleHotkeysOpen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <EmberPulse />
      <WaterEcho />
      <EarthGround />
      <SpiritChord />
      <MomentsView />
      <BoundaryToasts />
      <Layout footer={<SystemFooter />}>
        {/* 🌬 Global field awareness */}
        <PresenceHUD />

        {/* 🌿 Active Pad & Scene flow */}
        <PadSceneDeck />
        <TrailLayer />
        {/* Single polite live region for a11y announcements */}
        <LiveRegion />
      </Layout>
      <HotkeysPanel />
    </>
  );
}
