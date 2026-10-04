import { Directive, ElementRef, afterNextRender, inject, signal } from '@angular/core';

/**
 * Lazy loading cho ảnh / iframe thêm vào sau này.
 * Dùng: <img mtLazy src="..." alt="..." width="1920" height="1080" />
 *
 * - `loading="lazy"` + `decoding="async"`: trình duyệt chỉ tải khi gần tới viewport.
 * - Tự fade-in khi tải xong (class `is-loaded`, xem styles.css).
 * - Nhớ khai báo width/height (hoặc aspect-ratio) để tránh nhảy layout.
 */
@Directive({
  selector: 'img[mtLazy], iframe[mtLazy]',
  host: {
    loading: 'lazy',
    decoding: 'async',
    class: 'mt-lazy',
    '[class.is-loaded]': 'loaded()',
    '(load)': 'loaded.set(true)',
    '(error)': 'loaded.set(true)',
  },
})
export class MtLazy {
  protected readonly loaded = signal(false);

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    // Ảnh đã nằm trong cache có thể hoàn tất trước khi listener gắn vào.
    afterNextRender(() => {
      if (el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0) this.loaded.set(true);
    });
  }
}
