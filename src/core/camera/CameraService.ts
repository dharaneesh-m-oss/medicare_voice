/**
 * CAMERA MODULE. The only place that touches getUserMedia / canvas.
 * On Android this is replaced by CameraX; the interface stays the same.
 */

export interface CameraStartOptions {
  facingMode?: 'environment' | 'user';
  width?: number;
  height?: number;
}

export class CameraService {
  private stream: MediaStream | null = null;

  static isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    );
  }

  get active(): boolean {
    return this.stream !== null;
  }

  async start(video: HTMLVideoElement, options: CameraStartOptions = {}): Promise<void> {
    if (!CameraService.isSupported()) {
      throw new Error('camera_unsupported');
    }
    this.stop();

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        facingMode: { ideal: options.facingMode ?? 'environment' },
        width: { ideal: options.width ?? 1280 },
        height: { ideal: options.height ?? 720 },
      },
    };

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = this.stream;
    video.setAttribute('playsinline', 'true');
    await video.play().catch(() => undefined);
  }

  /** Grab the current frame as a JPEG data URL. */
  capture(video: HTMLVideoElement, maxWidth = 1024): string {
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const scale = Math.min(1, maxWidth / vw);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vw * scale);
    canvas.height = Math.round(vh * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas_unavailable');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  stop(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}

/** Gallery / file-picker fallback for devices where the camera is blocked. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('file_read_failed'));
    reader.readAsDataURL(file);
  });
}
