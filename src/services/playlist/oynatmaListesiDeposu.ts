import { jsonCek } from "../../network/jsonCek";
import type { AnahtarDegerDeposu } from "../../storage/kv/AnahtarDegerDeposu";
import { parsePlaylist, playlistSchema } from "../../core/domain/playlist/oynatmaListesiSemasi";
import type { OynatmaListesi } from "../../core/domain/playlist/oynatmaListesiTipleri";
import type { Kayitlayici } from "../../infrastructure/logger/Kayitlayici";

export type OynatmaListesiDeposuSecenekleri = {
  storage: AnahtarDegerDeposu;
  playlistEndpoint: string;
  cacheKey?: string;
  logger?: Kayitlayici;
};

export type OynatmaListesiDeposuSonucu = {
  playlist: OynatmaListesi;
  source: "network" | "cache";
  updated: boolean;
};

function stableStringify(v: unknown): string {
  return JSON.stringify(v);
}
function hashOf(v: unknown): string {
  const s = stableStringify(v);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

type CachedPayload = { playlist: OynatmaListesi; hash: string; updatedAt: number };

export class OynatmaListesiDeposu {
  private readonly storage: AnahtarDegerDeposu;
  private readonly playlistEndpoint: string;
  private readonly cacheKey: string;
  private readonly logger?: Kayitlayici;
  constructor(opts: OynatmaListesiDeposuSecenekleri) {
    this.storage = opts.storage;
    this.playlistEndpoint = opts.playlistEndpoint;
    this.cacheKey = opts.cacheKey ?? "playlist_cache_v1";
    this.logger = opts.logger;
  }

  async getPlaylist(): Promise<OynatmaListesiDeposuSonucu> {
    const cachedRaw = await this.storage.getItem(this.cacheKey);
    let cached: CachedPayload | undefined;
    if (cachedRaw) {
      try {
        cached = JSON.parse(cachedRaw) as CachedPayload;
      } catch {}
    }
    let networkPlaylist: OynatmaListesi | undefined;
    try {
      const networkRaw = await jsonCek<unknown>(this.playlistEndpoint, {
        timeoutMs: 8000,
        retries: 2,
        backoffBaseMs: 500,
      });
      networkPlaylist = parsePlaylist(networkRaw);
      const networkHash = hashOf(networkPlaylist);
      const cachedHash = cached?.hash;
      const updated = networkHash !== cachedHash;
      if (updated) {
        const toStore: CachedPayload = {
          playlist: networkPlaylist,
          hash: networkHash,
          updatedAt: Date.now(),
        };
        await this.storage.setItem(this.cacheKey, JSON.stringify(toStore));
      }
      this.logger?.info("playlist fetched", {
        source: "network",
        updated: networkHash !== cachedHash,
      });
      return { playlist: networkPlaylist, source: "network", updated: networkHash !== cachedHash };
    } catch {
      if (cached) {
        this.logger?.warn("playlist fetch failed, using cache", { source: "cache" });
        return { playlist: cached.playlist, source: "cache", updated: false };
      }
      throw new Error("No cached playlist available and network fetch failed");
    }
  }
}

export const OynatmaListesiSemasiDogrulama = playlistSchema;
