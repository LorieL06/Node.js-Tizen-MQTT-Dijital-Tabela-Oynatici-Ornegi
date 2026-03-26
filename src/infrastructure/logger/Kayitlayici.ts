export type LogLevel = "info" | "warn" | "error";

export type LogEvent = {
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
  ts: number;
};

export interface Kayitlayici {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  emit?(event: LogEvent): Promise<void>;
}
