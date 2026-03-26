import { describe, it, expect, vi, beforeEach } from "vitest";
import { KomutIsleyici } from "../mqtt/KomutIsleyici";
import { SahteMqttTasiyici } from "../mqtt/SahteMqttTasiyici";

describe("KomutIsleyici idempotency", () => {
  let mqtt: SahteMqttTasiyici;
  let playlistRepo: {
    getPlaylist: () => Promise<{
      playlist: { playlist: any[] };
      source: "network" | "cache";
      updated: boolean;
    }>;
  };
  let engine: {
    loadPlaylist: (p: { playlist: any[] }) => void;
    play: () => void;
    pause: () => Promise<void>;
    restart: () => Promise<void>;
    setVolume: (v: number) => Promise<void>;
    screenshot: () => Promise<{ format: string; base64: string }>;
  };

  beforeEach(() => {
    mqtt = new SahteMqttTasiyici();
    engine = {
      loadPlaylist: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(async () => {}),
      restart: vi.fn(async () => {}),
      setVolume: vi.fn(async () => {}),
      screenshot: vi.fn(async () => ({ format: "image/png", base64: "AA==" })),
    };
    playlistRepo = {
      getPlaylist: vi.fn(async () => ({
        playlist: { playlist: [{ type: "image", url: "https://example.com/a.jpg", duration: 10 }] },
        source: "network" as const,
        updated: true,
      })),
    };
  });

  it("processes reload_playlist once per correlationId", async () => {
    const handler = new KomutIsleyici({
      deviceId: "device-001",
      mqtt,
      playlistRepo: playlistRepo as any,
      engine: engine as any,
    });

    const cmd = { command: "reload_playlist", correlationId: "c1", timestamp: 1700000000 };
    await handler.handleRawCommand(Buffer.from(JSON.stringify(cmd), "utf8"), "t1");
    await handler.handleRawCommand(Buffer.from(JSON.stringify(cmd), "utf8"), "t1");

    const published = mqtt.published.map((p) => JSON.parse(p.payload.toString("utf8")));
    expect(published.length).toBe(2);
    expect((playlistRepo.getPlaylist as any).mock.calls.length).toBe(1);
    expect(published[0].status).toBe("success");
    expect(published[0].payload.updated).toBe(true);
    expect(published[1].payload.duplicate).toBe(true);
  });

  it("returns screenshot base64", async () => {
    const handler = new KomutIsleyici({
      deviceId: "device-001",
      mqtt,
      playlistRepo: playlistRepo as any,
      engine: engine as any,
    });
    const cmd = { command: "screenshot", correlationId: "c2", timestamp: 1700000001 };
    await handler.handleRawCommand(Buffer.from(JSON.stringify(cmd), "utf8"), "t1");
    expect(engine.screenshot).toHaveBeenCalledTimes(1);
    const published = JSON.parse(mqtt.published[0].payload.toString("utf8"));
    expect(published.status).toBe("success");
    expect(published.command).toBe("screenshot");
    expect(published.payload.base64).toBe("AA==");
  });
});
