/**
 * Hoạt ảnh cuộn bằng requestAnimationFrame.
 * Chỉ thay đổi vị trí cuộn của document — không đụng tới layout hay style.
 * Cho phép chỉnh thời gian & easing (điều mà `scroll-behavior: smooth` không làm được).
 */
export class ScrollAnimator {
  private frame = 0;
  private resolve: ((completed: boolean) => void) | null = null;

  constructor(private readonly win: Window) {}

  get running(): boolean {
    return this.resolve !== null;
  }

  /** Cuộn tới `targetY`. Resolve `true` nếu hoàn tất, `false` nếu bị huỷ giữa chừng. */
  to(targetY: number, duration: number, easing: (t: number) => number): Promise<boolean> {
    this.cancel();

    const startY = this.win.scrollY;
    const delta = targetY - startY;

    if (duration <= 0 || Math.abs(delta) < 1) {
      this.jump(targetY);
      return Promise.resolve(true);
    }

    return new Promise<boolean>((resolve) => {
      this.resolve = resolve;
      let startTime = 0;

      const tick = (now: number) => {
        if (!startTime) startTime = now;
        const progress = Math.min((now - startTime) / duration, 1);
        this.jump(startY + delta * easing(progress));

        if (progress < 1) {
          this.frame = this.win.requestAnimationFrame(tick);
        } else {
          this.jump(targetY);
          this.finish(true);
        }
      };
      this.frame = this.win.requestAnimationFrame(tick);
    });
  }

  cancel(): void {
    if (this.frame) this.win.cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.finish(false);
  }

  private finish(completed: boolean): void {
    const resolve = this.resolve;
    this.resolve = null;
    this.frame = 0;
    resolve?.(completed);
  }

  private jump(y: number): void {
    this.win.scrollTo({ top: Math.round(y), left: 0, behavior: 'instant' });
  }
}
