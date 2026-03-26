import path from "path";
import { loadEnv } from "./config/ortam";
import { DosyaAnahtarDegerDeposu } from "./storage/kv/DosyaAnahtarDegerDeposu";
import { OynatmaListesiDeposu } from "./services/playlist/oynatmaListesiDeposu";
import { OynaticiMotoru } from "./player/engine/OynaticiMotoru";
import { SahtePlatformAdaptoru } from "./platform/mock/SahtePlatformAdaptoru";
import { MqttJsTasiyici } from "./mqtt/MqttJsTasiyici";
import { KomutIsleyici } from "./mqtt/KomutIsleyici";
import { komutlarKonusu } from "./mqtt/konular";
import { KonsolKayitlayici } from "./infrastructure/logger/KonsolKayitlayici";

export async function main(): Promise<void> {
  const env = loadEnv();
  const logger = new KonsolKayitlayici();
  const storage = new DosyaAnahtarDegerDeposu(path.join(process.cwd(), "data", "kv.json"));
  const repo = new OynatmaListesiDeposu({
    storage,
    playlistEndpoint: env.PLAYLIST_ENDPOINT,
    logger,
  });
  const adapter = new SahtePlatformAdaptoru();
  const engine = new OynaticiMotoru(adapter);

  const mqttTransport = new MqttJsTasiyici({
    url: env.MQTT_BROKER_URL,
    reconnect: { minDelayMs: 300, maxDelayMs: 10000 },
  });
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
    (payload, topic) => {
      void handler.handleRawCommand(payload, topic);
    },
    env.MQTT_QOS as 0 | 1 | 2,
  );

  const initial = await repo.getPlaylist();
  engine.loadPlaylist(initial.playlist);
  engine.play();
}

if (typeof require !== "undefined" && require.main === module) {
  void main();
}
