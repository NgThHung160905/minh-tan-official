export type StepDirection = 1 | -1;

/**
 * Lọc sự kiện wheel thành "thao tác cuộn" rời rạc: mỗi cử chỉ chỉ chuyển đúng 1 section.
 *
 *  - Chuột có nấc: mỗi nấc (sau khoảng lặng) = 1 bước.
 *  - Touchpad / Magic Mouse: bỏ qua phần quán tính (delta giảm dần) sau cử chỉ đầu.
 *  - Đang chuyển cảnh (locked): mọi sự kiện đều bị bỏ qua → không thể lướt qua nhiều section.
 */
export class WheelGestureFilter {
  private lastTime = 0;
  private lastMagnitude = 0;
  private lastSign = 0;

  constructor(
    private readonly getThreshold: () => number,
    private readonly getGap: () => number,
    private readonly viewportHeight: () => number,
  ) {}

  evaluate(event: WheelEvent, locked: boolean): StepDirection | 0 {
    let delta = event.deltaY;
    if (event.deltaMode === 1) delta *= 16; // dòng → px
    else if (event.deltaMode === 2) delta *= this.viewportHeight(); // trang → px

    const magnitude = Math.abs(delta);
    const sign = Math.sign(delta);
    const now = event.timeStamp;

    const quiet = now - this.lastTime >= this.getGap();
    const isInertialTail = !quiet && sign === this.lastSign && magnitude <= this.lastMagnitude;

    this.lastTime = now;
    this.lastMagnitude = magnitude;
    this.lastSign = sign;

    if (locked || isInertialTail || magnitude < this.getThreshold()) return 0;
    return sign > 0 ? 1 : -1;
  }
}

/**
 * Phần tử con có thanh cuộn riêng (overflow auto/scroll) còn cuộn được theo hướng `dir`?
 * Khi đó ta nhường cho trình duyệt cuộn nội dung bên trong thay vì chuyển section.
 * Có thể chủ động nhường bằng cách gắn thuộc tính `data-mt-native-scroll`.
 */
export function shouldUseNativeScroll(target: EventTarget | null, dir: StepDirection): boolean {
  let el = target instanceof Element ? target : null;

  while (el && el !== document.body && el !== document.documentElement) {
    if (el.hasAttribute('data-mt-native-scroll')) return true;

    if (el instanceof HTMLElement) {
      const { overflowY } = getComputedStyle(el);
      const scrollable = (overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1;
      if (scrollable) {
        const canScroll = dir > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0;
        if (canScroll) return true;
      }
    }
    el = el.parentElement;
  }
  return false;
}

/** Ô nhập liệu: mọi phím điều hướng thuộc về phần tử này → không chiếm phím. */
export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return !!target.closest('input, textarea, select, [role="slider"], [role="textbox"], [role="listbox"]');
}

/** Nút / liên kết: phím Space dùng để kích hoạt chúng → không chiếm phím Space. */
export function isActivatableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && !!target.closest('button, a[href], summary, [role="button"]');
}
