// ⚠️ EDUCATIONAL POC — DO NOT USE MALICIOUSLY
// Decodes invisible Unicode variation selectors back to plaintext bytes.

'use strict';

/**
 * Decode a single Unicode code point back to a byte value.
 * Returns null if the code point is not a variation selector.
 */
function decodeByte(codePoint) {
  if (codePoint >= 0xFE00 && codePoint <= 0xFE0F) {
    return codePoint - 0xFE00;
  }
  if (codePoint >= 0xE0100 && codePoint <= 0xE01EF) {
    return codePoint - 0xE0100 + 16;
  }
  return null;
}

/**
 * Decode a string of invisible Unicode variation selectors to a byte array.
 * Skips any non-variation-selector characters.
 */
function decode(invisibleStr) {
  const bytes = [];
  for (const char of invisibleStr) {
    const byte = decodeByte(char.codePointAt(0));
    if (byte !== null) {
      bytes.push(byte);
    }
  }
  return Buffer.from(bytes);
}

/**
 * Decode invisible Unicode string to a UTF-8 string.
 */
function decodeToString(invisibleStr) {
  return decode(invisibleStr).toString('utf-8');
}

module.exports = { decode, decodeByte, decodeToString };
