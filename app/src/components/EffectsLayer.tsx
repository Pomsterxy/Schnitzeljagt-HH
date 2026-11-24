import { useEffect, useRef, useState } from 'react';
import { PARTY, registerEffects, type BurstOptions, type FloatOptions, type Shape } from '../lib/effects';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  tilt: number;
  vt: number;
  size: number;
  color: string;
  shape: Shape;
  emoji?: string;
  gravity: number;
  life: number;
  max: number;
}

/** Eine Zeichenfläche über der App, auf der alle Effekte laufen */
export function EffectsLayer() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const parts = useRef<Particle[]>([]);
  const raf = useRef<number | null>(null);
  const [floats, setFloats] = useState<(FloatOptions & { id: number })[]>([]);
  const [flashes, setFlashes] = useState<{ id: number; color: string }[]>([]);

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext('2d');
    let id = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = window.innerWidth * dpr;
      cv.height = window.innerHeight * dpr;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const star = (c: CanvasRenderingContext2D, r: number) => {
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rr = i % 2 === 0 ? r : r * 0.45;
        c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      c.closePath();
      c.fill();
    };

    const tick = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const list = parts.current;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + p.gravity;
        p.x += p.vx + Math.sin(p.life / 9 + p.tilt) * 0.6;
        p.y += p.vy;
        p.rot += p.vr;
        p.tilt += p.vt;
        p.life++;
        const fade = Math.min(1, (p.max - p.life) / 30);
        if (p.life > p.max || p.y > window.innerHeight + 40) {
          list.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0, fade);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.emoji) {
          ctx.font = `${p.size * 2.4}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.emoji, 0, 0);
        } else {
          ctx.fillStyle = p.color;
          // "Flattern": Breite schwankt wie bei echtem Papier
          const sx = Math.abs(Math.cos(p.tilt));
          if (p.shape === 'circle') {
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size * 0.5, p.size * 0.5 * (0.4 + sx * 0.6), 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.shape === 'star') {
            ctx.scale(1, 0.5 + sx * 0.5);
            star(ctx, p.size * 0.7);
          } else if (p.shape === 'ribbon') {
            ctx.scale(sx, 1);
            ctx.fillRect(-p.size * 0.2, -p.size, p.size * 0.4, p.size * 2);
          } else {
            ctx.scale(sx, 1);
            ctx.fillRect(-p.size * 0.5, -p.size * 0.32, p.size, p.size * 0.64);
          }
        }
        ctx.restore();
      }
      raf.current = list.length ? requestAnimationFrame(tick) : null;
      if (!list.length) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };

    const start = () => {
      if (raf.current === null) raf.current = requestAnimationFrame(tick);
    };

    registerEffects({
      burst: (o: BurstOptions) => {
        const x = o.x ?? window.innerWidth / 2;
        const y = o.y ?? window.innerHeight * 0.35;
        const count = o.count ?? 60;
        const spread = ((o.spread ?? 70) * Math.PI) / 180;
        const angle = ((o.angle ?? -90) * Math.PI) / 180;
        const power = o.power ?? 12;
        const colors = o.colors ?? PARTY;
        const shapes = o.shapes ?? ['rect', 'rect', 'circle', 'ribbon', 'star'];
        const scalar = o.scalar ?? 1;
        // nicht unendlich viele Teilchen gleichzeitig (ältere Handys)
        if (parts.current.length > 600) parts.current.splice(0, parts.current.length - 600);
        for (let i = 0; i < count; i++) {
          const a = angle + (Math.random() - 0.5) * spread;
          const v = power * (0.45 + Math.random() * 0.75);
          parts.current.push({
            x,
            y,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            rot: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 0.3,
            tilt: Math.random() * Math.PI * 2,
            vt: 0.08 + Math.random() * 0.15,
            size: (7 + Math.random() * 6) * scalar,
            color: colors[(Math.random() * colors.length) | 0],
            shape: shapes[(Math.random() * shapes.length) | 0],
            emoji: o.emoji ? o.emoji[(Math.random() * o.emoji.length) | 0] : undefined,
            gravity: o.gravity ?? 0.3,
            life: 0,
            max: 150 + Math.random() * 90,
          });
        }
        start();
      },
      float: (f) => {
        const fid = ++id;
        setFloats((l) => [...l, { ...f, id: fid }]);
        setTimeout(() => setFloats((l) => l.filter((x) => x.id !== fid)), 1400);
      },
      clear: () => {
        parts.current.length = 0;
        setFloats([]);
        setFlashes([]);
      },
      flash: (color) => {
        const fid = ++id;
        setFlashes((l) => [...l, { id: fid, color }]);
        setTimeout(() => setFlashes((l) => l.filter((x) => x.id !== fid)), 700);
      },
    });

    return () => {
      registerEffects(null);
      window.removeEventListener('resize', resize);
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <>
      {flashes.map((f) => (
        <div key={f.id} className="fx-flash" style={{ background: `radial-gradient(circle at 50% 40%, ${f.color}, transparent 70%)` }} aria-hidden="true" />
      ))}
      <canvas ref={canvas} className="fx-canvas" aria-hidden="true" />
      {floats.map((f) => (
        <span key={f.id} className="fx-float" style={{ left: f.x, top: f.y, color: f.color }} aria-hidden="true">
          {f.text}
        </span>
      ))}
    </>
  );
}
