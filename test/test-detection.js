// ⚠️ EDUCATIONAL POC — Integration tests for Glassworm detection
'use strict';

const path = require('path');
const { scanFile, scanDirectory } = require('../detector/glassworm-unicode-scanner');
const { encode, encodeByte } = require('../attack/glassworm-encoder');
const { decode, decodeByte, decodeToString } = require('../attack/glassworm-decoder');

const SAMPLES_DIR = path.join(__dirname, '..', 'samples');
let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ ${testName}`);
    failed++;
  }
}

// --- Encoder/Decoder roundtrip tests ---
console.log('\n=== Encoder/Decoder Roundtrip ===');

// ASCII roundtrip
const ascii = 'Hello, World! 123 ~!@#$%^&*()';
assert(decodeToString(encode(ascii)) === ascii, 'ASCII roundtrip');

// UTF-8 roundtrip
const utf8 = 'Unicode: \u00e9\u00e8\u00ea \u00fc\u00f6\u00e4';
assert(decodeToString(encode(utf8)) === utf8, 'UTF-8 roundtrip');

// All byte values encode/decode at single-byte level (0-255)
let allBytesMatch = true;
for (let i = 0; i < 256; i++) {
  const char = encodeByte(i);
  const result = decodeByte(char.codePointAt(0));
  if (result !== i) { allBytesMatch = false; break; }
}
assert(allBytesMatch, 'All 256 byte values encode/decode individually');

// Single byte encode/decode
assert(decodeByte(encodeByte(0).codePointAt(0)) === 0, 'Byte 0 encode/decode');
assert(decodeByte(encodeByte(15).codePointAt(0)) === 15, 'Byte 15 encode/decode (FE0F boundary)');
assert(decodeByte(encodeByte(16).codePointAt(0)) === 16, 'Byte 16 encode/decode (E0100 boundary)');
assert(decodeByte(encodeByte(255).codePointAt(0)) === 255, 'Byte 255 encode/decode');

// Empty string
assert(encode('') === '', 'Empty string encodes to empty');
assert(decodeToString(encode('')) === '', 'Empty string roundtrip');

// --- Detection tests ---
console.log('\n=== Detection Rules ===');

// Clean file: expect 0 findings
const cleanFindings = scanFile(path.join(SAMPLES_DIR, 'clean-file.js'));
assert(cleanFindings.length === 0, 'clean-file.js: 0 findings');

// Hidden payload: expect UNICODE_CLUSTER + EVAL_BUFFER
const hiddenFindings = scanFile(path.join(SAMPLES_DIR, 'hidden-payload.js'));
const hiddenRules = hiddenFindings.map(f => f.rule);
assert(hiddenRules.includes('UNICODE_CLUSTER'), 'hidden-payload.js: UNICODE_CLUSTER detected');
assert(hiddenRules.includes('EVAL_BUFFER'), 'hidden-payload.js: EVAL_BUFFER detected');

// Eval pattern: expect EVAL_BUFFER
const evalFindings = scanFile(path.join(SAMPLES_DIR, 'eval-pattern.js'));
assert(evalFindings.some(f => f.rule === 'EVAL_BUFFER'), 'eval-pattern.js: EVAL_BUFFER detected');

// Known marker: expect KNOWN_MARKER
const markerFindings = scanFile(path.join(SAMPLES_DIR, 'known-marker.js'));
assert(markerFindings.some(f => f.rule === 'KNOWN_MARKER'), 'known-marker.js: KNOWN_MARKER detected');

// Credential access: expect CREDENTIAL_ACCESS
const credFindings = scanFile(path.join(SAMPLES_DIR, 'credential-reader.js'));
assert(credFindings.some(f => f.rule === 'CREDENTIAL_ACCESS'), 'credential-reader.js: CREDENTIAL_ACCESS detected');

// Solana C2: expect SOLANA_ENDPOINT
const solanaFindings = scanFile(path.join(SAMPLES_DIR, 'solana-c2.js'));
assert(solanaFindings.some(f => f.rule === 'SOLANA_ENDPOINT'), 'solana-c2.js: SOLANA_ENDPOINT detected');

// Suspicious postinstall: expect POSTINSTALL_SUSPICIOUS
const pkgFindings = scanFile(path.join(SAMPLES_DIR, 'fake-package', 'package.json'));
assert(pkgFindings.some(f => f.rule === 'POSTINSTALL_SUSPICIOUS'), 'fake-package: POSTINSTALL_SUSPICIOUS detected');

// --- Directory scan test ---
console.log('\n=== Directory Scan ===');
const dirResult = scanDirectory(SAMPLES_DIR);
assert(dirResult.filesScanned > 0, `Scanned ${dirResult.filesScanned} files`);
assert(dirResult.findings.length > 0, `Found ${dirResult.findings.length} total findings`);
assert(dirResult.duration >= 0, `Completed in ${dirResult.duration}ms`);

// Verify findings are sorted by severity
const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
let sorted = true;
for (let i = 1; i < dirResult.findings.length; i++) {
  if ((severityOrder[dirResult.findings[i].severity] || 9) <
      (severityOrder[dirResult.findings[i - 1].severity] || 9)) {
    sorted = false;
    break;
  }
}
assert(sorted, 'Findings sorted by severity (CRITICAL > HIGH > MEDIUM)');

// --- Summary ---
console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
process.exit(failed > 0 ? 1 : 0);
