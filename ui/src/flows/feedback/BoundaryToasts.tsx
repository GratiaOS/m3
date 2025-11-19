import { useEffect } from 'react';
import { showToast } from '@gratiaos/ui';

type BoundaryDetail = {
  incoming: string;
  rewrite?: string;
  classification: 'constant' | 'variable';
  microAct?: string;
  body?: string;
};

export function BoundaryToasts() {
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<BoundaryDetail>).detail;
      if (!detail) return;
      const { classification, rewrite } = detail;
      const title = 'Boundary sealed';
      const desc =
        classification === 'constant'
          ? rewrite
            ? `Promoted to constant: “${rewrite}”`
            : 'Promoted to constant.'
          : rewrite
          ? `Marked variable → “${rewrite}”`
          : 'Marked variable.';
      showToast({ icon: '🛡️', title, desc, variant: 'positive' });
    };
    window.addEventListener('boundary:formed', handler as EventListener);
    return () => window.removeEventListener('boundary:formed', handler as EventListener);
  }, []);

  return null;
}
