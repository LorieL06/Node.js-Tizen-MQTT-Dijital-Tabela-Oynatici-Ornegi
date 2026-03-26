import type { OynatmaListesi } from "../../core/domain/playlist/oynatmaListesiTipleri";
import type { PlatformAdapter } from "./PlatformAdaptoru";

type EngineState = {
  playlist: OynatmaListesi | null;
  index: number;
  playing: boolean;
  volume: number;
  playToken: number;
};

export class OynaticiMotoru {
  private readonly adapter: PlatformAdapter;
  private state: EngineState;

  constructor(adapter: PlatformAdapter) {
    this.adapter = adapter;
    this.state = { playlist: null, index: 0, playing: false, volume: 50, playToken: 0 };
  }

  loadPlaylist(playlist: OynatmaListesi): void {
    this.state.playlist = playlist;
    this.state.index = 0;
    this.state.playToken++;
    if (this.state.playing) {
      this.renderCurrent();
    }
  }

  play(): void {
    if (this.state.playing) {
      return;
    }
    this.state.playing = true;
    this.state.playToken++;
    this.adapter.resume?.();
    this.renderCurrent();
  }

  async pause(): Promise<void> {
    if (!this.state.playing) {
      return;
    }
    this.state.playing = false;
    this.state.playToken++;
    await this.adapter.pause?.();
  }

  async restart(): Promise<void> {
    const wasPlaying = this.state.playing;
    this.state.playlist = this.state.playlist;
    this.state.index = 0;
    this.state.playToken++;
    await this.adapter.pause?.();
    if (wasPlaying) {
      this.state.playing = true;
      this.adapter.resume?.();
      this.renderCurrent();
    }
  }

  async setVolume(volume: number): Promise<void> {
    this.state.volume = volume;
    if (this.adapter.setVolume) {
      await this.adapter.setVolume(volume);
    }
  }

  async screenshot(): Promise<{ format: string; base64: string }> {
    return this.adapter.screenshot();
  }

  getCurrentItemUrl?(): string | undefined {
    const item = this.adapter.currentItem?.();
    return item?.url;
  }

  private renderCurrent(): void {
    const playlist = this.state.playlist;
    if (!playlist) {
      return;
    }
    const item = playlist.playlist[this.state.index];
    if (!item) {
      return;
    }
    const token = { get: () => this.state.playToken };
    const next = () => {
      if (token.get() !== this.state.playToken) {
        return;
      }
      this.state.index = (this.state.index + 1) % playlist.playlist.length;
      this.renderCurrent();
    };
    if (item.type === "image") {
      this.adapter.renderImage(item.url, item.duration * 1000, next, token);
    } else {
      this.adapter.renderVideo(item.url, next, token);
    }
  }
}
