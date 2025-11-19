import React from 'react';
import ReadinessBoard from '@/components/ReadinessBoard';

const PillarsPanel: React.FC = () => {
  return (
    <section aria-label="Pillars panel" className="space-y-4">
      <header className="space-y-1 text-sm text-subtle">
        <p className="text-xs uppercase tracking-[0.28em] opacity-70">Pillars</p>
        <h2 className="text-base font-semibold text-text">Field Readiness</h2>
      </header>
      <ReadinessBoard />
    </section>
  );
};

export default PillarsPanel;
