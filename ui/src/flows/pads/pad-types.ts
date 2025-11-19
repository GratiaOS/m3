import type React from 'react';
import type { PadManifest } from '@gratiaos/pad-core';

/** Known built-in pad kinds; keep `string` to allow experiments without recompiling pad-core. */
export type PadKind = 'towns' | 'value' | 'energy' | string;

/** UI-facing metadata attached to a pad manifest. */
export type PadMetadata = {
  /** React component that renders the Pad’s content. */
  component: React.ComponentType<any>;
  /** Optional preview component for shelf/deck rendering. */
  preview?: React.ComponentType<any>;
  /** Optional keyboard hints shown in the shelf/host. */
  keyboard?: { open?: string };
};

/** Concrete manifest shape consumed by the UI registry. */
export type PadDescriptor = PadManifest<PadMetadata>;
