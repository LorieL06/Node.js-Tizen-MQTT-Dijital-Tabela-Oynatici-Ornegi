import type { PlaylistItem } from "../../core/domain/playlist/oynatmaListesiTipleri";

export type ScreenshotResult = {
  format: string;
  base64: string;
};

export interface PlatformAdapter {
  setVolume?(volume: number): Promise<void>;
  renderImage(url: string, durationMs: number, onDone: () => void, token: { get(): number }): void;
  renderVideo(url: string, onEnded: () => void, token: { get(): number }): void;
  pause(): Promise<void>;
  resume(): Promise<void>;
  screenshot(): Promise<ScreenshotResult>;
  dispose?(): Promise<void>;
  currentItem?(): PlaylistItem | undefined;
}
