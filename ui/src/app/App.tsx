import React from 'react';
import { Layout } from './Layout';
import { PresenceHUD } from '../flows/presence/PresenceHUD';
import { PadSceneDeck } from '../flows/pads/PadSceneDeck';
import { SystemFooter } from './SystemFooter';

// M3 App — orchestrates Presence, Pads, and System layers.
// Each component breathes through the shared kernel (phase$, pulse$, peers$).
export default function App() {
  return (
    <Layout footer={<SystemFooter />}>
      {/* 🌬 Global field awareness */}
      <PresenceHUD />

      {/* 🌿 Active Pad & Scene flow */}
      <PadSceneDeck />
    </Layout>
  );
}
