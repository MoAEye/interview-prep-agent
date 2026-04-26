/**
 * Inspect first bytes of a TTS HTTP body to detect MP3 vs JSON/HTML error pages.
 * @param {ArrayBuffer | Uint8Array} bufferOrU8
 */
export function classifyAudioResponsePrefix(bufferOrU8) {
  const u8 =
    bufferOrU8 instanceof Uint8Array ? bufferOrU8 : new Uint8Array(bufferOrU8 || []);
  if (u8.length < 4) {
    return { looksMpeg: false, looksJson: false, looksHtml: false };
  }
  const looksMpeg =
    (u8[0] === 0xff && (u8[1] & 0xe0) === 0xe0) ||
    (u8[0] === 0x49 && u8[1] === 0x44 && u8[2] === 0x33);
  const looksJson = u8[0] === 0x7b;
  const looksHtml = u8[0] === 0x3c;
  return { looksMpeg, looksJson, looksHtml };
}

/**
 * @param {{ looksMpeg: boolean, looksJson: boolean, looksHtml: boolean }} flags
 * @param {boolean} serverSaysMpeg - Content-Type hints audio
 */
export function isLikelyBadTtsPayload(flags, serverSaysMpeg) {
  const { looksMpeg, looksJson, looksHtml } = flags;
  return looksJson || looksHtml || (!looksMpeg && !serverSaysMpeg);
}
