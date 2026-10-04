import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

/** Phần ảnh bị cắt tối đa (0–1) mà ta còn chấp nhận khi phủ kín bằng `cover`. */
const MAX_CROP = 0.18;
/** Bề rộng vùng viền ảnh hoà dần vào nền (không đổi kích thước ảnh). */
const FEATHER = '14%';

/**
 * Ảnh toàn màn hình, không méo, không chỉnh màu, không đổi nội dung.
 *
 * - Tỉ lệ ảnh gần với màn hình (mất ≤ 18%)  → `cover`: phủ kín, cắt rất ít.
 * - Tỉ lệ lệch nhiều (VD ảnh vuông trên màn hình ngang, ảnh ngang trên điện thoại)
 *   → `contain`: hiện TRỌN VẸN ảnh, phần thừa của màn hình được lấp bằng chính ảnh đó (làm mờ),
 *   nên màn hình vẫn kín mà không mất chủ thể.
 *
 * Ảnh đầu tiên (`priority`) tải ngay; các ảnh khác `loading="lazy"` + fade-in khi xong.
 */
@Component({
  selector: 'mt-photo',
  templateUrl: './mt-photo.html',
  styleUrl: './mt-photo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-fit]': 'fit()',
    '[class.is-loaded]': 'loaded()',
    '[style.--ar]': 'ratio()',
    '[style.--fx]': 'featherX()',
    '[style.--fy]': 'featherY()',
    '(window:resize)': 'measure()',
    '(window:orientationchange)': 'measure()',
  },
})
export class MtPhoto {
  readonly src = input.required<string>();
  readonly alt = input<string>('');
  readonly width = input.required<number>();
  readonly height = input.required<number>();
  /** object-position khi dùng `cover` (giữ chủ thể trong khung). */
  readonly focus = input<string>('50% 50%');
  /** Ảnh ưu tiên tải trước (section đầu tiên). */
  readonly priority = input<boolean>(false);

  protected readonly loaded = signal(false);
  private readonly viewportRatio = signal(this.read());

  protected readonly fit = computed<'cover' | 'contain'>(() => {
    const a = this.width() / this.height();
    const v = this.viewportRatio();
    const crop = 1 - Math.min(a, v) / Math.max(a, v);
    return crop <= MAX_CROP ? 'cover' : 'contain';
  });

  protected readonly ratio = computed(() => this.width() / this.height());

  /** Độ mềm viền ảnh (tính theo kích thước ảnh) ở trục có khoảng thừa; 0 = viền cứng. */
  protected readonly featherX = computed(() =>
    this.fit() === 'contain' && this.viewportRatio() > this.ratio() ? FEATHER : '0%',
  );
  protected readonly featherY = computed(() =>
    this.fit() === 'contain' && this.viewportRatio() <= this.ratio() ? FEATHER : '0%',
  );

  protected measure(): void {
    this.viewportRatio.set(this.read());
  }

  private read(): number {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    return w / h;
  }

  protected onLoad(img: HTMLImageElement): void {
    // decode() tránh nháy ảnh nửa vời với file độ phân giải cao.
    (img.decode ? img.decode().catch(() => undefined) : Promise.resolve()).then(() => this.loaded.set(true));
  }
}
