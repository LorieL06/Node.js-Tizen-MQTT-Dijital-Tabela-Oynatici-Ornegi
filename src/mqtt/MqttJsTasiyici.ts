import mqtt from "mqtt";
import type { MqttMesajIsleyici, MqttTasiyici } from "./MqttTasiyici";

type MqttJsTasiyiciSecenekleri = {
  url: string;
  clientId?: string;
  reconnect?: {
    minDelayMs?: number;
    maxDelayMs?: number;
  };
};

export class MqttJsTasiyici implements MqttTasiyici {
  private readonly url: string;
  private readonly clientId: string;
  private readonly reconnectMinDelayMs: number;
  private readonly reconnectMaxDelayMs: number;

  private client: mqtt.MqttClient | undefined;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private reconnectDelayMs: number;
  private readonly topicHandlers = new Map<string, MqttMesajIsleyici[]>();
  private readonly topicQos = new Map<string, 0 | 1 | 2>();
  private connected = false;
  private shuttingDown = false;

  constructor(opts: MqttJsTasiyiciSecenekleri) {
    this.url = opts.url;
    this.clientId = opts.clientId ?? `signage-player-${Math.random().toString(16).slice(2)}`;
    this.reconnectMinDelayMs = opts.reconnect?.minDelayMs ?? 300;
    this.reconnectMaxDelayMs = opts.reconnect?.maxDelayMs ?? 10000;
    this.reconnectDelayMs = this.reconnectMinDelayMs;
  }

  async connect(): Promise<void> {
    this.shuttingDown = false;
    this.connected = false;
    await new Promise<void>((resolve, reject) => {
      let done = false;
      const timeout = setTimeout(() => {
        if (done) return;
        done = true;
        reject(new Error("MQTT connect timeout"));
      }, 10000);
      this.createClient(
        () => {
          if (done) return;
          done = true;
          clearTimeout(timeout);
          resolve();
        },
        (err) => {
          if (done) return;
          done = true;
          clearTimeout(timeout);
          reject(err);
        },
      );
    });
  }

  private createClient(onFirstConnect?: () => void, onFirstError?: (err: Error) => void): void {
    if (this.client) {
      try {
        this.client.end(true);
      } catch {}
    }
    this.client = mqtt.connect(this.url, {
      clientId: this.clientId,
      clean: true,
      reconnectPeriod: 0,
    });
    this.client.on("connect", async () => {
      this.connected = true;
      this.reconnectDelayMs = this.reconnectMinDelayMs;
      for (const [topic, qos] of this.topicQos.entries()) {
        await new Promise<void>((resolve, reject) => {
          this.client!.subscribe(topic, { qos }, (err) => (err ? reject(err) : resolve()));
        });
      }
      onFirstConnect?.();
    });
    this.client.on("message", (topic, payload) => {
      const handlers = this.topicHandlers.get(topic) ?? [];
      for (const h of handlers) {
        h(payload, topic);
      }
    });
    const schedule = () => {
      if (this.shuttingDown) {
        return;
      }
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
      const delay = this.reconnectDelayMs;
      this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, this.reconnectMaxDelayMs);
      this.reconnectTimer = setTimeout(() => {
        this.createClient();
      }, delay);
    };
    this.client.on("close", schedule);
    this.client.on("offline", schedule);
    this.client.on("error", (err) => {
      onFirstError?.(err instanceof Error ? err : new Error(String(err)));
      schedule();
    });
  }

  async subscribe(topic: string, handler: MqttMesajIsleyici, qos?: 0 | 1 | 2): Promise<void> {
    const arr = this.topicHandlers.get(topic) ?? [];
    arr.push(handler);
    this.topicHandlers.set(topic, arr);
    this.topicQos.set(topic, qos ?? 1);
    if (this.client?.connected) {
      await new Promise<void>((resolve, reject) => {
        this.client!.subscribe(topic, { qos: qos ?? 1 }, (err) => (err ? reject(err) : resolve()));
      });
    }
  }

  async publish(topic: string, payload: Buffer | string, qos?: 0 | 1 | 2): Promise<void> {
    if (!this.client) {
      throw new Error("MQTT client not created");
    }
    const buf = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, "utf8");
    await new Promise<void>((resolve, reject) => {
      this.client!.publish(topic, buf, { qos: qos ?? 1 }, (err) => (err ? reject(err) : resolve()));
    });
  }

  async disconnect(): Promise<void> {
    this.shuttingDown = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.client) {
      await new Promise<void>((resolve) => {
        this.client!.end(true, {}, () => resolve());
      });
    }
    this.connected = false;
  }
}
