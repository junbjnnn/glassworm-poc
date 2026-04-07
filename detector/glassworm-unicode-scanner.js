// ⚠️ EDUCATIONAL POC — DO NOT USE MALICIOUSLY
// Scans source files for Glassworm-style Unicode obfuscation patterns.

'use strict';

const fs = require('fs');
const path = require('path');
const { RULES } = require('./glassworm-detection-rules');

// File extensions to scan
const SCAN_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.mts', '.cts',
  '.jsx', '.tsx', '.py', '.json'
]);

// Directories to skip
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', 'dist', 'build', '.next', '__pycache__'
]);

/**
 * Scan a single file against all detection rules.
 * Returns array of findings.
 */
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const findings = [];
    for (const rule of RULES) {
      findings.push(...rule.check(content, filePath));
    }
    return findings;
  } catch {
    return []; // skip unreadable files
  }
}

/**
 * Recursively walk a directory, collecting files matching scan extensions.
 */
function walkDirectory(dirPath, options = {}) {
  const { includeDeps = false } = options;
  const files = [];

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' && !includeDeps) continue;
        if (SKIP_DIRS.has(entry.name) && entry.name !== 'node_modules') continue;
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SCAN_EXTENSIONS.has(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dirPath);
  return files;
}

/**
 * Scan a directory (or single file) for Glassworm indicators.
 * Returns { findings, filesScanned, duration }
 */
function scanDirectory(targetPath, options = {}) {
  const start = Date.now();
  const absPath = path.resolve(targetPath);
  let files;

  if (!fs.existsSync(absPath)) {
    return { findings: [], filesScanned: 0, duration: 0 };
  }

  if (fs.statSync(absPath).isFile()) {
    files = [absPath];
  } else {
    files = walkDirectory(absPath, options);
  }

  const findings = [];
  for (const file of files) {
    findings.push(...scanFile(file));
  }

  // Sort by severity: CRITICAL > HIGH > MEDIUM
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
  findings.sort((a, b) => (severityOrder[a.severity] || 9) - (severityOrder[b.severity] || 9));

  return {
    findings,
    filesScanned: files.length,
    duration: Date.now() - start
  };
}

module.exports = { scanFile, scanDirectory, walkDirectory, SCAN_EXTENSIONS };
