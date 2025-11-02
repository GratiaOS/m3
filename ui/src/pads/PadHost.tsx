import React, { useEffect, Suspense } from 'react';
import { Button, Card } from '@gratiaos/ui';
import { usePadRegistry } from '@/hooks/usePadRegistry';
import { getPad } from './pad-registry';
import { clearPadRoute } from './usePadRoute';
import PadChrome from './PadChrome';

function FallbackCard({ padId, title, message }: { padId: string; title: string; message: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-surface px-4 py-12">
      <Card className="max-w-lg space-y-4">
        <h1 className="text-lg font-semibold text-text">{title}</h1>
        <p className="text-sm text-subtle">{message}</p>
        <div className="flex">
          <Button tone="accent" onClick={() => clearPadRoute(padId)}>
            Back to dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}

class PadErrorBoundary extends React.Component<{ padId: string; children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    // Keep this local: prevents noisy global error overlays while giving us a graceful recovery surface.
    // eslint-disable-next-line no-console
    console.error('Pad crashed:', err);
  }

  render() {
    if (this.state.hasError) {
      return (
        <FallbackCard
          padId={this.props.padId}
          title="Pad error"
          message="Something in this pad failed to render. You can return to the dashboard and try again."
        />
      );
    }
    return this.props.children as React.ReactElement;
  }
}

interface PadHostProps {
  padId: string;
  me: string;
}

const PadHost: React.FC<PadHostProps> = ({ padId, me }) => {
  const descriptor = getPad(padId);
  const { register, unregister } = usePadRegistry();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const prevTitle = document.title;
    const nextTitle = descriptor?.title ? `${descriptor.title} · M3` : `Pad · M3`;
    document.title = nextTitle;

    const onKey = (e: KeyboardEvent) => {
      // Close only if Escape is pressed and this pad is active
      if (e.key === 'Escape') {
        clearPadRoute(padId);
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.title = prevTitle;
      window.removeEventListener('keydown', onKey);
    };
  }, [padId, descriptor?.title]);

  useEffect(() => {
    if (!descriptor) return undefined;
    register({
      id: String(descriptor.id),
      title: descriptor.title ?? 'Pad',
      scene: 'active',
      setScene: () => {},
    });
    return () => unregister(String(descriptor.id));
  }, [descriptor, register, unregister]);

  if (!descriptor) {
    return (
      <FallbackCard
        padId={padId}
        title="Pad not found"
        message={`The pad “${padId}” is not registered. Check the URL or return to the dashboard to pick a different pad.`}
      />
    );
  }

  const PadComponent = descriptor.meta?.component;

  if (!PadComponent) {
    return (
      <FallbackCard
        padId={padId}
        title="Pad not configured"
        message={`The pad “${padId}” is registered but missing its component. Please check the pad registry.`}
      />
    );
  }

  return (
    <PadErrorBoundary padId={padId}>
      <PadChrome pad={descriptor}>
        <Suspense
          fallback={
            <div className="grid min-h-[50dvh] place-items-center">
              <Card className="max-w-md space-y-3">
                <h2 className="text-base font-semibold text-text">Loading pad…</h2>
                <p className="text-sm text-subtle">Preparing the scene and wiring helpers.</p>
              </Card>
            </div>
          }>
          <PadComponent me={me} />
        </Suspense>
      </PadChrome>
    </PadErrorBoundary>
  );
};

export default PadHost;
