import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSignalSelector } from '@/lib/useSignal';
import { spiritHue$ } from '@/flows/games/spiritChord';
import { addExternalBeadsFromSketch } from '@/flows/games/weaveStore';
import { chordAttr } from '@/lib/chordUi';
import { matchesChord } from '@/lib/hotkeys';

type Point = { x: number; y: number; t: number };
type Stroke = { pts: Point[] };

const MAX_STROKES = 300;

export function EchoSketchScene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const hue = useSignalSelector(spiritHue$, (value) => value ?? 180);
  const hueRef = useRef(hue);
  hueRef.current = hue;

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  const fitCanvas = useMemo(
    () => () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    },
    []
  );

  const widthFor = (curr: Point, prev?: Point) => {
    const base = 2;
    const breath = 1 + Math.sin(performance.now() / 900) * 0.6;
    if (!prev) return base + breath + 0.5;
    const dt = Math.max(1, curr.t - prev.t);
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = Math.min(3, (dist / dt) * 12);
    return base + breath + speed;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    fitCanvas();

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      if (document.visibilityState === 'hidden') {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = `hsl(${hueRef.current}, 70%, 55%)`;

      const drawStroke = (stroke?: Stroke | null) => {
        if (!stroke || stroke.pts.length < 2) return;
        for (let i = 1; i < stroke.pts.length; i += 1) {
          const prev = stroke.pts[i - 1];
          const curr = stroke.pts[i];
          ctx.lineWidth = widthFor(curr, prev);
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.stroke();
        }
      };

      strokesRef.current.forEach((stroke) => drawStroke(stroke));
      drawStroke(currentStrokeRef.current);

      ctx.restore();
      rafRef.current = requestAnimationFrame(render);
    };

    const handleResize = () => fitCanvas();
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      } else if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(render);
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    rafRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [fitCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const toPoint = (event: PointerEvent): Point => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top, t: performance.now() };
    };

    const handleDown = (event: PointerEvent) => {
      canvas.setPointerCapture(event.pointerId);
      currentStrokeRef.current = { pts: [toPoint(event)] };
    };

    const handleMove = (event: PointerEvent) => {
      if (!currentStrokeRef.current) return;
      currentStrokeRef.current.pts.push(toPoint(event));
    };

    const commitStroke = () => {
      if (!currentStrokeRef.current) return;
      setStrokes((prev) => {
        const next = [...prev, currentStrokeRef.current!];
        return next.slice(-MAX_STROKES);
      });
      currentStrokeRef.current = null;
    };

    const handleUp = () => commitStroke();

    canvas.addEventListener('pointerdown', handleDown);
    canvas.addEventListener('pointermove', handleMove);
    canvas.addEventListener('pointerup', handleUp);
    canvas.addEventListener('pointercancel', handleUp);
    canvas.addEventListener('pointerleave', handleUp);

    return () => {
      canvas.removeEventListener('pointerdown', handleDown);
      canvas.removeEventListener('pointermove', handleMove);
      canvas.removeEventListener('pointerup', handleUp);
      canvas.removeEventListener('pointercancel', handleUp);
      canvas.removeEventListener('pointerleave', handleUp);
    };
  }, []);

  const getLastPointsNormalized = useCallback((max = 200) => {
    const canvas = canvasRef.current;
    if (!canvas) return [];
    const width = canvas.clientWidth || canvas.width || 1;
    const height = canvas.clientHeight || canvas.height || 1;
    const strokesList = (strokesRef.current ?? []).filter(Boolean);
    const allPts = strokesList.flatMap((stroke) => (stroke?.pts ?? []));
    const slice = allPts.slice(-max);
    return slice.map((pt) => ({
      x: width <= 0 ? 0 : Math.min(1, Math.max(0, pt.x / width)),
      y: height <= 0 ? 0 : Math.min(1, Math.max(0, pt.y / height)),
    }));
  }, []);

  const sendToWeave = useCallback(() => {
    const points = getLastPointsNormalized(200);
    if (!points.length) return;
    const hueValue = spiritHue$.value ?? 180;
    addExternalBeadsFromSketch(points, hueValue, { paceMs: 30 });
  }, [getLastPointsNormalized]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (matchesChord(event, 'sendToWeave')) {
        event.preventDefault();
        sendToWeave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sendToWeave]);

  const clearAll = () => {
    setStrokes([]);
    currentStrokeRef.current = null;
  };

  const savePng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `echo-sketch-${Date.now()}.png`;
    link.click();
  };

  return (
    <section className="echo-sketch">
      <header className="echo-sketch__head">
        <h3>Echo Sketch</h3>
        <div className="spacer" />
        <button type="button" onClick={clearAll}>
          Clear
        </button>
        <button type="button" onClick={savePng}>
          Save PNG
        </button>
        <button type="button" onClick={sendToWeave} {...chordAttr('sendToWeave')}>
          Send to Weave
        </button>
      </header>
      <div className="echo-sketch__stage">
        <canvas ref={canvasRef} aria-label="Echo Sketch canvas" />
      </div>
    </section>
  );
}
