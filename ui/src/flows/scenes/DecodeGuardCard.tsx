import React from 'react';
import { Card, Button } from '@gratiaos/ui';
import { setDepth } from '@/flows/relational/relationalAlignment';

export function DecodeGuardCard() {
  return (
    <Card className="space-y-3" role="region" aria-label="Deep mode required">
      <header className="space-y-1">
        <p className="text-sm font-semibold text-subtle uppercase tracking-widest">Memory Pad</p>
        <h2 className="text-xl font-semibold text-text">Deep is off</h2>
      </header>
      <p className="text-sm text-subtle">Decode rituals open only when Deep is enabled.</p>
      <div className="pad-actions" style={{ justifyContent: 'flex-start' }}>
        <Button tone="accent" onClick={() => setDepth('deep')}>
          Enable Deep & open
        </Button>
      </div>
    </Card>
  );
}
