// WebRTC Signal Bus (phase sync scaffold)
// ------------------------------------------------------------
// Mirrors the living-interface bus shape. Provides emit/on for
// `phase:update` events and keeps a map of peer connections.

export type PhaseUpdatePayload = { phase: string; from?: string };

export type SignalBusEvents = {
  'phase:update': PhaseUpdatePayload;
};

type Listener<E> = (payload: E) => void;

type ListenerRegistry = {
  [K in keyof SignalBusEvents]?: Set<Listener<SignalBusEvents[K]>>;
};

const CHANNEL_LABEL = 'gratia-phase';

export class WebRTCSignalBus {
  private listeners: ListenerRegistry = {};
  private peers = new Map<string, RTCPeerConnection>();
  private channels = new Map<string, RTCDataChannel>();

  on<K extends keyof SignalBusEvents>(event: K, listener: Listener<SignalBusEvents[K]>) {
    const bucket = this.listeners[event] ?? new Set();
    bucket.add(listener);
    this.listeners[event] = bucket;
    return () => bucket.delete(listener);
  }

  emit<K extends keyof SignalBusEvents>(event: K, payload: SignalBusEvents[K]) {
    const bucket = this.listeners[event];
    bucket?.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.warn('[signalBus] listener failed', err);
      }
    });
    this.broadcast(event, payload);
  }

  attachPeer(peerId: string, connection: RTCPeerConnection) {
    this.peers.set(peerId, connection);
    connection.ondatachannel = (event) => {
      const channel = event.channel;
      if (channel.label !== CHANNEL_LABEL) return;
      this.registerChannel(peerId, channel);
    };

    try {
      const channel = connection.createDataChannel(CHANNEL_LABEL, { ordered: true });
      this.registerChannel(peerId, channel);
    } catch (err) {
      // Answering peers cannot create channel immediately; ignore.
    }
  }

  private registerChannel(peerId: string, channel: RTCDataChannel) {
    this.channels.set(peerId, channel);

    channel.onopen = () => {
      // ready to send
    };

    channel.onclose = () => this.channels.delete(peerId);
    channel.onerror = () => this.channels.delete(peerId);

    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as { event: keyof SignalBusEvents; payload: PhaseUpdatePayload };
        const bucket = this.listeners[message.event];
        bucket?.forEach((listener) => listener(message.payload));
      } catch (err) {
        console.warn('[signalBus] unable to parse message', err);
      }
    };
  }

  private broadcast<K extends keyof SignalBusEvents>(event: K, payload: SignalBusEvents[K]) {
    const message = JSON.stringify({ event, payload });
    for (const [, channel] of this.channels) {
      if (channel.readyState === 'open') {
        try {
          channel.send(message);
        } catch (err) {
          console.warn('[signalBus] send failed', err);
        }
      }
    }
  }
}

export const signalBus = new WebRTCSignalBus();
