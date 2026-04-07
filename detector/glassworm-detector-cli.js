#!/usr/bin/env node
// ⚠️ EDUCATIONAL POC — DO NOT USE MALICIOUSLY
// CLI entry point for Glassworm detection scanner.

'use strict';

const path = require('path');
const { scanDirectory } = require('./glassworm-unicode-scanner');
const { scanNodeModules } = require('./glassworm-npm-scanner');
const { formatCli, formatJson } = require('./glassworm-detection-reporter');

function parseArgs(args) {
  const parsed = { command: null, path: null, format: 'cli', includeDeps: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === 'scan') {
      parsed.command = 'scan';
    } else if (args[i] === '--format' && args[i + 1]) {
      parsed.format = args[i + 1];
      i++;
    } else if (args[i] === '--include-deps') {
      parsed.includeDeps = true;
    } else if (!args[i].startsWith('-') && !parsed.path && parsed.command) {
      parsed.path = args[i];
    }
  }
  return parsed;
}

function printUsage() {
  console.log(`
Glassworm Detector — Scan for invisible Unicode supply-chain attacks

Usage:
  node glassworm-detector-cli.js scan <path> [options]

Options:
  --format <cli|json>  Output format (default: cli)
  --include-deps       Also scan node_modules

Examples:
  node glassworm-detector-cli.js scan ./my-project
  node glassworm-detector-cli.js scan ./file.js --format json
  node glassworm-detector-cli.js scan . --include-deps
`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.command !== 'scan' || !args.path) {
    printUsage();
    process.exit(args.command ? 1 : 0);
  }

  if (!['cli', 'json'].includes(args.format)) {
    console.error(`Invalid format: "${args.format}". Use "cli" or "json".`);
    process.exit(1);
  }

  const targetPath = path.resolve(args.path);

  // Scan source files
  const result = scanDirectory(targetPath, { includeDeps: args.includeDeps });
  let allFindings = [...result.findings];

  // Scan node_modules if requested
  if (args.includeDeps) {
    const npmFindings = scanNodeModules(targetPath);
    allFindings.push(...npmFindings);
  }

  // Sort all findings by severity
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
  allFindings.sort((a, b) => (severityOrder[a.severity] || 9) - (severityOrder[b.severity] || 9));

  const meta = {
    path: args.path,
    filesScanned: result.filesScanned,
    duration: result.duration
  };

  // Output
  if (args.format === 'json') {
    console.log(formatJson(allFindings, meta));
  } else {
    console.log(formatCli(allFindings, meta));
  }

  // Exit code: 1 if findings, 0 if clean
  process.exit(allFindings.length > 0 ? 1 : 0);
}

main();
