/** Weryfikuje sygnaturę pliku zgodnie z deklarowanym MIME (ochrona przed podmianą rozszerzenia). */
export function imageMimeMatchesMagicBytes(buf: Buffer, mime: string): boolean {
  switch (mime) {
    case "image/jpeg":
      return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case "image/png":
      return (
        buf.length >= 8 &&
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47 &&
        buf[4] === 0x0d &&
        buf[5] === 0x0a &&
        buf[6] === 0x1a &&
        buf[7] === 0x0a
      );
    case "image/gif":
      return (
        buf.length >= 6 &&
        buf[0] === 0x47 &&
        buf[1] === 0x49 &&
        buf[2] === 0x46 &&
        buf[3] === 0x38 &&
        (buf[4] === 0x37 || buf[4] === 0x39) &&
        buf[5] === 0x61
      );
    case "image/webp":
      return (
        buf.length >= 12 &&
        buf[0] === 0x52 &&
        buf[1] === 0x49 &&
        buf[2] === 0x46 &&
        buf[3] === 0x46 &&
        buf[8] === 0x57 &&
        buf[9] === 0x45 &&
        buf[10] === 0x42 &&
        buf[11] === 0x50
      );
    case "image/svg+xml": {
      const head = buf.subarray(0, Math.min(buf.length, 256)).toString("utf8").trimStart();
      return head.startsWith("<svg") || head.startsWith("<?xml");
    }
    default:
      return false;
  }
}
