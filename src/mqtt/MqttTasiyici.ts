export type MqttMesajIsleyici = (payload: Buffer, topic: string) => void;

export interface MqttTasiyici {
  connect(): Promise<void>;
  subscribe(topic: string, handler: MqttMesajIsleyici, qos?: 0 | 1 | 2): Promise<void>;
  publish(topic: string, payload: Buffer | string, qos?: 0 | 1 | 2): Promise<void>;
  disconnect(): Promise<void>;
}
