import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ScrollEngine } from '../../core/scroll-engine';

/**
 * Icon mũi tên "Scroll Down" ở cuối màn hình.
 * Nhấn → cuộn tới section kế tiếp. Ở section cuối → hướng lên & quay về đầu trang.
 * Bật/tắt & đổi chữ qua cấu hình `indicator`.
 */
@Component({
  selector: 'mt-scroll-indicator',
  template: `
    @if (visible()) {
      <button
        type="button"
        class="indicator"
        [class.is-up]="up()"
        [class.is-reduced]="engine.reducedMotion()"
        [attr.aria-label]="label()"
        (click)="engine.advance()"
      >
        @if (showLabel()) {
          <span class="indicator__label">{{ label() }}</span>
        }
        <span class="indicator__icon" aria-hidden="true">
          <svg class="indicator__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v13" />
            <path d="M6 13l6 6 6-6" />
          </svg>
        </span>
      </button>
    }
  `,
  styleUrl: './mt-scroll-indicator.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtScrollIndicator {
  protected readonly engine = inject(ScrollEngine);
  private readonly cfg = computed(() => this.engine.config().indicator);

  protected readonly up = computed(() => this.engine.isLast() && this.cfg().onLast === 'to-top');
  protected readonly visible = computed(() => {
    const c = this.cfg();
    if (!c.enabled || this.engine.count() < 2) return false;
    return !(this.engine.isLast() && c.onLast === 'hide');
  });
  protected readonly showLabel = computed(() => this.cfg().showLabel);
  protected readonly label = computed(() => (this.up() ? this.cfg().labelLast : this.cfg().label));
}
