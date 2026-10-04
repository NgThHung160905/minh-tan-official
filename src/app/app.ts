import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { MtFullscreen, MtOptions, MtSection } from './mt-scroll';
import { MtPhoto as MtPhotoComponent } from './mt-photo/mt-photo';

/**
 * Một ảnh = một section fullscreen, đúng thứ tự số trong tên file (1, 2, 3, …).
 * Nguồn: F:\Minh Tân  →  public/images  (giữ nguyên file gốc, không nén lại).
 *
 * Thêm ảnh mới: copy `N.jpg` vào public/images rồi thêm một dòng vào cuối danh sách.
 * `focus` = tiêu điểm khi tỉ lệ ảnh khác màn hình (object-position: x y) để giữ chủ thể.
 */
export interface MtPhoto {
  /** Số thứ tự do người dùng đặt trong tên file. */
  readonly order: number;
  readonly src: string;
  /** Kích thước gốc — giúp trình duyệt giữ đúng tỉ lệ, không nhảy layout. */
  readonly width: number;
  readonly height: number;
  readonly alt: string;
  /** object-position (mặc định "50% 50%"). */
  readonly focus?: string;
}

const PHOTOS: readonly MtPhoto[] = [
  { order: 0, src: 'images/main.jpg', width: 2048, height: 1153, alt: 'Minh Tân — ảnh chính', focus: '50% 50%' },
  { order: 1, src: 'images/1.jpg', width: 1280, height: 1280, alt: 'Minh Tân — ảnh 1', focus: '50% 32%' },
  { order: 2, src: 'images/2.jpg', width: 4080, height: 3072, alt: 'Minh Tân — ảnh 2', focus: '55% 48%' },
];

@Component({
  selector: 'app-root',
  imports: [MtFullscreen, MtSection, MtPhotoComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements AfterViewInit {
  @ViewChild('bgAudio') bgAudio!: ElementRef<HTMLAudioElement>;
  
  /** Luôn sắp xếp theo số thứ tự, từ nhỏ đến lớn. */
  protected readonly photos: readonly MtPhoto[] = [...PHOTOS].sort((a, b) => a.order - b.order);

  /**
   * Tuỳ chỉnh nhanh cho trang này (để trống = dùng mặc định trong mt-scroll/core/mt-config.ts).
   */
  protected readonly options: MtOptions = {};

  ngAfterViewInit() {
    const audio = this.bgAudio.nativeElement;
    // Set volume a bit lower for background music
    audio.volume = 0.5;
    // Autoplay attribute is in HTML, but we attempt explicitly just in case
    audio.play().catch(() => {
      // Browser blocked autoplay without user interaction, will trigger on interaction
    });
  }

  // Bắt sự kiện click/touch/keydown để bật nhạc nếu trình duyệt chặn autoplay ban đầu
  @HostListener('window:click')
  @HostListener('window:keydown')
  @HostListener('window:touchstart')
  onUserInteraction() {
    const audio = this.bgAudio.nativeElement;
    if (audio.paused) {
      audio.play().catch(() => {
        // Vẫn bị chặn hoặc lỗi, sẽ thử lại ở lần click tiếp theo
      });
    }
  }
}
