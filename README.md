# Minh Tân Official — Fullscreen Scroll (Angular)

Angular 22 · standalone · zoneless · signals · không phụ thuộc thư viện ngoài.

```bash
npm install
npm start          # http://localhost:4200
npm run build
```

## Thêm / xoá / sắp xếp section — [src/app/app.html](src/app/app.html)

```html
<mt-fullscreen [options]="options">
  <mt-section>…nội dung của bạn…</mt-section>
  <mt-section animation="blur" [duration]="1200"></mt-section>
</mt-fullscreen>
```

Dots, icon Scroll Down và thứ tự điều hướng tự cập nhật. Không cần khai báo số lượng.

## Cấu hình — [src/app/mt-scroll/core/mt-config.ts](src/app/mt-scroll/core/mt-config.ts)

Ghi đè theo 3 cấp: mặc định → `provideMtScroll({...})` trong `app.config.ts` → `[options]` của `<mt-fullscreen>`.

| Nhóm | Tuỳ chỉnh chính |
|---|---|
| `scroll` | `duration`, `easing`, `wheel`, `keyboard`, `wheelThreshold`, `cooldown`, `gestureGap` |
| `animation` | `type` (`fade` `slide` `scale` `blur` `none`, kết hợp được), `duration`, `easing`, `slideDistance`, `scaleFrom`, `blurFrom` |
| `indicator` | `enabled`, `showLabel`, `label`, `labelLast`, `onLast` (`to-top` / `hide`) |
| `dots` | `enabled`, `position` (`left` / `right`) |

Ví dụ: `options = { scroll: { duration: 1400 }, animation: { type: ['fade','blur','scale'] }, dots: { enabled: false } }`

## Cấu trúc `src/app/mt-scroll`

| File | Vai trò |
|---|---|
| `core/scroll-engine.ts` | Điều phối: danh sách section, section đang active, `goTo/next/prev` |
| `core/scroll-input.ts` | Lọc wheel (chống nhảy nhiều section, lọc quán tính touchpad) |
| `core/scroll-animator.ts`, `core/easing.ts` | Hoạt ảnh cuộn (thời gian + easing tuỳ chỉnh) |
| `components/section` | Section 100vw × 100svh + hiệu ứng chuyển cảnh (CSS) |
| `components/scroll-indicator` | Icon Scroll Down |
| `components/nav-dots` | Chấm điều hướng |
| `directives/mt-lazy.ts` | `<img mtLazy …>` lazy-load + fade-in |

## Animation cho phần tử con

Mỗi `mt-section` có `data-state="active | before | after"`. Dùng class tiện ích `mt-reveal`
(trong `styles.css`) để phần tử con hiện lần lượt: `<h1 class="mt-reveal" style="--mt-stagger:0">`.
Section còn có output `(entered)` / `(left)`.

## Cơ chế cuộn

- **Vuốt / kéo cảm ứng:** native CSS `scroll-snap` (`mandatory` + `scroll-snap-stop: always`) → không bị khoá, không bỏ qua section.
- **Con lăn / bàn phím / icon / chấm:** chuyển đúng 1 section bằng animator rAF. Vùng có thanh cuộn riêng
  (hoặc gắn `data-mt-native-scroll`) vẫn cuộn bình thường.
- Chỉ animate `opacity` / `transform` (+ `filter` cho blur). `prefers-reduced-motion` → chuyển cảnh tức thì, chỉ mờ nhẹ.
