import { MtEasing, MtEasingName } from './mt-config';

const EASINGS: Record<MtEasingName, (t: number) => number> = {
  linear: (t) => t,
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  easeInOutExpo: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  easeOutQuint: (t) => 1 - Math.pow(1 - t, 5),
};

/** Chuyển tên easing (hoặc hàm tuỳ chỉnh) thành hàm easing. */
export function resolveEasing(easing: MtEasing): (t: number) => number {
  return typeof easing === 'function' ? easing : (EASINGS[easing] ?? EASINGS.easeInOutCubic);
}
