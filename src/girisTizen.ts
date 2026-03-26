import { OynatmaListesiDeposu } from "./services/playlist/oynatmaListesiDeposu";
import { OynaticiMotoru } from "./player/engine/OynaticiMotoru";
import { TizenTarayiciPlatformAdaptoru } from "./platform/tizen/TizenTarayiciPlatformAdaptoru";
import { MqttJsTasiyici } from "./mqtt/MqttJsTasiyici";
import { SahteMqttTasiyici } from "./mqtt/SahteMqttTasiyici";
import { KomutIsleyici } from "./mqtt/KomutIsleyici";
import { komutlarKonusu, olaylarKonusu } from "./mqtt/konular";
import { KonsolKayitlayici } from "./infrastructure/logger/KonsolKayitlayici";
import { TarayiciAnahtarDegerDeposu } from "./storage/kv/TarayiciAnahtarDegerDeposu";
import type { OynatmaListesi } from "./core/domain/playlist/oynatmaListesiTipleri";

type TizenConfig = {
  PLAYLIST_ENDPOINT: string;
  MQTT_BROKER_URL: string;
  DEVICE_ID: string;
  MQTT_QOS: 0 | 1 | 2;
  MQTT_MOCK: boolean;
};

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<TizenConfig>;
  }
}

function config(): TizenConfig {
  const c = window.__APP_CONFIG__ ?? {};
  return {
    PLAYLIST_ENDPOINT: c.PLAYLIST_ENDPOINT ?? "https://example.com/playlist",
    MQTT_BROKER_URL: c.MQTT_BROKER_URL ?? "wss://broker.hivemq.com:8884/mqtt",
    DEVICE_ID: c.DEVICE_ID ?? "tizen-device-001",
    MQTT_QOS: c.MQTT_QOS ?? 1,
    MQTT_MOCK: c.MQTT_MOCK ?? true,
  };
}

function setStatus(text: string): void {
  const el = document.getElementById("app");
  if (el) el.textContent = text;
}

function varsayilanOynatmaListesi(): OynatmaListesi {
  return {
    playlist: [
      { type: "image", url: "https://picsum.photos/1280/720?sig=1", duration: 5 },
      {
        type: "video",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      },
    ],
  };
}

async function calistirMockKomutAkisi(
  env: TizenConfig,
  repo: OynatmaListesiDeposu,
  engine: OynaticiMotoru,
  logger: KonsolKayitlayici,
): Promise<number> {
  const mqttMock = new SahteMqttTasiyici();
  const komutIsleyici = new KomutIsleyici({
    deviceId: env.DEVICE_ID,
    mqtt: mqttMock,
    playlistRepo: repo,
    engine,
    logger,
  });
  await mqttMock.subscribe(
    komutlarKonusu(env.DEVICE_ID),
    (payload, topic) => void komutIsleyici.handleRawCommand(payload, topic),
    env.MQTT_QOS,
  );
  let sonucSayisi = 0;
  await mqttMock.subscribe(
    olaylarKonusu(env.DEVICE_ID),
    () => {
      sonucSayisi += 1;
    },
    env.MQTT_QOS,
  );
  const komutlar = [
    { command: "play", correlationId: `mock-play-${Date.now()}`, timestamp: Date.now() },
    { command: "pause", correlationId: `mock-pause-${Date.now()}`, timestamp: Date.now() },
    { command: "reload_playlist", correlationId: `mock-reload-${Date.now()}`, timestamp: Date.now() },
    { command: "screenshot", correlationId: `mock-shot-${Date.now()}`, timestamp: Date.now() },
  ];
  for (const komut of komutlar) {
    mqttMock.trigger(komutlarKonusu(env.DEVICE_ID), komut);
    await new Promise((r) => setTimeout(r, 50));
  }
  return sonucSayisi;
}

export async function mainTizen(): Promise<void> {
  const env = config();
  const logger = new KonsolKayitlayici();
  const storage = new TarayiciAnahtarDegerDeposu();
  const repo = new OynatmaListesiDeposu({ storage, playlistEndpoint: env.PLAYLIST_ENDPOINT, logger });
  const adapter = new TizenTarayiciPlatformAdaptoru("app");
  const engine = new OynaticiMotoru(adapter);
  const mqttTransport = new MqttJsTasiyici({
    url: env.MQTT_BROKER_URL,
    reconnect: { minDelayMs: 300, maxDelayMs: 10000 },
  });
  let mqttHazir = false;
  setStatus("MQTT connecting...");
  try {
    await mqttTransport.connect();
    const handler = new KomutIsleyici({
      deviceId: env.DEVICE_ID,
      mqtt: mqttTransport,
      playlistRepo: repo,
      engine,
      logger,
    });
    await mqttTransport.subscribe(
      komutlarKonusu(env.DEVICE_ID),
      (payload, topic) => void handler.handleRawCommand(payload, topic),
      env.MQTT_QOS,
    );
    await mqttTransport.publish(
      olaylarKonusu(env.DEVICE_ID),
      JSON.stringify({
        type: "status",
        status: "online",
        deviceId: env.DEVICE_ID,
        ts: Date.now(),
      }),
      env.MQTT_QOS,
    );
    mqttHazir = true;
  } catch {
    mqttHazir = false;
  }
  setStatus("Fetching playlist...");
  const getPlaylistSafe = async () => {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("playlist timeout")), 7000),
    );
    return Promise.race([repo.getPlaylist(), timeout]);
  };
  try {
    const initial = await getPlaylistSafe();
    engine.loadPlaylist(initial.playlist);
    engine.play();
    const kanal = mqttHazir ? "mqtt:ok" : "mqtt:off";
    if (!mqttHazir && env.MQTT_MOCK) {
      const mockSonuc = await calistirMockKomutAkisi(env, repo, engine, logger);
      setStatus(`Running (${initial.source}) ${kanal} mock:on results=${mockSonuc}`);
      return;
    }
    setStatus(`Running (${initial.source}) ${kanal} deviceId=${env.DEVICE_ID}`);
  } catch {
    const fallback = varsayilanOynatmaListesi();
    engine.loadPlaylist(fallback);
    engine.play();
    const kanal = mqttHazir ? "mqtt:ok" : "mqtt:off";
    if (!mqttHazir && env.MQTT_MOCK) {
      const mockSonuc = await calistirMockKomutAkisi(env, repo, engine, logger);
      setStatus(`Running (fallback) ${kanal} mock:on results=${mockSonuc}`);
      return;
    }
    setStatus(`Running (fallback) ${kanal} deviceId=${env.DEVICE_ID}`);
  }
}

void mainTizen();

