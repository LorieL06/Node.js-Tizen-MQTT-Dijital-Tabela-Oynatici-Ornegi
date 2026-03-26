import {
  mqttCommandSchema,
  commandResultErrorSchema,
  commandResultSuccessSchema,
  type CommandResult,
  type MqttCommand,
} from "./komutSemalari";
import { olaylarKonusu } from "./konular";
import type { OynatmaListesiDeposu } from "../services/playlist/oynatmaListesiDeposu";
import type { OynaticiMotoru } from "../player/engine/OynaticiMotoru";
import type { MqttTasiyici } from "./MqttTasiyici";
import type { Kayitlayici } from "../infrastructure/logger/Kayitlayici";

type KomutIsleyiciBagimliliklari = {
  deviceId: string;
  mqtt: MqttTasiyici;
  playlistRepo: OynatmaListesiDeposu;
  engine: OynaticiMotoru;
  logger?: Kayitlayici;
  processedCorrelationIds?: {
    ttlMs: number;
  };
};

export class KomutIsleyici {
  private readonly deviceId: string;
  private readonly mqtt: MqttTasiyici;
  private readonly playlistRepo: OynatmaListesiDeposu;
  private readonly engine: OynaticiMotoru;
  private readonly logger?: Kayitlayici;
  private readonly processed = new Map<string, number>();
  private readonly ttlMs: number;

  constructor(deps: KomutIsleyiciBagimliliklari) {
    this.deviceId = deps.deviceId;
    this.mqtt = deps.mqtt;
    this.playlistRepo = deps.playlistRepo;
    this.engine = deps.engine;
    this.logger = deps.logger;
    this.ttlMs = deps.processedCorrelationIds?.ttlMs ?? 10 * 60 * 1000;
  }

  private cleanup(now: number): void {
    for (const [k, v] of this.processed.entries()) {
      if (now - v > this.ttlMs) {
        this.processed.delete(k);
      }
    }
  }

  private isDuplicate(correlationId: string, now: number): boolean {
    this.cleanup(now);
    const v = this.processed.get(correlationId);
    return v !== undefined;
  }

  private markProcessed(correlationId: string, now: number): void {
    this.cleanup(now);
    this.processed.set(correlationId, now);
  }

  private async publish(result: CommandResult): Promise<void> {
    const topic = olaylarKonusu(this.deviceId);
    await this.mqtt.publish(topic, Buffer.from(JSON.stringify(result), "utf8"), 1);
  }

  async handleRawCommand(raw: Buffer, _topic: string): Promise<void> {
    const rawStr = raw.toString("utf8");
    let parsedUnknown: unknown;
    try {
      parsedUnknown = JSON.parse(rawStr);
    } catch {
      this.logger?.warn("invalid JSON command", { deviceId: this.deviceId });
      const result = commandResultErrorSchema.parse({
        type: "command_result",
        command: "unknown",
        correlationId: "unknown",
        status: "error",
        error: { code: "INVALID_JSON", message: "Command payload is not valid JSON" },
      });
      await this.publish(result);
      return;
    }
    const parsed = mqttCommandSchema.safeParse(parsedUnknown);
    if (!parsed.success) {
      this.logger?.warn("invalid command payload", { deviceId: this.deviceId });
      const result = commandResultErrorSchema.parse({
        type: "command_result",
        command: "unknown",
        correlationId: "unknown",
        status: "error",
        error: { code: "INVALID_PAYLOAD", message: "Command payload validation failed" },
      });
      await this.publish(result);
      return;
    }
    const cmd = parsed.data as MqttCommand;
    const now = Date.now();
    if (this.isDuplicate(cmd.correlationId, now)) {
      this.logger?.info("duplicate command ignored", {
        command: cmd.command,
        correlationId: cmd.correlationId,
      });
      const result = commandResultSuccessSchema.parse({
        type: "command_result",
        command: cmd.command,
        correlationId: cmd.correlationId,
        status: "success",
        payload: { duplicate: true },
      });
      await this.publish(result);
      return;
    }
    this.markProcessed(cmd.correlationId, now);

    try {
      const result = await this.execute(cmd);
      await this.publish(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger?.error("command execution failed", {
        command: cmd.command,
        correlationId: cmd.correlationId,
        message,
      });
      const result = commandResultErrorSchema.parse({
        type: "command_result",
        command: cmd.command,
        correlationId: cmd.correlationId,
        status: "error",
        error: { code: "COMMAND_FAILED", message },
      });
      await this.publish(result);
    }
  }

  private async execute(cmd: MqttCommand): Promise<CommandResult> {
    if (cmd.command === "reload_playlist") {
      const r = await this.playlistRepo.getPlaylist();
      this.engine.loadPlaylist(r.playlist);
      return commandResultSuccessSchema.parse({
        type: "command_result",
        command: "reload_playlist",
        correlationId: cmd.correlationId,
        status: "success",
        payload: { source: r.source, updated: r.updated },
      });
    }
    if (cmd.command === "restart_player") {
      await this.engine.restart();
      return commandResultSuccessSchema.parse({
        type: "command_result",
        command: "restart_player",
        correlationId: cmd.correlationId,
        status: "success",
        payload: { restarted: true },
      });
    }
    if (cmd.command === "play") {
      this.engine.play();
      return commandResultSuccessSchema.parse({
        type: "command_result",
        command: "play",
        correlationId: cmd.correlationId,
        status: "success",
      });
    }
    if (cmd.command === "pause") {
      await this.engine.pause();
      return commandResultSuccessSchema.parse({
        type: "command_result",
        command: "pause",
        correlationId: cmd.correlationId,
        status: "success",
      });
    }
    if (cmd.command === "set_volume") {
      const volume = cmd.volume ?? 50;
      await this.engine.setVolume(volume);
      return commandResultSuccessSchema.parse({
        type: "command_result",
        command: "set_volume",
        correlationId: cmd.correlationId,
        status: "success",
        payload: { volume },
      });
    }
    if (cmd.command === "screenshot") {
      const s = await this.engine.screenshot();
      return commandResultSuccessSchema.parse({
        type: "command_result",
        command: "screenshot",
        correlationId: cmd.correlationId,
        status: "success",
        payload: { format: s.format, base64: s.base64 },
      });
    }
    throw new Error("Unknown command");
  }
}
