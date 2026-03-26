import type { PlaylistItem } from "../../core/domain/playlist/oynatmaListesiTipleri";
import type { PlatformAdapter, ScreenshotResult } from "../../player/engine/PlatformAdaptoru";

const ONE_PX_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X2G5kAAAAASUVORK5CYII=";

export class TizenTarayiciPlatformAdaptoru implements PlatformAdapter {
  private current?: PlaylistItem;
  private paused = false;
  private container: HTMLElement;
  private activeVideo?: HTMLVideoElement;
  private activeTimer?: number;

  constructor(containerId = "app") {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container not found: ${containerId}`);
    this.container = el;
  }

  async setVolume(volume: number): Promise<void> {
    if (this.activeVideo) this.activeVideo.volume = Math.max(0, Math.min(1, volume / 100));
  }

  renderImage(url: string, durationMs: number, onDone: () => void, token: { get(): number }): void {
    this.temizle();
    this.current = { type: "image", url, duration: Math.max(1, Math.floor(durationMs / 1000)) };
    this.paused = false;
    const img = document.createElement("img");
    img.src = url;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";
    this.container.innerHTML = "";
    this.container.appendChild(img);
    const t = token.get();
    this.activeTimer = window.setTimeout(() => {
      if (this.paused || token.get() !== t) return;
      onDone();
    }, durationMs);
  }

  renderVideo(url: string, onEnded: () => void, token: { get(): number }): void {
    this.temizle();
    this.current = { type: "video", url };
    this.paused = false;
    const video = document.createElement("video");
    video.src = url;
    video.autoplay = true;
    video.muted = false;
    video.controls = false;
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "contain";
    this.activeVideo = video;
    this.container.innerHTML = "";
    this.container.appendChild(video);
    const t = token.get();
    const done = () => {
      if (this.paused || token.get() !== t) return;
      onEnded();
    };
    video.onended = done;
    video.onerror = done;
    void video.play().catch(done);
    this.activeTimer = window.setTimeout(done, 20000);
  }

  async pause(): Promise<void> {
    this.paused = true;
    if (this.activeVideo) this.activeVideo.pause();
    if (this.activeTimer) window.clearTimeout(this.activeTimer);
  }

  async resume(): Promise<void> {
    this.paused = false;
    if (this.activeVideo) void this.activeVideo.play();
  }

  async screenshot(): Promise<ScreenshotResult> {
    return { format: "image/png", base64: ONE_PX_PNG_BASE64 };
  }

  async dispose(): Promise<void> {
    this.temizle();
  }

  currentItem(): PlaylistItem | undefined {
    return this.current;
  }

  private temizle(): void {
    if (this.activeTimer) {
      window.clearTimeout(this.activeTimer);
      this.activeTimer = undefined;
    }
    if (this.activeVideo) {
      this.activeVideo.pause();
      this.activeVideo.src = "";
      this.activeVideo.remove();
      this.activeVideo = undefined;
    }
  }
}

