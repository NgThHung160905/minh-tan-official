import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { MT_CONFIG, MtOptions, mergeConfig } from './mt-config';
import { resolveEasing } from './easing';
import { ScrollAnimator } from './scroll-animator';
import {
  StepDirection,
  WheelGestureFilter,
  isActivatableTarget,
  isTextEntryTarget,
  shouldUseNativeScroll,
} from './scroll-input';

const ROOT_CLASS = 'mt-fullscreen';
const ANIMATING_CLASS = 'mt-is-animating';
const ACTIVATION_RATIO = 0.5;

/**
 * Bộ điều phối trung tâm — được cung cấp bởi <mt-fullscreen>.
 *
 * Chiến lược cuộn (lai native + JS tối thiểu):
 *  • Vuốt cảm ứng / kéo: HOÀN TOÀN native (CSS scroll-snap mandatory + scroll-snap-stop: always),
 *    nên không bao giờ bị khoá và không bỏ qua section.
 *  • Con lăn / bàn phím: chặn mặc định rồi chuyển đúng 1 section bằng ScrollAnimator
 *    (thời gian & easing tuỳ chỉnh). Phần quán tính touchpad được lọc bỏ.
 *  • Section đang hiển thị được xác định bằng IntersectionObserver (không lắng nghe sự kiện scroll).
 */
@Injectable()
export class ScrollEngine {
  private readonly doc = inject(DOCUMENT);
  private readonly win = this.doc.defaultView as Window;
  private readonly root = this.doc.documentElement;
  private readonly baseConfig = inject(MT_CONFIG);
  private readonly options = signal<MtOptions>({});

  /** Cấu hình hiệu lực = mặc định ⊕ provideMtScroll() ⊕ [options] của <mt-fullscreen>. */
  readonly config = computed(() => mergeConfig(this.baseConfig, this.options()));

  private readonly _sections = signal<readonly HTMLElement[]>([]);
  readonly sections = this._sections.asReadonly();
  readonly count = computed(() => this._sections().length);

  private readonly _activeIndex = signal(0);
  readonly activeIndex = this._activeIndex.asReadonly();
  readonly isFirst = computed(() => this._activeIndex() === 0);
  readonly isLast = computed(() => this.count() > 0 && this._activeIndex() === this.count() - 1);

  /** Chỉ true sau khung hình đầu tiên → để section đầu tiên có hiệu ứng vào cảnh. */
  readonly ready = signal(false);

  private readonly systemReducedMotion = signal(false);
  readonly reducedMotion = computed(
    () => this.config().scroll.respectReducedMotion && this.systemReducedMotion(),
  );

  private readonly animator = new ScrollAnimator(this.win);
  private readonly wheelFilter = new WheelGestureFilter(
    () => this.config().scroll.wheelThreshold,
    () => this.config().scroll.gestureGap,
    () => this.win.innerHeight,
  );

  private readonly ratios = new Map<Element, number>();
  private activeElement: HTMLElement | null = null;
  private observer: IntersectionObserver | null = null;
  private mutations: MutationObserver | null = null;
  private motionQuery: MediaQueryList | null = null;

  private started = false;
  private locked = false;
  private animating = false;
  private runId = 0;
  private unlockTimer = 0;
  private resizeFrame = 0;
  private lastWidth = 0;
  private lastSectionHeight = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  // ───────────────────────── API công khai ─────────────────────────

  setOptions(options: MtOptions): void {
    this.options.set(options ?? {});
  }

  register(element: HTMLElement): void {
    if (this._sections().includes(element)) return;
    this._sections.update((list) => this.sortByDom([...list, element]));
    this.observer?.observe(element);
    this.syncIndexToElement();
  }

  unregister(element: HTMLElement): void {
    this.observer?.unobserve(element);
    this.ratios.delete(element);
    this._sections.update((list) => list.filter((el) => el !== element));
    this.syncIndexToElement();
  }

  /** Chuyển tới section `index` (có animation). */
  goTo(index: number, options: { instant?: boolean } = {}): void {
    const list = this._sections();
    if (!list.length) return;

    const target = Math.min(Math.max(Math.round(index), 0), list.length - 1);
    const cfg = this.config().scroll;
    const distance = Math.abs(target - this._activeIndex());
    const duration =
      options.instant || this.reducedMotion()
        ? 0
        : cfg.duration * Math.min(1 + Math.max(distance - 1, 0) * 0.35, 2.2);

    const y = this.sectionTop(list[target]);
    const run = ++this.runId;

    this.setActive(target);
    this.locked = true;
    this.animating = true;
    this.win.clearTimeout(this.unlockTimer);
    this.root.classList.add(ANIMATING_CLASS);

    this.animator.to(y, duration, resolveEasing(cfg.easing)).then((completed) => {
      if (run !== this.runId) return; // đã có lệnh chuyển cảnh mới thay thế
      this.animating = false;
      this.root.classList.remove(ANIMATING_CLASS);

      if (completed) {
        this.unlockTimer = this.win.setTimeout(() => (this.locked = false), cfg.cooldown);
      } else {
        this.locked = false;
      }
      this.syncActive();
    });
  }

  next(): void {
    if (!this.isLast()) this.goTo(this._activeIndex() + 1);
  }

  prev(): void {
    if (!this.isFirst()) this.goTo(this._activeIndex() - 1);
  }

  /** Dùng cho icon Scroll Down: xuống section kế, ở cuối thì quay về đầu. */
  advance(): void {
    if (this.isLast()) this.goTo(0);
    else this.next();
  }

  // ───────────────────────── Vòng đời ─────────────────────────

  /** Gọi một lần bởi <mt-fullscreen> sau khi view được render. */
  start(host: HTMLElement): void {
    if (this.started) return;
    this.started = true;
    const win = this.win;

    if ('scrollRestoration' in win.history) win.history.scrollRestoration = 'manual';
    win.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    this.root.classList.add(ROOT_CLASS);

    this.observer = new IntersectionObserver((entries) => this.onIntersect(entries), {
      threshold: [0, 0.2, 0.4, 0.5, 0.6, 0.8, 1],
    });
    this._sections().forEach((el) => this.observer?.observe(el));

    // Tự cập nhật thứ tự khi section được thêm / xoá / sắp xếp lại trong DOM.
    this.mutations = new MutationObserver(() => this.resort());
    this.mutations.observe(host, { childList: true, subtree: true });
    this.resort();

    this.motionQuery = win.matchMedia('(prefers-reduced-motion: reduce)');
    this.systemReducedMotion.set(this.motionQuery.matches);
    this.motionQuery.addEventListener('change', this.onMotionChange);

    win.addEventListener('wheel', this.onWheel, { passive: false });
    win.addEventListener('keydown', this.onKeyDown);
    win.addEventListener('touchstart', this.onTouchStart, { passive: true });
    win.addEventListener('resize', this.onResize, { passive: true });

    this.measure();
    win.requestAnimationFrame(() => win.requestAnimationFrame(() => this.ready.set(true)));
  }

  private stop(): void {
    if (!this.started) return;
    this.started = false;
    const win = this.win;

    win.removeEventListener('wheel', this.onWheel);
    win.removeEventListener('keydown', this.onKeyDown);
    win.removeEventListener('touchstart', this.onTouchStart);
    win.removeEventListener('resize', this.onResize);
    this.motionQuery?.removeEventListener('change', this.onMotionChange);

    this.observer?.disconnect();
    this.mutations?.disconnect();
    this.animator.cancel();
    win.clearTimeout(this.unlockTimer);
    win.cancelAnimationFrame(this.resizeFrame);
    this.root.classList.remove(ROOT_CLASS, ANIMATING_CLASS);
  }

  // ───────────────────────── Theo dõi section ─────────────────────────

  private onIntersect(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      this.ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
    }
    if (!this.animating) this.syncActive();
  }

  /** Chọn section đang chiếm > 50% viewport. */
  private syncActive(): void {
    let bestIndex = -1;
    let bestRatio = ACTIVATION_RATIO;
    this._sections().forEach((el, i) => {
      const ratio = this.ratios.get(el) ?? 0;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestIndex = i;
      }
    });
    if (bestIndex >= 0) this.setActive(bestIndex);
  }

  private setActive(index: number): void {
    this.activeElement = this._sections()[index] ?? null;
    this._activeIndex.set(index);
  }

  private resort(): void {
    const current = this._sections();
    const sorted = this.sortByDom([...current]);
    if (sorted.some((el, i) => el !== current[i])) {
      this._sections.set(sorted);
      this.syncIndexToElement();
    }
  }

  /** Giữ nguyên section đang active khi danh sách thay đổi (thêm / xoá / đổi thứ tự). */
  private syncIndexToElement(): void {
    const list = this._sections();
    if (!list.length) {
      this.activeElement = null;
      this._activeIndex.set(0);
      return;
    }
    const found = this.activeElement ? list.indexOf(this.activeElement) : -1;
    if (found >= 0) {
      this._activeIndex.set(found);
    } else {
      this.setActive(Math.min(this._activeIndex(), list.length - 1));
    }
  }

  private sortByDom(list: HTMLElement[]): HTMLElement[] {
    return list.sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );
  }

  private sectionTop(el: HTMLElement): number {
    return el.getBoundingClientRect().top + this.win.scrollY;
  }

  // ───────────────────────── Sự kiện đầu vào ─────────────────────────

  private readonly onWheel = (event: WheelEvent): void => {
    if (!this.config().scroll.wheel || this.count() < 2) return;
    if (event.ctrlKey || event.defaultPrevented) return; // Ctrl + wheel = zoom
    if (event.deltaY === 0 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

    const dir: StepDirection = event.deltaY > 0 ? 1 : -1;
    if (shouldUseNativeScroll(event.target, dir)) return;

    event.preventDefault();
    const step = this.wheelFilter.evaluate(event, this.locked);
    if (step === 1) this.next();
    else if (step === -1) this.prev();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.config().scroll.keyboard || this.count() < 2) return;
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

    const space = event.key === ' ' || event.key === 'Spacebar';
    if (isTextEntryTarget(event.target)) return;
    if (space && isActivatableTarget(event.target)) return; // Space = kích hoạt nút / liên kết

    let action: (() => void) | null = null;
    let respectsLock = true;
    switch (event.key) {
      case 'ArrowDown':
      case 'PageDown':
        action = () => this.next();
        break;
      case 'ArrowUp':
      case 'PageUp':
        action = () => this.prev();
        break;
      case ' ':
      case 'Spacebar':
        action = event.shiftKey ? () => this.prev() : () => this.next();
        break;
      case 'Home':
        action = () => this.goTo(0);
        respectsLock = false;
        break;
      case 'End':
        action = () => this.goTo(this.count() - 1);
        respectsLock = false;
        break;
      default:
        return;
    }

    const dir: StepDirection = event.key === 'ArrowUp' || event.key === 'PageUp' || (space && event.shiftKey) ? -1 : 1;
    if (shouldUseNativeScroll(event.target, dir)) return;

    event.preventDefault();
    if (respectsLock && this.locked) return; // giữ phím không làm trượt qua nhiều section
    action();
  };

  /** Người dùng chạm vào màn hình → nhường quyền cho cuộn cảm ứng native ngay lập tức. */
  private readonly onTouchStart = (): void => {
    if (this.animator.running) this.animator.cancel();
  };

  private readonly onMotionChange = (event: MediaQueryListEvent): void => {
    this.systemReducedMotion.set(event.matches);
  };

  /** Căn lại section khi kích thước thật sự thay đổi (xoay màn hình, đổi cỡ cửa sổ). */
  private readonly onResize = (): void => {
    if (this.resizeFrame) return;
    this.resizeFrame = this.win.requestAnimationFrame(() => {
      this.resizeFrame = 0;
      const el = this._sections()[this._activeIndex()];
      if (!el || this.animating) return;
      // Chỉ căn lại khi kích thước đổi thật — tránh xung đột với thanh địa chỉ mobile khi đang vuốt.
      if (this.win.innerWidth === this.lastWidth && el.offsetHeight === this.lastSectionHeight) return;
      this.measure();
      this.win.scrollTo({ top: this.sectionTop(el), left: 0, behavior: 'instant' });
    });
  };

  private measure(): void {
    this.lastWidth = this.win.innerWidth;
    this.lastSectionHeight = this._sections()[0]?.offsetHeight ?? 0;
  }
}
