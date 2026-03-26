import type { AnahtarDegerDeposu } from "./AnahtarDegerDeposu";

export class TarayiciAnahtarDegerDeposu implements AnahtarDegerDeposu {
  async getItem(key: string): Promise<string | undefined> {
    const v = globalThis.localStorage?.getItem(key);
    return v ?? undefined;
  }
  async setItem(key: string, value: string): Promise<void> {
    globalThis.localStorage?.setItem(key, value);
  }
  async removeItem(key: string): Promise<void> {
    globalThis.localStorage?.removeItem(key);
  }
}

