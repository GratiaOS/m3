import React, { useEffect, useState } from 'react';
import { useSignalSelector } from '@/lib/useSignal';
import { gratitudeLedger$, type GratitudeToken } from './gratitudeTokens';

const selectLastFive = (ledger: GratitudeToken[]) =>
  ledger
    .slice(-5)
    .map((token) => ({
      id: token.id,
      message: token.message || 'Thank you',
      scene: token.scene ?? 'Garden',
    }))
    .reverse();

const areMomentsEqual = (
  a: ReturnType<typeof selectLastFive>,
  b: ReturnType<typeof selectLastFive>
) =>
  a.length === b.length &&
  a.every((moment, index) => {
    const next = b[index];
    return moment.id === next.id && moment.message === next.message && moment.scene === next.scene;
  });

export function MomentsView() {
  const moments = useSignalSelector(gratitudeLedger$, selectLastFive, areMomentsEqual);
  const isDocumentVisible = useDocumentVisibility();
  if (moments.length === 0) return null;

  return (
    <div
      data-ui="moments-view"
      role="status"
      aria-live={isDocumentVisible ? 'polite' : 'off'}
      aria-atomic={false}
    >
      {moments.map((token) => (
        <div key={token.id} className="moment">
          <span className="msg">“{token.message}”</span>
          <span className="scene"> · {token.scene}</span>
        </div>
      ))}
    </div>
  );
}

function useDocumentVisibility() {
  const getSnapshot = () =>
    typeof document === 'undefined' ? true : document.visibilityState === 'visible';
  const [visible, setVisible] = useState(getSnapshot);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibilityChange = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  return visible;
}
