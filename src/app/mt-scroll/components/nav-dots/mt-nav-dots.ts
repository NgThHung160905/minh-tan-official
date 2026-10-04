import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ScrollEngine } from '../../core/scroll-engine';

/**
 * Các chấm điều hướng nhỏ ở cạnh màn hình — mỗi chấm = một section (tự sinh theo số section thực tế).
 * Bật/tắt & đổi cạnh qua cấu hình `dots`.
 */
@Component({
  selector: 'mt-nav-dots',
  template: `
    @if (visible()) {
      <nav class="dots" [class.dots--left]="position() === 'left'" aria-label="Section navigation">
        @for (i of indices(); track i) {
          <button
            type="button"
            class="dot"
            [class.is-active]="i === engine.activeIndex()"
            [attr.aria-label]="'Go to section ' + (i + 1)"
            [attr.aria-current]="i === engine.activeIndex() ? 'true' : null"
            (click)="engine.goTo(i)"
          >
            <span class="dot__mark"></span>
          </button>
        }
      </nav>
    }
  `,
  styleUrl: './mt-nav-dots.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtNavDots {
  protected readonly engine = inject(ScrollEngine);
  private readonly cfg = computed(() => this.engine.config().dots);

  protected readonly visible = computed(() => this.cfg().enabled && this.engine.count() > 1);
  protected readonly position = computed(() => this.cfg().position);
  protected readonly indices = computed(() => Array.from({ length: this.engine.count() }, (_, i) => i));
}
