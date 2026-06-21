import type { Destroyable, SmokeOptions } from "../types";
import { createCanvasLayer } from "../utils/canvas-layer";
import {
  clearParticleEffectCanvas,
  createParticleEffectLifecycle,
} from "../utils/particle-effect-lifecycle";
import { pointerEventToMountRootPoint } from "../utils/mount-root-coordinates";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  born: number;
  life: number;
  seed: number;
  trail: { x: number; y: number }[];
  trailMax: number;
};

function rand(seed: number) {
  let x = seed | 0;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  return (x >>> 0) / 0xffffffff;
}

function parseRgbLike(input: string): { r: number; g: number; b: number } | null {
  const s = input.trim();
  const m = s.match(
    /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*(?:,\s*([0-9.]+)\s*)?\)$/i,
  );
  if (!m) return null;
  const r = Math.max(0, Math.min(255, Number(m[1])));
  const g = Math.max(0, Math.min(255, Number(m[2])));
  const b = Math.max(0, Math.min(255, Number(m[3])));
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return { r, g, b };
}

export function mountSmoke(
  root: HTMLElement,
  options: SmokeOptions = {},
): Destroyable {
  const emission = Math.max(1, options.emission ?? 3);
  const size = Math.max(4, options.size ?? 18);
  const lifeMs = Math.max(200, options.lifeMs ?? 1400);
  const rise = options.rise ?? 0.8;
  const drift = options.drift ?? 0.7;
  const color = options.color ?? "rgba(226,232,240,0.18)";
  const baseRgb = parseRgbLike(color) ?? { r: 226, g: 232, b: 240 };

  const layer = createCanvasLayer(root, {
    "data-magic-cursor-smoke": "",
    "data-magic-cursor-smoke-renderer": "canvas",
  });
  const { canvas, ctx, observeRootResize, teardownLayout } = layer;

  const particles: Particle[] = [];
  let seed = 424242;
  let lastMoveX = root.clientWidth / 2;
  let lastMoveY = root.clientHeight / 2;
  let lastMoveT = 0;
  let velX = 0;
  let velY = 0;
  /** 未进入/未移动前不发射，避免 init 时在容器中心出现烟雾 */
  let emitting = false;

  const TRAIL_LEN_BASE = 22;
  const FLOW_FREQ = 0.016;

  const spawn = (t: number, targetX: number, targetY: number) => {
    const speed = Math.hypot(velX, velY);
    const burst = Math.min(10, Math.max(2, Math.round(emission + speed * 0.05)));
    for (let i = 0; i < burst; i++) {
      seed = (seed * 1664525 + 1013904223) | 0;
      const u = rand(seed);
      seed = (seed * 1664525 + 1013904223) | 0;
      const v = rand(seed);

      const inertia = 0.18;
      const baseVx = velX * inertia + (u - 0.5) * (0.18 + v * 0.18);
      const baseVy = velY * inertia - (0.14 + v * 0.32);
      const angle = (u - 0.5) * (0.55 + speed * 0.0012);
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const sp = 0.92 + v * 0.22;
      const vx = (baseVx * ca - baseVy * sa) * sp;
      const vy = (baseVx * sa + baseVy * ca) * sp;

      const x = targetX + (u - 0.5) * (size * 0.35);
      const y = targetY + (v - 0.5) * (size * 0.2);
      const trail: { x: number; y: number }[] = [];
      const trailMax = Math.min(
        40,
        Math.max(16, Math.round(TRAIL_LEN_BASE + speed * 0.06 + v * 6)),
      );
      const back = 3.6 + speed * 0.01;
      const backX = vx * back;
      const backY = vy * back;
      for (let k = 0; k < trailMax; k++) {
        const kk = (trailMax - 1 - k) / (trailMax - 1);
        trail.push({ x: x - backX * kk, y: y - backY * kk });
      }

      particles.push({
        x,
        y,
        vx,
        vy,
        r: size * (0.75 + v * 0.9),
        born: t,
        life: lifeMs * (0.75 + u * 0.8),
        seed: seed ^ (i * 2654435761),
        trail,
        trailMax,
      });
    }
  };

  const draw = (t: number) => {
    const bw = canvas.width;
    const bh = canvas.height;
    const dpr = layer.getDpr();
    const w = root.clientWidth;
    const h = root.clientHeight;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, bw, bh);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]!;
      const age = t - p.born;
      const k = age / p.life;
      if (k >= 1) {
        particles.splice(i, 1);
        i--;
        continue;
      }

      const alpha = (1 - k) ** 1.9;
      const pts = p.trail;
      if (pts.length < 2) {
        continue;
      }

      const tt = t * 0.001;
      const vlen = Math.hypot(p.vx, p.vy);
      const vdx = vlen > 1e-3 ? p.vx / vlen : 0;
      const vdy = vlen > 1e-3 ? p.vy / vlen : 0;
      const waveFreq = 4.2 + ((p.seed >>> 3) % 1000) / 1000;
      const wavePhase = ((p.seed >>> 9) % 2048) * 0.01;
      const wpts = pts.map((pt, j) => {
        const prev = pts[Math.max(0, j - 1)]!;
        const next = pts[Math.min(pts.length - 1, j + 1)]!;
        const tx0 = next.x - prev.x;
        const ty0 = next.y - prev.y;
        const tlen0 = Math.hypot(tx0, ty0) || 1;
        const tdx = tx0 / tlen0;
        const tdy = ty0 / tlen0;

        const mix = vlen > 1e-3 ? 0.78 : 0.0;
        const dx = vdx * mix + tdx * (1 - mix);
        const dy = vdy * mix + tdy * (1 - mix);
        const dlen = Math.hypot(dx, dy) || 1;
        const nx = -(dy / dlen);
        const ny = dx / dlen;
        const tailW = 1 - j / Math.max(1, pts.length - 1);
        const amp = Math.min(3.2, Math.max(0.6, p.r * 0.11)) * tailW * (0.55 + 0.7 * alpha);
        const phase = tt * waveFreq + j * (0.85 + ((p.seed >>> 5) % 100) / 600) + wavePhase;
        const off = Math.sin(phase) * amp;
        return { x: pt.x + nx * off, y: pt.y + ny * off };
      });

      const tail = wpts[0]!;
      const head = wpts[wpts.length - 1]!;
      const g = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
      g.addColorStop(0, `rgba(${baseRgb.r},${baseRgb.g},${baseRgb.b},0)`);
      g.addColorStop(0.25, `rgba(${baseRgb.r},${baseRgb.g},${baseRgb.b},${0.06 * alpha})`);
      g.addColorStop(0.7, `rgba(${baseRgb.r},${baseRgb.g},${baseRgb.b},${0.18 * alpha})`);
      g.addColorStop(1, `rgba(${baseRgb.r},${baseRgb.g},${baseRgb.b},${0.24 * alpha})`);

      ctx.strokeStyle = g;
      ctx.lineWidth = Math.max(1, p.r * (0.22 + (1 - k) * 0.14));
      ctx.beginPath();
      ctx.moveTo(wpts[0]!.x, wpts[0]!.y);
      for (let j = 1; j < wpts.length - 1; j++) {
        const p0 = wpts[j]!;
        const p1 = wpts[j + 1]!;
        ctx.quadraticCurveTo(p0.x, p0.y, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
      }
      const last = wpts[wpts.length - 1]!;
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    }

    if (particles.length) {
      ctx.fillStyle = `rgba(${baseRgb.r},${baseRgb.g},${baseRgb.b},0.006)`;
      ctx.fillRect(0, 0, w, h);
    }
  };

  const clearImmediate = () => {
    particles.length = 0;
    velX = 0;
    velY = 0;
    lastMoveT = 0;
    emitting = false;
    lifecycle.cancelFrame();
    clearParticleEffectCanvas(ctx, canvas);
  };

  const stopEmitting = () => {
    emitting = false;
    velX = 0;
    velY = 0;
    lastMoveT = 0;
    if (!particles.length) {
      clearParticleEffectCanvas(ctx, canvas);
    }
  };

  const lifecycle = createParticleEffectLifecycle({
    root,
    hasParticles: () => particles.length > 0,
    pointerLeaveBehavior: "fade",
    onPointerLeaveFade: stopEmitting,
    onFrame: ({ timestamp: t, deltaMs: dt, dirty: frameDirty, clearDirty }) => {
      const { x: targetX, y: targetY } = lifecycle.getTarget();
      if (emitting && frameDirty) {
        clearDirty();
        spawn(t, targetX, targetY);
      } else if (emitting && particles.length < 70) {
        spawn(t, targetX, targetY);
      }

      for (const p of particles) {
        const u = rand((p.seed = (p.seed * 1664525 + 1013904223) | 0));
        const tt = t * 0.001;
        const n1 =
          Math.sin((p.x + p.seed * 0.01) * FLOW_FREQ + tt * 1.8) +
          Math.cos((p.y - p.seed * 0.02) * FLOW_FREQ - tt * 1.4);
        const n2 =
          Math.cos((p.x - p.seed * 0.015) * (FLOW_FREQ * 1.07) - tt * 1.2) -
          Math.sin((p.y + p.seed * 0.01) * (FLOW_FREQ * 0.93) + tt * 2.0);

        const ax = (n1 * 0.06 + (u - 0.5) * 0.02) * drift;
        const ay = (n2 * 0.035) * drift;

        p.vx += ax;
        p.vy += ay;
        p.vx *= 0.985;
        p.vy *= 0.99;

        p.y += (p.vy - rise * 0.04) * (dt / 16);
        p.x += p.vx * (dt / 16);

        p.trail.push({ x: p.x, y: p.y });
        while (p.trail.length > p.trailMax) {
          p.trail.shift();
        }
      }

      draw(t);
    },
  });

  const onMove = (e: PointerEvent) => {
    const { x, y } = pointerEventToMountRootPoint(root, e);
    const now = performance.now();

    emitting = true;
    const dt = lastMoveT ? Math.max(8, Math.min(40, now - lastMoveT)) : 16;
    const dx = x - lastMoveX;
    const dy = y - lastMoveY;

    velX = (dx / dt) * 16;
    velY = (dy / dt) * 16;
    lastMoveX = x;
    lastMoveY = y;
    lastMoveT = now;

    lifecycle.handlePointerMove(e);
  };

  const onLeave = () => {
    lifecycle.handlePointerLeave();
  };

  const ro = observeRootResize(() => {
    lifecycle.onRootResize();
  });
  root.appendChild(canvas);
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerleave", onLeave);
  root.addEventListener("pointercancel", onLeave);

  return {
    destroy() {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointercancel", onLeave);
      clearImmediate();
      lifecycle.destroy();
      ro.disconnect();
      canvas.remove();
      teardownLayout();
    },
  };
}
