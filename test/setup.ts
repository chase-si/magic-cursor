import { vi } from "vitest";

const createGradientMock = () => ({
  addColorStop: vi.fn(),
});

const createContextMock = () => ({
  arc: vi.fn(),
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  createLinearGradient: vi.fn(createGradientMock),
  createRadialGradient: vi.fn(createGradientMock),
  fill: vi.fn(),
  fillRect: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
  fillStyle: "",
  globalAlpha: 1,
  globalCompositeOperation: "source-over",
  lineCap: "butt",
  lineJoin: "miter",
  lineWidth: 1,
  strokeStyle: "",
});

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: vi.fn(() => createContextMock()),
});

class ResizeObserverMock implements ResizeObserver {
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();
}

Object.defineProperty(globalThis, "ResizeObserver", {
  configurable: true,
  value: ResizeObserverMock,
});

let rafId = 0;
Object.defineProperty(globalThis, "requestAnimationFrame", {
  configurable: true,
  value: vi.fn(() => ++rafId),
});
Object.defineProperty(globalThis, "cancelAnimationFrame", {
  configurable: true,
  value: vi.fn(),
});
