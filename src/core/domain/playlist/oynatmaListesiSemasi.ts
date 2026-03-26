import { z } from "zod";
import type { OynatmaListesi } from "./oynatmaListesiTipleri";

const playlistItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("image"),
    url: z.string().url(),
    duration: z.number().int().positive(),
  }),
  z.object({ type: z.literal("video"), url: z.string().url() }),
]);

export const playlistSchema = z.object({ playlist: z.array(playlistItemSchema).nonempty() });
export type PlaylistSchema = z.infer<typeof playlistSchema>;

export function parsePlaylist(input: unknown): OynatmaListesi {
  const r = playlistSchema.safeParse(input);
  if (!r.success) {
    throw new Error(`Invalid playlist payload: ${r.error.message}`);
  }
  return r.data as OynatmaListesi;
}
