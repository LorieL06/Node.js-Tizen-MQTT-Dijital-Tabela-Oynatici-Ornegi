import type { PlaylistItem } from "../../core/domain/playlist/oynatmaListesiTipleri";
import type { PlatformAdapter } from "../../player/engine/PlatformAdaptoru";
import type { ScreenshotResult } from "../../player/engine/PlatformAdaptoru";

const ONE_PX_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X2G5kAAAAASUVORK5CYII=";

export class SahtePlatformAdaptoru implements PlatformAdapter {
  private current?: PlaylistItem;
  private paused = false;

  async setVolume(volume: number): Promise<void> {
    void volume;
  }

  renderImage(url: string, durationMs: number, onDone: () => void, token: { get(): number }): void {
    this.current = { type: "image", url, duration: durationMs };
    this.paused = false;
    const t = token.get();
    setTimeout(() => {
      if (this.paused || token.get() !== t) {
        return;
      }
      onDone();
    }, durationMs);
  }

  renderVideo(url: string, onEnded: () => void, token: { get(): number }): void {
    this.current = { type: "video", url };
    this.paused = false;
    const t = token.get();
    setTimeout(() => {
      if (this.paused || token.get() !== t) {
        return;
      }
      onEnded();
    }, 5);
  }

  async pause(): Promise<void> {
    this.paused = true;
  }
  async resume(): Promise<void> {
    this.paused = false;
  }

  async screenshot(): Promise<ScreenshotResult> {
    return { format: "image/png", base64: ONE_PX_PNG_BASE64 };
  }

  async dispose?(): Promise<void> {}

  currentItem(): PlaylistItem | undefined {
    return this.current;
  }
}
