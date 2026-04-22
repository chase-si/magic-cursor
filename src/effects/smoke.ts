import type { Destroyable, SmokeOptions } from "../types";
import { createCanvasLayer } from "../utils/canvas-layer";

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
  const emission = Math.max(1, options.emission ?? 2);
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
  let raf = 0;
  let lastT = 0;
  let seed = 424242;
  let targetX = root.clientWidth / 2;
  let targetY = root.clientHeight / 2;
  let lastMoveX = targetX;
  let lastMoveY = targetY;
  let lastMoveT = 0;
  let velX = 0;
  let velY = 0;
  let dirty = false;

  const TRAIL_LEN = 14;
  const FLOW_FREQ = 0.016;

  const spawn = (t: number) => {
    for (let i = 0; i < emission; i++) {
      seed = (seed * 1664525 + 1013904223) | 0;
      const u = rand(seed);
      seed = (seed * 1664525 + 1013904223) | 0;
      const v = rand(seed);

      // 惯性：把鼠标速度向量注入到初速度（轻盈、顺着方向扩散）
      const inertia = 0.18;
      const vx = velX * inertia + (u - 0.5) * (0.22 + v * 0.26);
      const vy = velY * inertia - (0.14 + v * 0.32);

      const x = targetX + (u - 0.5) * (size * 0.35);
      const y = targetY + (v - 0.5) * (size * 0.2);
      const trail: { x: number; y: number }[] = [];
      // 让烟雾一生成就是“丝状”，而不是一团点：沿初速度反向回填轨迹
      const backX = vx * 3.2;
      const backY = vy * 3.2;
      for (let k = 0; k < TRAIL_LEN; k++) {
        const kk = (TRAIL_LEN - 1 - k) / (TRAIL_LEN - 1);
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

      // 丝带：按轨迹画平滑曲线，并沿长度渐隐
      const alpha = (1 - k) ** 1.9;
      const pts = p.trail;
      if (pts.length < 2) {
        continue;
      }

      // stroke 的渐变沿轨迹方向（尾->头）
      const tail = pts[0]!;
      const head = pts[pts.length - 1]!;
      const g = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
      g.addColorStop(0, `rgba(${baseRgb.r},${baseRgb.g},${baseRgb.b},0)`);
      g.addColorStop(0.25, `rgba(${baseRgb.r},${baseRgb.g},${baseRgb.b},${0.06 * alpha})`);
      g.addColorStop(0.7, `rgba(${baseRgb.r},${baseRgb.g},${baseRgb.b},${0.18 * alpha})`);
      g.addColorStop(1, `rgba(${baseRgb.r},${baseRgb.g},${baseRgb.b},${0.24 * alpha})`);

      ctx.strokeStyle = g;
      ctx.lineWidth = Math.max(1, p.r * (0.22 + (1 - k) * 0.14));
      ctx.beginPath();
      ctx.moveTo(pts[0]!.x, pts[0]!.y);
      for (let j = 1; j < pts.length - 1; j++) {
        const p0 = pts[j]!;
        const p1 = pts[j + 1]!;
        ctx.quadraticCurveTo(p0.x, p0.y, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
      }
      const last = pts[pts.length - 1]!;
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    }

    // 轻微整体雾化（让烟更“糊”）——丝带风格需要更弱
    if (particles.length) {
      ctx.fillStyle = `rgba(${baseRgb.r},${baseRgb.g},${baseRgb.b},0.006)`;
      ctx.fillRect(0, 0, w, h);
    }
  };

  const tick = (t: number) => {
    raf = 0;
    const dt = lastT ? Math.min(32, t - lastT) : 16;
    lastT = t;

    if (dirty) {
      dirty = false;
      spawn(t);
    } else if (particles.length < 70) {
      spawn(t);
    }

    for (const p of particles) {
      const u = rand((p.seed = (p.seed * 1664525 + 1013904223) | 0));
      const tt = t * 0.001;
      // 流场/涡旋噪声：制造“丝带飘动”的卷曲
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

      // 轨迹推进：尾巴跟随头部，形成丝带
      p.trail.push({ x: p.x, y: p.y });
      while (p.trail.length > TRAIL_LEN) {
        p.trail.shift();
      }
    }

    draw(t);
    if (particles.length) {
      raf = requestAnimationFrame(tick);
    }
  };

  const ensure = () => {
    if (!raf) {
      raf = requestAnimationFrame(tick);
    }
  };

  const onMove = (e: PointerEvent) => {
    const rect = root.getBoundingClientRect();
    const x = e.clientX - rect.left - root.clientLeft;
    const y = e.clientY - rect.top - root.clientTop;
    const now = performance.now();

    const dt = lastMoveT ? Math.max(8, Math.min(40, now - lastMoveT)) : 16;
    const dx = x - lastMoveX;
    const dy = y - lastMoveY;

    // px / frame(16ms) 速度
    velX = (dx / dt) * 16;
    velY = (dy / dt) * 16;
    lastMoveX = x;
    lastMoveY = y;
    lastMoveT = now;

    targetX = x;
    targetY = y;
    dirty = true;
    ensure();
  };

  const ro = observeRootResize(() => {
    if (particles.length) {
      ensure();
    }
  });
  root.appendChild(canvas);
  root.addEventListener("pointermove", onMove);

  dirty = true;
  ensure();

  return {
    destroy() {
      root.removeEventListener("pointermove", onMove);
      if (raf) {
        cancelAnimationFrame(raf);
      }
      ro.disconnect();
      canvas.remove();
      teardownLayout();
      particles.length = 0;
    },
  };
}

