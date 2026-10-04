import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, effect, inject, input } from '@angular/core';
import { MtOptions } from '../../core/mt-config';
import { ScrollEngine } from '../../core/scroll-engine';
import { MtNavDots } from '../nav-dots/mt-nav-dots';
import { MtScrollIndicator } from '../scroll-indicator/mt-scroll-indicator';

/**
 * Khung bao toàn trang: đặt các <mt-section> bên trong.
 * Tự gắn Scroll Down indicator và Navigation Dots.
 *
 * @example
 *   <mt-fullscreen [options]="{ scroll: { duration: 1200 }, dots: { enabled: false } }">
 *     <mt-section></mt-section>
 *     <mt-section></mt-section>
 *   </mt-fullscreen>
 */
@Component({
  selector: 'mt-fullscreen',
  imports: [MtNavDots, MtScrollIndicator],
  providers: [ScrollEngine],
  template: `
    <ng-content />
    <mt-nav-dots />
    <mt-scroll-indicator />
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtFullscreen {
  private readonly engine = inject(ScrollEngine);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Ghi đè cấu hình (scroll / animation / indicator / dots) cho trang này. */
  readonly options = input<MtOptions>({});

  constructor() {
    effect(() => this.engine.setOptions(this.options()));
    afterNextRender(() => this.engine.start(this.host));
  }
}
