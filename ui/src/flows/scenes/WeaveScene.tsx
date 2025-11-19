import React, { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Card, Button } from '@gratiaos/ui';
import { useSignal } from '@/lib/useSignal';
import { weave$, beginWeave, stopWeave } from '@/flows/games/weaveStore';
import { playTone, ensureAudio, suspendAudio, getWeaveVolume, setWeaveVolume } from '@/flows/games/toneMap';
import { coReg$ } from '@/flows/games/breathGame';
import { spiritHue$, nudgeSpiritHue } from '@/flows/games/spiritChord';

export function WeaveScene() {
  const weave = useSignal(weave$);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isVisible = useDocumentVisibility();
  const [volume, setVolume] = useState(() => getWeaveVolume());
  const [audioPrimed, setAudioPrimed] = useState(false);
  const harmonyState = useSignal(coReg$);
  const ribbonHue = useSignal(spiritHue$);

  useEffect(() => {
    if (!audioPrimed) return;
    if (!weave.length || !isVisible) return;
    const bead = weave[weave.length - 1];
    if (bead.tone === 'silence') return;
    playTone(bead.tone as any, bead.hue, Boolean(bead.together));
  }, [weave, isVisible, audioPrimed]);

  useEffect(() => {
    if (harmonyState === 'together') {
      nudgeSpiritHue(8, 1400);
    }
  }, [harmonyState]);

  useEffect(() => {
    if (!audioPrimed) return;
    if (isVisible) {
      ensureAudio().catch(() => {});
    } else {
      suspendAudio().catch(() => {});
    }
  }, [isVisible, audioPrimed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const cssWidth = canvas.clientWidth || 400;
      const cssHeight = canvas.clientHeight || 180;
      canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
      canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const FADE_MS = 12000;

    let raf = 0;
    const render = () => {
      const cssWidth = canvas.clientWidth || 400;
      const cssHeight = canvas.clientHeight || 180;

      if (!isVisible) {
        raf = window.requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, cssWidth, cssHeight);
      const now = performance.now();

      for (const bead of weave) {
        const age = now - bead.created;
        if (age > FADE_MS) continue;
        const alpha = Math.max(0.05, 1 - age / FADE_MS);

        let x: number;
        let y: number;
        if (typeof bead.x === 'number' && typeof bead.y === 'number') {
          x = bead.x * cssWidth;
          y = bead.y * cssHeight;
        } else {
          x = (bead.t / 1000) % cssWidth;
          y = cssHeight / 2 + Math.sin((bead.hue / 360) * Math.PI * 2 + bead.t / 900) * (cssHeight * 0.3);
        }

        ctx.beginPath();
        ctx.arc(x, y, bead.together ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${bead.hue}, 60%, ${bead.together ? 60 : 45}%)`;
        const baseAlpha = bead.from === 'trace' ? 0.45 : bead.from === 'sketch' ? 0.75 : 0.85;
        ctx.globalAlpha = baseAlpha * alpha;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      raf = window.requestAnimationFrame(render);
    };

    raf = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [weave, isVisible]);

  useEffect(() => () => stopWeave(), []);

  const primeAudio = () => {
    if (audioPrimed) return;
    ensureAudio()
      .then(() => setAudioPrimed(true))
      .catch(() => {});
  };

  const handleBegin = () => {
    primeAudio();
    beginWeave();
  };

  return (
    <Card as="section" padding="lg" data-ui="weave">
      <h3>Presence Weave</h3>
      <p className="muted">Every breath memory becomes a bead. Watch the loop braid itself.</p>
      <div className="harmony-ribbon" data-state={harmonyState} style={{ '--ribbon-h': `${ribbonHue}` } as CSSProperties} />
      <canvas ref={canvasRef} className="weave-canvas" aria-label="Presence weave" />
      <div className="weave-controls">
        <Button tone="accent" onClick={handleBegin}>
          Begin Weave
        </Button>
        <Button variant="subtle" onClick={stopWeave}>
          Stop
        </Button>
        <div className="spacer" />
        <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', opacity: 0.9 }}>
          <span>Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(event) => {
              primeAudio();
              const next = Number(event.currentTarget.value);
              setVolume(next);
              setWeaveVolume(next);
            }}
            aria-label="Weave volume"
            style={{ width: 120 }}
          />
        </label>
      </div>
    </Card>
  );
}

function useDocumentVisibility() {
  const [visible, setVisible] = useState(() => (typeof document === 'undefined' ? true : document.visibilityState === 'visible'));
  useEffect(() => {
    const handleVisibility = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);
  return visible;
}
