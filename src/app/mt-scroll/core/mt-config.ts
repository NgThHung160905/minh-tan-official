import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

/**
 * ============================================================
 *  MT SCROLL — CẤU HÌNH TRUNG TÂM
 *  Mọi thông số về scroll / animation / indicator / dots đều ở đây.
 *  Có thể ghi đè theo 3 cấp:
 *    1. Mặc định (file này)
 *    2. Toàn app:   provideMtScroll({ ... })   trong app.config.ts
 *    3. Từng trang: <mt-fullscreen [options]="{ ... }">
 *  Riêng animation còn ghi đè được theo từng section: <mt-section animation="blur">
 * ============================================================
 */

/** Các kiểu hiệu ứng có thể kết hợp với nhau, ví dụ: ['fade', 'slide', 'blur']. */
export type MtAnimation = 'none' | 'fade' | 'slide' | 'scale' | 'blur';

/** Tên các hàm easing có sẵn cho scroll (xem easing.ts). */
export type MtEasingName =
  | 'linear'
  | 'easeInOutSine'
  | 'easeInOutQuad'
  | 'easeInOutCubic'
  | 'easeInOutQuart'
  | 'easeInOutExpo'
  | 'easeOutQuint';

export type MtEasing = MtEasingName | ((t: number) => number);

export interface MtScrollOptions {
  /** Thời gian chuyển 1 section (ms). Chuyển nhiều section sẽ tự kéo dài thêm. */
  duration: number;
  /** Easing của chuyển động cuộn. */
  easing: MtEasing;
  /** Bật điều khiển bằng con lăn / touchpad. */
  wheel: boolean;
  /** Bật điều khiển bằng bàn phím (↑ ↓ PgUp PgDn Space Home End). */
  keyboard: boolean;
  /** Ngưỡng deltaY tối thiểu để tính là 1 thao tác cuộn (lọc nhiễu touchpad). */
  wheelThreshold: number;
  /** Khoảng nghỉ (ms) sau khi chuyển cảnh xong, trước khi nhận thao tác mới. */
  cooldown: number;
  /** Khoảng lặng (ms) để coi là một cử chỉ cuộn mới (lọc quán tính touchpad). */
  gestureGap: number;
  /** Hạ chuyển động xuống tối thiểu khi hệ điều hành bật prefers-reduced-motion. */
  respectReducedMotion: boolean;
}

export interface MtAnimationOptions {
  /** Kiểu hiệu ứng mặc định cho mọi section. */
  type: MtAnimation | MtAnimation[];
  /** Thời gian animation (ms). */
  duration: number;
  /** Easing CSS (cubic-bezier, ease-out, ...). */
  easing: string;
  /** Quãng trượt của hiệu ứng slide (đơn vị CSS). */
  slideDistance: string;
  /** Tỉ lệ ban đầu của hiệu ứng scale (0 – 1). */
  scaleFrom: number;
  /** Độ mờ ban đầu của hiệu ứng blur (đơn vị CSS). */
  blurFrom: string;
}

export interface MtIndicatorOptions {
  /** Bật / tắt icon Scroll Down. */
  enabled: boolean;
  /** Hiện dòng chữ cạnh icon. */
  showLabel: boolean;
  /** Chữ hiển thị ở các section thường. */
  label: string;
  /** Chữ hiển thị ở section cuối (khi icon quay lên). */
  labelLast: string;
  /** Ở section cuối: 'to-top' = icon hướng lên & quay về đầu, 'hide' = ẩn icon. */
  onLast: 'to-top' | 'hide';
}

export interface MtDotsOptions {
  /** Bật / tắt Navigation Dots. */
  enabled: boolean;
  /** Cạnh màn hình đặt chấm. */
  position: 'left' | 'right';
}

export interface MtConfig {
  scroll: MtScrollOptions;
  animation: MtAnimationOptions;
  indicator: MtIndicatorOptions;
  dots: MtDotsOptions;
}

/** Bản ghi đè một phần cấu hình. */
export type MtOptions = {
  [K in keyof MtConfig]?: Partial<MtConfig[K]>;
};

export const MT_DEFAULT_CONFIG: MtConfig = {
  scroll: {
    duration: 900,
    easing: 'easeInOutCubic',
    wheel: true,
    keyboard: true,
    wheelThreshold: 8,
    cooldown: 120,
    gestureGap: 90,
    respectReducedMotion: true,
  },
  animation: {
    type: ['fade', 'slide'],
    duration: 900,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    slideDistance: '12vh',
    scaleFrom: 0.92,
    blurFrom: '16px',
  },
  indicator: {
    enabled: true,
    showLabel: true,
    label: 'SCROLL DOWN',
    labelLast: 'BACK TO TOP',
    onLast: 'to-top',
  },
  dots: {
    enabled: true,
    position: 'right',
  },
};

/** Trộn cấu hình (nông theo từng nhóm). Giá trị `undefined` bị bỏ qua. */
export function mergeConfig(base: MtConfig, ...overrides: (MtOptions | undefined)[]): MtConfig {
  const result: MtConfig = {
    scroll: { ...base.scroll },
    animation: { ...base.animation },
    indicator: { ...base.indicator },
    dots: { ...base.dots },
  };
  for (const o of overrides) {
    if (!o) continue;
    for (const group of Object.keys(result) as (keyof MtConfig)[]) {
      const patch = o[group] as Record<string, unknown> | undefined;
      if (!patch) continue;
      const target = result[group] as unknown as Record<string, unknown>;
      for (const [key, value] of Object.entries(patch)) {
        if (value !== undefined) target[key] = value;
      }
    }
  }
  return result;
}

export const MT_CONFIG = new InjectionToken<MtConfig>('MT_CONFIG', {
  providedIn: 'root',
  factory: () => MT_DEFAULT_CONFIG,
});

/** Ghi đè cấu hình mặc định cho toàn ứng dụng. */
export function provideMtScroll(options: MtOptions = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: MT_CONFIG, useValue: mergeConfig(MT_DEFAULT_CONFIG, options) },
  ]);
}
