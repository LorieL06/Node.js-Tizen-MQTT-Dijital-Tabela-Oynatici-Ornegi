import { describe, it, expect, vi, beforeEach } from "vitest";
import { BellekAnahtarDegerDeposu } from "../storage/kv/BellekAnahtarDegerDeposu";
import { OynatmaListesiDeposu } from "../services/playlist/oynatmaListesiDeposu";

function makeFetchResponse(payload: unknown) {
  return { ok: true, status: 200, statusText: "OK", json: async () => payload };
}

describe("OynatmaListesiDeposu offline-first", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses cache when network fails", async () => {
    const storage = new BellekAnahtarDegerDeposu();
    const cached = {
      playlist: { playlist: [{ type: "image", url: "https://example.com/a.jpg", duration: 10 }] },
      hash: "h1",
      updatedAt: Date.now(),
    };
    await storage.setItem("playlist_cache_v1", JSON.stringify(cached));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const repo = new OynatmaListesiDeposu({
      storage,
      playlistEndpoint: "https://endpoint/playlist",
    });
    const r = await repo.getPlaylist();
    expect(r.source).toBe("cache");
    expect(r.playlist.playlist.length).toBe(1);
  });

  it("fetches from network and updates cache when hash changes", async () => {
    const storage = new BellekAnahtarDegerDeposu();
    const payload1 = {
      playlist: [{ type: "image", url: "https://example.com/a.jpg", duration: 10 }],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => makeFetchResponse(payload1)),
    );
    const repo = new OynatmaListesiDeposu({
      storage,
      playlistEndpoint: "https://endpoint/playlist",
    });
    const r1 = await repo.getPlaylist();
    expect(r1.source).toBe("network");
    expect(r1.updated).toBe(true);
    const cachedRaw = await storage.getItem("playlist_cache_v1");
    expect(cachedRaw).toBeTruthy();
    const cached = JSON.parse(cachedRaw!);
    expect(cached.playlist.playlist[0].url).toBe("https://example.com/a.jpg");

    const payload2 = { playlist: [{ type: "video", url: "https://example.com/a.mp4" }] };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => makeFetchResponse(payload2)),
    );
    const r2 = await repo.getPlaylist();
    expect(r2.source).toBe("network");
    expect(r2.updated).toBe(true);
  });
});
