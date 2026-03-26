export function komutlarKonusu(deviceId: string): string {
  return `players/${deviceId}/commands`;
}

export function olaylarKonusu(deviceId: string): string {
  return `players/${deviceId}/events`;
}
