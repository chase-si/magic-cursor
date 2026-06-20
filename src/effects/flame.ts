import type { Destroyable, FlameOptions } from "../types";
import { createCanvasLayer } from "../utils/canvas-layer";
import {
  bindParticleEffectPointerLifecycle,
  clearParticleEffectCanvas,
  createParticleEffectLifecycle,
} from "../utils/particle-effect-lifecycle";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  born: number;
  life: number;
  seed: number;
};

function rand(seed: number) {
  // xorshift32
  let x = seed | 0;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  return (x >>> 0) / 0xffffffff;
}

export function mountFlame(
  root: HTMLElement,
  options: FlameOptions = {},
): Destroyable {
  const emission = Math.max(1, options.emission ?? 2);
  const size = Math.max(2, options.size ?? 10);
  const lifeMs = Math.max(120, options.lifeMs ?? 700);
  const rise = options.rise ?? 1.6;
  const jitter = options.jitter ?? 0.9;

  const layer = createCanvasLayer(root, {
    "data-magic-cursor-flame": "",
    "data-magic-cursor-flame-renderer": "canvas",
  });
  const { canvas, ctx, observeRootResize, teardownLayout } = layer;

  const particles: Particle[] = [];
  let seed = 1337;

  const spawn = (t: number, targetX: number, targetY: number) => {
    for (let i = 0; i < emission; i++) {
      seed = (seed * 1664525 + 1013904223) | 0;
      const u = rand(seed);
      seed = (seed * 1664525 + 1013904223) | 0;
      const v = rand(seed);
      const angle = (u - 0.5) * 0.9;
      const speed = 0.3 + v * 0.9;
      const vx = Math.sin(angle) * speed;
      const vy = -speed * (0.9 + v * 0.8);
      particles.push({
        x: targetX + (u - 0.5) * (size * 0.6),
        y: targetY + (v - 0.5) * (size * 0.2),
        vx,
        vy,
        r: size * (0.55 + v * 0.6),
        born: t,
        life: lifeMs * (0.75 + u * 0.6),
        seed: seed ^ (i * 2654435761),
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

    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]!;
      const age = t - p.born;
      const k = age / p.life;
      if (k >= 1) {
        particles.splice(i, 1);
        i--;
        continue;
      }

      const alpha = Math.max(0, 1 - k) ** 1.2;
      const heat = 1 - k;
      const rr = Math.max(1.5, p.r * (0.85 + heat * 0.55));

      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
      g.addColorStop(0, `rgba(255, 250, 220, ${0.75 * alpha})`);
      g.addColorStop(0.35, `rgba(255, 170, 64, ${0.55 * alpha})`);
      g.addColorStop(0.75, `rgba(255, 64, 64, ${0.32 * alpha})`);
      g.addColorStop(1, "rgba(255, 64, 64, 0)");

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";

    if (particles.length) {
      const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.1, w / 2, h / 2, Math.max(w, h) * 0.75);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.15)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    }
  };

  const lifecycle = createParticleEffectLifecycle({
    root,
    hasParticles: () => particles.length > 0,
    pointerLeaveBehavior: "clear",
    onPointerLeaveClear: () => {
      particles.length = 0;
      clearParticleEffectCanvas(ctx, canvas);
    },
    initialDirty: true,
    autoStart: true,
    onFrame: ({ timestamp: t, deltaMs: dt, dirty: frameDirty, clearDirty }) => {
      const { x: targetX, y: targetY } = lifecycle.getTarget();
      if (frameDirty) {
        clearDirty();
        spawn(t, targetX, targetY);
      } else if (particles.length < 80) {
        spawn(t, targetX, targetY);
      }

      for (const p of particles) {
        const u = rand((p.seed = (p.seed * 1664525 + 1013904223) | 0));
        p.vx += (u - 0.5) * (jitter * 0.02);
        p.vx *= 0.98;
        p.vy *= 0.992;
        p.y += (p.vy - rise * 0.06) * (dt / 16);
        p.x += p.vx * (dt / 16);
      }

      draw(t);
    },
  });

  const pointerBinding = bindParticleEffectPointerLifecycle({
    root,
    lifecycle,
  });

  const ro = observeRootResize(() => {
    lifecycle.onRootResize();
  });
  root.appendChild(canvas);

  return {
    destroy() {
      pointerBinding.destroy();
      ro.disconnect();
      canvas.remove();
      teardownLayout();
      particles.length = 0;
    },
  };
}
