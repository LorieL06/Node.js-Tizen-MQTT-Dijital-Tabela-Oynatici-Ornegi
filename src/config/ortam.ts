import { z } from "zod";

const envSchema = z.object({
  PLAYLIST_ENDPOINT: z.string().url(),
  MQTT_BROKER_URL: z.string().min(1),
  DEVICE_ID: z.string().min(1),
  MQTT_QOS: z.coerce.number().int().min(0).max(2),
  LOG_ENDPOINT: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(input: NodeJS.ProcessEnv = process.env): Env {
  const withDefaults = {
    PLAYLIST_ENDPOINT: input.PLAYLIST_ENDPOINT ?? "https://example.com/playlist",
    MQTT_BROKER_URL: input.MQTT_BROKER_URL ?? "ws://localhost:9001",
    DEVICE_ID: input.DEVICE_ID ?? "device-001",
    MQTT_QOS: input.MQTT_QOS ?? "1",
    LOG_ENDPOINT: input.LOG_ENDPOINT,
  };

  const parsed = envSchema.safeParse(withDefaults);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
  }
  return parsed.data;
}
