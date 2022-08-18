export function toBytesInt32(num: number) {
  return new Uint8Array([
    (num & 0xFF000000) >> 24,
    (num & 0x00FF0000) >> 16,
    (num & 0x0000FF00) >> 8,
    (num & 0x000000FF),
  ])
}
