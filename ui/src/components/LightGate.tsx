import * as React from 'react';

/**
 * LightGate — webcam luminance → FamJam bridge
 * --------------------------------------------
 * Whisper: "let the room speak in light." 🌬️
 *
 * How it works
 *  • Grabs the webcam preview (no recording), computes average luminance per frame.
 *  • Hysteresis thresholds turn the analog signal into ON/OFF.
 *  • Measures ON pulse lengths: short (•) vs long (—).
 *  • Looks for SYNC = •••, then the next symbol(s):
 *      •— → famjam_open   (🪄)
 *      —• → famjam_close  (🔚)
 *      •• → note          (🗒) (kept as 'famjam_note' kind; same mapper will show room badge)
 *  • Emits `timeline:add` CustomEvent with { source:'bridge', kind, intensity, doorway, hint }.
 *
 * A11y & privacy
 *  • Camera stays local; frames never leave the browser. No mic.
 *  • UI uses Garden tokens (surface/elev/text/border) and is fully keyboardable.
 */

type Props = {
  /** Initial doorway/room tag to attach to events (e.g., 'fire' | 'car' | 'table'). */
  defaultDoorway?: string;
  /** Mount in a Modal body or inline card. */
  compact?: boolean;
};

type GateState = 'idle' | 'calibrating' | 'listening';

const SHORT_MAX_MS = 1200; // ≤ this = short (•)
const LONG_MIN_MS = 1200; // > this = long (—)
const GAP_MAX_MS = 1100; // max gap between pulses inside a code
const CALIBRATION_MS = 2000; // gather baseline for this long
const HYSTERESIS = 0.035; // 3.5% luminance hysteresis band

export default function LightGate({ defaultDoorway = 'anywhere', compact = false }: Props) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Replace the <video> node to escape odd paint states (Chromium/Brave quirk)
  const hardReattachVideo = React.useCallback((stream: MediaStream) => {
    const old = videoRef.current;
    if (!old) return;
    const parent = old.parentNode;
    const clone = old.cloneNode(false) as HTMLVideoElement;
    // carry styles/attrs
    clone.autoplay = true;
    clone.muted = true;
    (clone as any).playsInline = true;
    clone.setAttribute('autoplay', '');
    clone.setAttribute('muted', '');
    clone.setAttribute('playsinline', '');
    // update ref
    videoRef.current = clone;
    if (parent) parent.replaceChild(clone, old);
    // attach and try play
    (clone as any).srcObject = stream;
    clone.play().catch(() => void 0);
    return clone;
  }, []);

  const attachStreamWithListeners = React.useCallback((v: HTMLVideoElement, stream: MediaStream, refreshDebugFn: () => void) => {
    // Autoplay/inline hints (props + attributes)
    v.autoplay = true;
    v.muted = true;
    (v as any).playsInline = true;
    v.setAttribute('autoplay', '');
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');

    // Listeners FIRST
    const tryPlayUntilReady = () => {
      let tries = 0;
      const tick = () => {
        tries += 1;
        v.play().catch(() => void 0);
        if (v.readyState >= 2 || tries > 15) return;
        setTimeout(tick, 160);
      };
      tick();
    };
    const onMeta = () => {
      v.removeEventListener('loadedmetadata', onMeta);
      if (v.videoWidth && v.videoHeight) {
        v.width = v.videoWidth;
        v.height = v.videoHeight;
      }
      tryPlayUntilReady();
      refreshDebugFn();
    };
    const onCanPlay = () => {
      v.removeEventListener('canplay', onCanPlay);
      tryPlayUntilReady();
      refreshDebugFn();
    };
    v.addEventListener('loadedmetadata', onMeta, { once: true });
    v.addEventListener('canplay', onCanPlay, { once: true });
    if ('requestVideoFrameCallback' in v) {
      (v as any).requestVideoFrameCallback?.(() => refreshDebugFn());
    }

    // Attach AFTER listeners
    (v as any).srcObject = stream;
    tryPlayUntilReady();
    refreshDebugFn();
  }, []);

  // UI state
  const [doorway, setDoorway] = React.useState(defaultDoorway);
  const [state, setState] = React.useState<GateState>('idle');
  const [permission, setPermission] = React.useState<'unknown' | 'ok' | 'denied' | 'error'>('unknown');
  // Camera devices
  const [cameras, setCameras] = React.useState<Array<{ deviceId: string; label: string }>>([]);
  const [camId, setCamId] = React.useState<string | 'auto'>('auto');

  // Signal metrics
  const [lum, setLum] = React.useState(0); // current luminance 0..1
  const [baseline, setBaseline] = React.useState(0); // rolling baseline
  const [onThresh, setOnThresh] = React.useState(0); // baseline + delta to switch ON
  const [offThresh, setOffThresh] = React.useState(0); // baseline + delta to switch OFF

  // Pulse decoding
  const isOnRef = React.useRef(false);
  const lastEdgeTsRef = React.useRef<number | null>(null);
  const lastOffTsRef = React.useRef<number | null>(null);
  const [pulsePreview, setPulsePreview] = React.useState<string>(''); // e.g., "• • —"
  const [synced, setSynced] = React.useState(false);
  const [lastAction, setLastAction] = React.useState<string>('—');
  const [dbg, setDbg] = React.useState<{ vw: number; vh: number; paused: boolean; rs: number; track?: string } | null>(null);

  // ====== camera lifecycle ======
  const refreshDebug = React.useCallback(() => {
    const v = videoRef.current;
    const stream = streamRef.current;
    if (!v || !stream) {
      setDbg(null);
      return;
    }
    const track = stream.getVideoTracks()[0];
    setDbg({
      vw: v.videoWidth || 0,
      vh: v.videoHeight || 0,
      paused: v.paused,
      rs: v.readyState,
      track: track ? `${track.label} (${track.readyState})` : undefined,
    });
  }, []);

  const stopStream = React.useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
    refreshDebug();
  }, [refreshDebug]);

  const refreshCameras = React.useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const vids = devices.filter((d) => d.kind === 'videoinput');
      setCameras(
        vids.map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
        }))
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[lightgate] enumerateDevices failed:', e);
    }
  }, []);

  const startCamera = React.useCallback(
    async (preferredId?: string | 'auto') => {
      try {
        stopStream();
        let stream: MediaStream | null = null;

        // 1) If an explicit deviceId is requested, try that first with explicit size
        if (preferredId && preferredId !== 'auto') {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: preferredId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
              },
              audio: false,
            });
          } catch {
            // fall through to auto selection
          }
        }

        // 2) Prefer environment camera if available
        if (!stream) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
              },
              audio: false,
            });
          } catch {
            // 3) Final fallback: any video with gentle hints
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 640 }, height: { ideal: 360 } },
              audio: false,
            });
          }
        }

        streamRef.current = stream!;
        // Gently apply constraints on the live track (best-effort)
        try {
          const track = stream!.getVideoTracks()[0];
          await track?.applyConstraints?.({
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          } as MediaTrackConstraints);
        } catch {
          /* ignore */
        }

        setPermission('ok');
        refreshCameras(); // populate labels post-permission

        const v = videoRef.current;
        if (v) {
          // Fully reset element
          try {
            v.pause();
          } catch {}
          v.removeAttribute('src');
          (v as any).srcObject = null;
          v.load();

          // Attach stream with listeners + play loop
          attachStreamWithListeners(v, stream!, refreshDebug);

          // Seed intrinsic size from track settings to avoid zero-height layout
          const track = stream!.getVideoTracks()[0];
          const s = track?.getSettings?.() || {};
          const fallbackW = typeof s.width === 'number' ? s.width : 640;
          const fallbackH = typeof s.height === 'number' ? s.height : 360;
          if (!v.videoWidth || !v.videoHeight) {
            v.width = fallbackW as number;
            v.height = fallbackH as number;
          }

          // If after ~1.2s we still have 0×0 & HAVE_NOTHING, replace the node and reattach
          window.setTimeout(() => {
            if (!streamRef.current) return;
            const stalled = (v.readyState || 0) < 2 || !v.videoWidth || !v.videoHeight;
            if (stalled) {
              const newV = hardReattachVideo(streamRef.current);
              if (newV) {
                attachStreamWithListeners(newV, streamRef.current, refreshDebug);
              }
            }
          }, 1200);
        }
      } catch (e: any) {
        const name = e?.name || '';
        setPermission(name === 'NotAllowedError' ? 'denied' : 'error');
        // eslint-disable-next-line no-console
        console.warn('[lightgate] camera error:', e);
      }
    },
    [refreshCameras, stopStream, refreshDebug, attachStreamWithListeners, hardReattachVideo]
  );

  React.useEffect(() => {
    refreshCameras();
  }, [refreshCameras]);

  React.useEffect(() => {
    // Don't auto-start on mount; Calibrate/Listen will request camera explicitly.
    // This avoids StrictMode double-invoke starting then stopping the stream (1s flicker).
    return () => stopStream();
  }, [stopStream]);

  React.useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.addEventListener) return;
    const onChange = () => refreshCameras();
    navigator.mediaDevices.addEventListener('devicechange', onChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', onChange);
    };
  }, [refreshCameras]);

  // ====== sampling loop ======
  const sample = React.useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    // Wait until the element has real frames; avoid drawing a 0×0 stream.
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      // Try to nudge playback if the element is stuck
      try {
        video.play().catch(() => void 0);
      } catch {}
      rafRef.current = requestAnimationFrame(sample);
      return;
    }

    const w = 128;
    const h = 72;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    let sum = 0;
    // average luminance (approx Y from sRGB)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      // Rec. 709 luma approximation
      sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    const avg = sum / (w * h);
    setLum(avg);

    const now = performance.now();

    // update rolling baseline (EMA) — slower when listening, faster when calibrating
    const alpha = state === 'calibrating' ? 0.15 : 0.03;
    const newBase = baseline === 0 ? avg : baseline * (1 - alpha) + avg * alpha;
    setBaseline(newBase);

    const onTh = newBase + Math.max(HYSTERESIS, onThresh - baseline); // keep spacing stable
    const offTh = newBase + Math.max(HYSTERESIS * 0.5, offThresh - baseline); // smaller to avoid chatter

    // edge detector with hysteresis
    const wasOn = isOnRef.current;
    const nowOn = wasOn ? avg > offTh : avg > onTh;

    if (nowOn !== wasOn) {
      const lastTs = lastEdgeTsRef.current;
      lastEdgeTsRef.current = now;

      if (lastTs != null) {
        const dur = now - lastTs;
        if (nowOn) {
          // rising edge: gap just ended
          const gap = lastOffTsRef.current ? now - lastOffTsRef.current : Number.POSITIVE_INFINITY;
          if (gap > GAP_MAX_MS) {
            // new code block starting — optionally clear previews (but keeping looks nicer)
            // setPulsePreview('');
          }
        } else {
          // falling edge: ON pulse ended → classify
          lastOffTsRef.current = now;
          const symbol = dur <= SHORT_MAX_MS ? '•' : '—';
          setPulsePreview((prev) => (prev ? `${prev} ${symbol}` : symbol));
          processSymbol(symbol, dur);
        }
      }
      isOnRef.current = nowOn;
    }

    rafRef.current = requestAnimationFrame(sample);
  }, [baseline, onThresh, offThresh, state]);

  // rAF loop control
  const ensureSampling = React.useCallback(() => {
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(sample);
    }
  }, [sample]);

  const stopSampling = React.useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // ====== decoding state machine ======
  const symbolsRef = React.useRef<string[]>([]);

  const processSymbol = (symbol: string, durMs: number) => {
    // Accumulate
    symbolsRef.current.push(symbol);

    // Detect SYNC = •••
    if (!synced) {
      if (symbolsRef.current.length >= 3 && symbolsRef.current.slice(-3).join('') === '•••') {
        setSynced(true);
        // keep the three dots visible, then trim them on next symbol
        return;
      }
      // not synced yet — keep waiting
      return;
    } else {
      // After sync, trim the leading sync dots once we get the next symbol
      if (symbolsRef.current.slice(0, 3).join('') === '•••' && symbolsRef.current.length > 3) {
        symbolsRef.current = symbolsRef.current.slice(3);
        setPulsePreview(symbolsRef.current.join(' '));
      }
    }

    // We have sync; interpret first 1–2 symbols
    const s = symbolsRef.current.join('');
    let action: 'open' | 'close' | 'note' | null = null;

    if (s.startsWith('•—')) action = 'open';
    else if (s.startsWith('—•')) action = 'close';
    else if (s.startsWith('••')) action = 'note';

    if (action) {
      // crude intensity: map pulse length into 0.2..0.8
      const norm = Math.max(0.2, Math.min(0.8, durMs / 2000));
      fireEvent(action, norm);
      setLastAction(`${action} (${norm.toFixed(2)})`);
      // reset for next code; keep last symbol to allow chaining (optional)
      symbolsRef.current = [];
      setSynced(false);
      setPulsePreview('');
    } else {
      // If too many symbols without match, reset softly
      if (symbolsRef.current.length > 4) {
        symbolsRef.current = [];
        setSynced(false);
        setPulsePreview('');
      }
    }
  };

  const fireEvent = (action: 'open' | 'close' | 'note', intensity: number) => {
    const kind = action === 'open' ? 'famjam_open' : action === 'close' ? 'famjam_close' : 'famjam_note';
    const hint = action === 'note' ? 'LightGate note' : action === 'open' ? 'LightGate open' : 'LightGate close';

    window.dispatchEvent(
      new CustomEvent('timeline:add', {
        detail: {
          t: Date.now(),
          source: 'bridge',
          kind,
          intensity,
          hint,
          doorway,
        },
      })
    );
  };

  // ----- demo (no candles) -----
  // Feed a symbol into the decoder without using the camera edges.
  const feed = (sym: '•' | '—', dur = 400) => {
    setPulsePreview((prev) => (prev ? `${prev} ${sym}` : sym));
    processSymbol(sym, dur);
  };

  // Simulate a pattern like '••• •—' (open), '••• —•' (close), '••• ••' (note).
  const simulate = (pattern: string) => {
    const syms = pattern.replace(/\s+/g, '').split('') as Array<'•' | '—'>;
    let t = 0;
    syms.forEach((s) => {
      window.setTimeout(() => feed(s, s === '•' ? 400 : 1600), t);
      // leave a small inter-pulse gap; long pulses advance time more
      t += s === '•' ? 500 : 1700;
    });
  };

  // Shared inline button style for compact header actions.
  const btnStyle: React.CSSProperties = {
    fontSize: 12,
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    cursor: 'pointer',
  };

  // ====== controls ======
  const calibrate = async () => {
    if (permission !== 'ok' || !streamRef.current) await startCamera(camId);
    setState('calibrating');
    const wasSampling = rafRef.current != null;
    if (!wasSampling) ensureSampling();
    // Bootstrap thresholds relative to observed baseline range during calibration
    const start = performance.now();
    let minL = Number.POSITIVE_INFINITY;
    let maxL = 0;

    const snap = () => {
      minL = Math.min(minL, lum);
      maxL = Math.max(maxL, lum);
      if (performance.now() - start >= CALIBRATION_MS) {
        const base = (minL + maxL) / 2;
        setBaseline(base);
        const delta = Math.max(HYSTERESIS * 1.2, (maxL - minL) * 0.35);
        setOnThresh(base + delta);
        setOffThresh(base + delta * 0.6);
        setState('idle');
        if (!wasSampling) stopSampling();
      } else {
        requestAnimationFrame(snap);
      }
    };
    requestAnimationFrame(snap);
  };

  const startListening = async () => {
    if (permission !== 'ok' || !streamRef.current) await startCamera(camId);
    setState('listening');
    // init edge state
    isOnRef.current = false;
    lastEdgeTsRef.current = null;
    lastOffTsRef.current = null;
    symbolsRef.current = [];
    setSynced(false);
    setPulsePreview('');
    stopSampling();
    ensureSampling();
  };

  const stopListening = () => {
    setState('idle');
    stopSampling();
    // keep camera running so preview stays visible; call stopStream() to fully release
  };

  const tearDown = () => {
    setState('idle');
    stopStream();
  };

  // ====== UI ======
  const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div
      style={{
        background: 'var(--elev)',
        color: 'var(--text)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: compact ? 12 : 16,
        display: 'grid',
        gap: 10,
      }}>
      {children}
    </div>
  );

  return (
    <Card>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 600 }}>LightGate</div>
          <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>
            {state === 'calibrating' ? 'calibrating…' : state === 'listening' ? 'listening' : 'idle'} ·{' '}
            {permission === 'ok' ? 'camera ready' : permission === 'denied' ? 'permission denied' : 'camera pending'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => startCamera(camId)}
            title="connect camera"
            style={{
              fontSize: 12,
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              cursor: 'pointer',
            }}>
            Connect
          </button>
          <select
            value={doorway}
            onChange={(e) => setDoorway(e.target.value)}
            title="doorway / room"
            style={{
              fontSize: 12,
              padding: '4px 6px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
            }}>
            {['anywhere', 'fire', 'car', 'table', 'home', 'garden'].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={camId}
            onChange={(e) => {
              const id = e.target.value as any;
              setCamId(id);
              // restart preview with chosen camera
              startCamera(id);
            }}
            title="camera device"
            style={{
              fontSize: 12,
              padding: '4px 6px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              maxWidth: 220,
            }}>
            <option value="auto">auto</option>
            {cameras.map((c) => (
              <option key={c.deviceId} value={c.deviceId}>
                {c.label}
              </option>
            ))}
          </select>
          {state !== 'calibrating' && (
            <button
              onClick={calibrate}
              style={{
                fontSize: 12,
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                cursor: 'pointer',
              }}>
              Calibrate
            </button>
          )}
          {state !== 'listening' ? (
            <button
              onClick={startListening}
              style={{
                fontSize: 12,
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                cursor: 'pointer',
              }}>
              Listen
            </button>
          ) : (
            <button
              onClick={stopListening}
              style={{
                fontSize: 12,
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                cursor: 'pointer',
              }}>
              Pause
            </button>
          )}
          <button
            onClick={tearDown}
            title="stop camera"
            style={{
              fontSize: 12,
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              cursor: 'pointer',
            }}>
            Release
          </button>
          {/* Demo: simulate pulses without candles */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => simulate('••• •—')} title="simulate open" style={btnStyle}>
              Test Open
            </button>
            <button onClick={() => simulate('••• —•')} title="simulate close" style={btnStyle}>
              Test Close
            </button>
            <button onClick={() => simulate('••• ••')} title="simulate note" style={btnStyle}>
              Test Note
            </button>
          </div>
        </div>
      </header>

      {/* preview row */}
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: compact ? 200 : 260,
              height: compact ? 120 : 150,
              objectFit: 'cover',
              background: 'color-mix(in oklab, var(--text) 6%, transparent)' /* visible area while warming up */,
              borderRadius: 8,
              border: '1px solid var(--border)',
              display: 'block',
              transform: 'translateZ(0)',
            }}
          />
          <canvas ref={canvasRef} width={128} height={72} style={{ display: 'none' }} />
          <div style={{ minWidth: 180 }}>
            <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>luminance</div>
            <div
              aria-label="luminance level"
              style={{
                height: 10,
                width: 180,
                borderRadius: 999,
                background: 'color-mix(in oklab, var(--text) 10%, transparent)',
                position: 'relative',
                overflow: 'hidden',
              }}>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  transform: `scaleX(${Math.max(0, Math.min(1, lum))})`,
                  transformOrigin: 'left center',
                  background: 'var(--color-accent)',
                  opacity: 0.8,
                }}
              />
            </div>
            <div style={{ fontSize: 12, display: 'flex', gap: 6, marginTop: 6, color: 'var(--text-subtle)' }}>
              <span>avg {lum.toFixed(2)}</span>
              <span>base {baseline.toFixed(2)}</span>
            </div>
            {dbg && (
              <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 4 }}>
                cam: {dbg.track || '—'} · video {dbg.vw}×{dbg.vh} · readyState {dbg.rs} · {dbg.paused ? 'paused' : 'playing'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* decode status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>sync:</span>
        <span aria-live="polite" style={{ fontSize: 14 }}>
          {pulsePreview || '—'}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>last:</span>
        <span style={{ fontSize: 14 }}>{lastAction}</span>
      </div>

      <footer style={{ fontSize: 12, color: 'var(--text-subtle)' }}>
        <div>
          Alphabet: • ≤ {SHORT_MAX_MS}ms, — &gt; {LONG_MIN_MS}ms · Sync: ••• · Codes: •— open, —• close, •• note
        </div>
        <div>Tip: run Calibrate near the candles, then Listen. Keep the butterfly within frame.</div>
      </footer>
    </Card>
  );
}
