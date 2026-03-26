import type { AnahtarDegerDeposu } from "./AnahtarDegerDeposu";

export class BellekAnahtarDegerDeposu implements AnahtarDegerDeposu {
  private readonly m = new Map<string, string>();
  async getItem(key: string): Promise<string | undefined> {
    return this.m.get(key);
  }
  async setItem(key: string, value: string): Promise<void> {
    this.m.set(key, value);
  }
  async removeItem(key: string): Promise<void> {
    this.m.delete(key);
  }
}
