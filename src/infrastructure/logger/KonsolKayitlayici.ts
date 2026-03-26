import type { Kayitlayici, LogLevel } from "./Kayitlayici";

export class KonsolKayitlayici implements Kayitlayici {
  info(message: string, meta?: Record<string, unknown>): void {
    this.log("info", message, meta);
  }
  warn(message: string, meta?: Record<string, unknown>): void {
    this.log("warn", message, meta);
  }
  error(message: string, meta?: Record<string, unknown>): void {
    this.log("error", message, meta);
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const payload = meta ? { message, ...meta } : { message };
    if (level === "error") {
      console.error(level, payload);
      return;
    }
    if (level === "warn") {
      console.warn(level, payload);
      return;
    }
    console.info(level, payload);
  }
}
