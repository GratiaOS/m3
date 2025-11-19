import React, { useCallback, useEffect, useRef } from 'react';
import { phase$, pulse$, type Phase } from '@gratiaos/presence-kernel';

type Point = { x: number; y: number; life: number };

const MAX_POINTS = 240;
const DECAY = 0.94;

export default function TrailLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const rafRef = useRef<number | null>(null);
  const hueRef = useRef<number>(200);
  const alphaRef = useRef<number>(0.22);
  const pulseBoostRef = useRef<number>(0);

  const fitCanvas = useCallback(() => {
    if (typeof window === 'undefined') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement ?? document.documentElement;
    const rect = parent.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (ctx) {
      ctxRef.current = ctx;
      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const resize = () => fitCanvas();
    fitCanvas();
    const observer = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
    const target = canvasRef.current?.parentElement ?? document.documentElement;
    observer?.observe(target);
    window.addEventListener('resize', resize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [fitCanvas]);

  useEffect(() => {
    const unsubscribe = phase$.subscribe((phase: Phase) => {
      hueRef.current = phase === 'focused' ? 210 : phase === 'presence' ? 180 : phase === 'celebratory' ? 260 : 200;
      alphaRef.current = phase === 'focused' ? 0.2 : phase === 'presence' ? 0.26 : phase === 'celebratory' ? 0.24 : 0.22;
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = pulse$.subscribe(() => {
      pulseBoostRef.current = 1;
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    let pointerDown = false;

    const addPoint = (x: number, y: number) => {
      pointsRef.current.push({ x, y, life: 1 });
      if (pointsRef.current.length > MAX_POINTS) {
        pointsRef.current.splice(0, pointsRef.current.length - MAX_POINTS);
      }
    };

    const onMove = (event: MouseEvent) => {
      if (!pointerDown) return;
      addPoint(event.clientX, event.clientY);
    };
    const onDown = (event: MouseEvent) => {
      pointerDown = true;
      addPoint(event.clientX, event.clientY);
    };
    const onUp = () => {
      pointerDown = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!pointerDown) return;
      const touch = event.touches[0];
      if (!touch) return;
      addPoint(touch.clientX, touch.clientY);
    };
    const onTouchStart = (event: TouchEvent) => {
      pointerDown = true;
      const touch = event.touches[0];
      if (touch) addPoint(touch.clientX, touch.clientY);
    };
    const onTouchEnd = () => {
      pointerDown = false;
    };

    root.addEventListener('mousemove', onMove, { passive: true });
    root.addEventListener('mousedown', onDown, { passive: true });
    root.addEventListener('mouseup', onUp, { passive: true });
    root.addEventListener('mouseleave', onUp, { passive: true });

    root.addEventListener('touchmove', onTouchMove, { passive: true });
    root.addEventListener('touchstart', onTouchStart, { passive: true });
    root.addEventListener('touchend', onTouchEnd, { passive: true });
    root.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      root.removeEventListener('mousemove', onMove);
      root.removeEventListener('mousedown', onDown);
      root.removeEventListener('mouseup', onUp);
      root.removeEventListener('mouseleave', onUp);
      root.removeEventListener('touchmove', onTouchMove);
      root.removeEventListener('touchstart', onTouchStart);
      root.removeEventListener('touchend', onTouchEnd);
      root.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const render = () => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.globalCompositeOperation = 'lighter';
      const baseSize = 10 + pulseBoostRef.current * 2;
      pulseBoostRef.current *= 0.86;

      const hue = hueRef.current;
      const alpha = alphaRef.current;

      pointsRef.current.forEach((point) => {
        point.life *= DECAY;
        if (point.life < 0.02) return;
        const radius = Math.max(1, baseSize * point.life);
        const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
        gradient.addColorStop(0, `hsla(${hue} 80% 62% / ${alpha * point.life})`);
        gradient.addColorStop(1, `hsla(${hue} 80% 60% / 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      pointsRef.current = pointsRef.current.filter((p) => p.life > 0.02);
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const canvas = canvasRef.current;
    if (canvas) canvas.style.display = mq.matches ? 'none' : 'block';
    const handle = () => {
      if (canvasRef.current) canvasRef.current.style.display = mq.matches ? 'none' : 'block';
    };
    mq.addEventListener?.('change', handle);
    return () => mq.removeEventListener?.('change', handle);
  }, []);

  return <canvas ref={canvasRef} className="trail-layer" aria-hidden="true" />;
}
