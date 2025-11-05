import React from 'react';
import { Layout } from './Layout';
import { PresenceHUD } from '../flows/presence/PresenceHUD';
import { PadSceneDeck } from '../flows/pads/PadSceneDeck';
import { SystemFooter } from './SystemFooter';
import { useHaloPulse } from '../flows/presence/halos/useHaloPulse';
import { useCaretHalo } from '../flows/presence/halos/useCaretHalo';
import '../flows/presence/halos/presence-halos.css';
import '../flows/presence/placeholders/placeholders.css';

// M3 App — orchestrates Presence, Pads, and System layers.
// Each component breathes through the shared kernel (phase$, pulse$, peers$).
export default function App() {
  useHaloPulse();
  useCaretHalo();

  return (
    <Layout footer={<SystemFooter />}>
      {/* 🌬 Global field awareness */}
      <PresenceHUD />

      {/* 🌿 Active Pad & Scene flow */}
      <PadSceneDeck />
    </Layout>
  );
}
