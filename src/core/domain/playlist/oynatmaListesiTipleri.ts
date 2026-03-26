export type PlaylistItemImage = { type: "image"; url: string; duration: number };
export type PlaylistItemVideo = { type: "video"; url: string };
export type PlaylistItem = PlaylistItemImage | PlaylistItemVideo;
export type OynatmaListesi = { playlist: PlaylistItem[] };
