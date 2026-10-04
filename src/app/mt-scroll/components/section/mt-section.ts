import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output, effect, untracked, OnDestroy } from '@angular/core';
import { MtAnimation } from '../../core/mt-config';
import { ScrollEngine } from '../../core/scroll-engine';

export type MtSectionState = 'before' | 'active' | 'after';

const VALID: readonly MtAnimation[] = ['fade', 'slide', 'scale', 'blur'];

/**
 * Một section toàn màn hình (100vw × 100svh), độc lập hoàn toàn.
 *
 * Thêm / xoá / đổi thứ tự chỉ cần sửa HTML — bộ điều phối tự nhận biết.
 * Nội dung đặt thẳng bên trong thẻ; mặc định để trống.
 *
 * Trạng thái (`data-state`) để bạn tự tạo animation cho phần tử con:
 *   mt-section[data-state="active"]  → đang hiển thị
 *   mt-section[data-state="before"]  → nằm phía trên (đã đi qua)
 *   mt-section[data-state="after"]   → nằm phía dưới (chưa tới)
 *
 * @example
 *   <mt-section animation="blur" [duration]="1200">…</mt-section>
 *   <mt-section [animation]="['fade','scale']" background="#111">…</mt-section>
 */
@Component({
  selector: 'mt-section',
  template: `<div class="mt-section__stage"><ng-content /></div>`,
  styleUrl: './mt-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-state]': 'state()',
    '[attr.data-anim]': 'animTokens()',
    '[attr.data-reduced]': 'reduced()',
    '[style.--mt-duration]': 'durationCss()',
    '[style.--mt-easing]': 'easingCss()',
    '[style.--mt-slide-distance]': 'engine.config().animation.slideDistance',
    '[style.--mt-scale-from]': 'engine.config().animation.scaleFrom',
    '[style.--mt-blur-from]': 'engine.config().animation.blurFrom',
    '[style.background]': 'background()',
  },
})
export class MtSection implements OnDestroy {
  protected readonly engine = inject(ScrollEngine);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Ghi đè kiểu animation của riêng section này. */
  readonly animation = input<MtAnimation | MtAnimation[] | string>();
  /** Ghi đè thời gian animation (ms). */
  readonly duration = input<number>();
  /** Ghi đè easing CSS. */
  readonly easing = input<string>();
  /** Nền của section (giá trị CSS `background`). Mặc định trong suốt. */
  readonly background = input<string>();

  /** Phát ra khi section bắt đầu đi vào viewport. */
  readonly entered = output<void>();
  /** Phát ra khi section bắt đầu rời viewport. */
  readonly left = output<void>();

  protected readonly index = computed(() => this.engine.sections().indexOf(this.element));

  protected readonly state = computed<MtSectionState>(() => {
    const i = this.index();
    if (!this.engine.ready() || i < 0) return 'after';
    const active = this.engine.activeIndex();
    return i === active ? 'active' : i < active ? 'before' : 'after';
  });

  protected readonly reduced = computed(() => this.engine.reducedMotion());

  protected readonly animTokens = computed(() => {
    const raw = this.animation() ?? this.engine.config().animation.type;
    const list = Array.isArray(raw) ? raw : String(raw).split(/\s+/);
    return VALID.filter((v) => list.includes(v)).join(' ');
  });

  protected readonly durationCss = computed(
    () => `${this.duration() ?? this.engine.config().animation.duration}ms`,
  );
  protected readonly easingCss = computed(() => this.easing() ?? this.engine.config().animation.easing);

  private previous: MtSectionState | null = null;

  constructor() {
    this.engine.register(this.element);

    // Phát sự kiện entered/left đúng một lần cho mỗi lần đổi trạng thái.
    effect(() => {
      const current = this.state();
      untracked(() => {
        if (this.previous !== null) {
          if (current === 'active') this.entered.emit();
          else if (this.previous === 'active') this.left.emit();
        }
        this.previous = current;
      });
    });
  }

  ngOnDestroy(): void {
    this.engine.unregister(this.element);
  }
}
