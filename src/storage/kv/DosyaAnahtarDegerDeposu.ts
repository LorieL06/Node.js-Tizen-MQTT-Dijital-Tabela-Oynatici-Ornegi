import { promises as fs } from "fs";
import path from "path";
import type { AnahtarDegerDeposu } from "./AnahtarDegerDeposu";

type KvFile = { data: Record<string, string> };

export class DosyaAnahtarDegerDeposu implements AnahtarDegerDeposu {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private async readFile(): Promise<Record<string, string>> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as KvFile;
      return parsed.data ?? {};
    } catch (err: any) {
      if (err?.code === "ENOENT") {
        return {};
      }
      return {};
    }
  }

  private async writeFile(data: Record<string, string>): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    const content = JSON.stringify({ data } satisfies KvFile, null, 2);
    await fs.writeFile(this.filePath, content, "utf8");
  }

  async getItem(key: string): Promise<string | undefined> {
    const data = await this.readFile();
    return data[key];
  }

  async setItem(key: string, value: string): Promise<void> {
    const data = await this.readFile();
    data[key] = value;
    await this.writeFile(data);
  }

  async removeItem(key: string): Promise<void> {
    const data = await this.readFile();
    delete data[key];
    await this.writeFile(data);
  }
}
