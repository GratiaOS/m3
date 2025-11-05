import React from 'react';
import '../styles/layout.css';
import { PadShelf } from '../flows/pads/PadShelf';
import { SystemPanel } from '../flows/system/SystemPanel';

type LayoutProps = {
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function Layout({ children, footer }: LayoutProps) {
  return (
    <div className="garden-layout">
      <aside className="rail-left">
        <div className="rail-content" aria-label="Pad navigation">
          <PadShelf />
        </div>
      </aside>

      <main className="deck">{children}</main>

      <aside className="rail-right">
        <div className="rail-content" aria-label="System tools">
          <SystemPanel />
        </div>
      </aside>

      {footer}
    </div>
  );
}
