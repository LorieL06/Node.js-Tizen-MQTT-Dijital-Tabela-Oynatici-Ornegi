import { describe, it, expect } from "vitest";
import { OynaticiMotoru } from "../player/engine/OynaticiMotoru";
import type { PlatformAdapter } from "../player/engine/PlatformAdaptoru";

describe("OynaticiMotoru duration + playlist loop", () => {
  it("renders images in order and loops", () => {
    const calls: { url: string; durationMs: number }[] = [];
    let lastOnDone: (() => void) | undefined;
    let lastTokenGet: (() => number) | undefined;

    const adapter: PlatformAdapter = {
      renderImage: (url, durationMs, onDone, token) => {
        calls.push({ url, durationMs });
        lastOnDone = onDone;
        lastTokenGet = token.get;
        const capturedToken = token.get();
        const guarded = () => {
          if (!lastTokenGet) return;
          if (lastTokenGet() !== capturedToken) return;
          onDone();
        };
        lastOnDone = guarded;
      },
      renderVideo: () => {},
      pause: async () => {},
      resume: async () => {},
      screenshot: async () => ({ format: "image/png", base64: "AA==" }),
    };

    const engine = new OynaticiMotoru(adapter);
    engine.loadPlaylist({
      playlist: [
        { type: "image", url: "https://example.com/1.jpg", duration: 10 },
        { type: "image", url: "https://example.com/2.jpg", duration: 20 },
      ],
    });

    engine.play();
    expect(calls.length).toBe(1);
    expect(calls[0]).toEqual({ url: "https://example.com/1.jpg", durationMs: 10000 });

    lastOnDone?.();
    expect(calls.length).toBe(2);
    expect(calls[1]).toEqual({ url: "https://example.com/2.jpg", durationMs: 20000 });

    lastOnDone?.();
    expect(calls.length).toBe(3);
    expect(calls[2]).toEqual({ url: "https://example.com/1.jpg", durationMs: 10000 });
  });

  it("ignores old callbacks after pause", async () => {
    const calls: string[] = [];
    let lastOnDone: (() => void) | undefined;
    let tokenAtRender: number | undefined;

    const adapter: PlatformAdapter = {
      renderImage: (url, _durationMs, onDone, token) => {
        calls.push(url);
        tokenAtRender = token.get();
        lastOnDone = () => {
          if (token.get() !== tokenAtRender) return;
          onDone();
        };
      },
      renderVideo: () => {},
      pause: async () => {},
      resume: async () => {},
      screenshot: async () => ({ format: "image/png", base64: "AA==" }),
    };

    const engine = new OynaticiMotoru(adapter);
    engine.loadPlaylist({
      playlist: [{ type: "image", url: "https://example.com/1.jpg", duration: 10 }],
    });

    engine.play();
    expect(calls).toEqual(["https://example.com/1.jpg"]);
    await engine.pause();

    const before = calls.length;
    lastOnDone?.();
    expect(calls.length).toBe(before);
  });
});
