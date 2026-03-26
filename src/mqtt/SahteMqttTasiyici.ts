import type { MqttMesajIsleyici, MqttTasiyici } from "./MqttTasiyici";

type PublishedItem = { topic: string; payload: Buffer; q: 0 | 1 | 2 };

export class SahteMqttTasiyici implements MqttTasiyici {
  private handlers = new Map<string, MqttMesajIsleyici[]>();
  public published: PublishedItem[] = [];

  async connect(): Promise<void> {}

  async subscribe(topic: string, handler: MqttMesajIsleyici, qos?: 0 | 1 | 2): Promise<void> {
    void qos;
    const arr = this.handlers.get(topic) ?? [];
    arr.push(handler);
    this.handlers.set(topic, arr);
  }

  async publish(topic: string, payload: Buffer | string, qos?: 0 | 1 | 2): Promise<void> {
    const buf = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, "utf8");
    const q = (qos ?? 1) as 0 | 1 | 2;
    this.published.push({ topic, payload: buf, q });
    const handlers = this.handlers.get(topic) ?? [];
    for (const h of handlers) {
      h(buf, topic);
    }
  }

  async disconnect(): Promise<void> {}

  trigger(topic: string, payload: unknown): void {
    const buf = Buffer.isBuffer(payload) ? payload : Buffer.from(JSON.stringify(payload), "utf8");
    const handlers = this.handlers.get(topic) ?? [];
    for (const h of handlers) {
      h(buf, topic);
    }
  }
}
