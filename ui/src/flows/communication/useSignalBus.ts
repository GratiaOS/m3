import { useEffect } from 'react';
import { signalBus, type SignalBusEvents } from '@/adapters/webrtc-signal-bus';

export function useSignalBus<K extends keyof SignalBusEvents>(event: K, handler: (payload: SignalBusEvents[K]) => void) {
  useEffect(() => {
    const off = signalBus.on(event, handler);
    return () => {
      off();
    };
  }, [event, handler]);

  return signalBus;
}
