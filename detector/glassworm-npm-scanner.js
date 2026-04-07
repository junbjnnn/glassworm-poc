// ⚠️ EDUCATIONAL POC — DO NOT USE MALICIOUSLY
// Scans node_modules for Glassworm-style supply chain indicators.

'use strict';

const fs = require('fs');
const path = require('path');
const { RULES } = require('./glassworm-detection-rules');

/**
 * Scan node_modules for suspicious packages.
 * Checks: package.json hooks, entry point files for Unicode clusters/markers.
 */
function scanNodeModules(projectPath) {
  const nmPath = path.join(path.resolve(projectPath), 'node_modules');
  if (!fs.existsSync(nmPath)) {
    return [];
  }

  const findings = [];
  let entries;
  try {
    entries = fs.readdirSync(nmPath, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === '.bin' || entry.name === '.cache') continue;

    // Handle scoped packages (@scope/pkg)
    if (entry.name.startsWith('@')) {
      const scopePath = path.join(nmPath, entry.name);
      try {
        const scopedPkgs = fs.readdirSync(scopePath, { withFileTypes: true });
        for (const pkg of scopedPkgs) {
          if (pkg.isDirectory()) {
            findings.push(...scanPackage(path.join(scopePath, pkg.name)));
          }
        }
      } catch { /* skip */ }
    } else {
      findings.push(...scanPackage(path.join(nmPath, entry.name)));
    }
  }

  return findings;
}

/**
 * Scan a single package directory.
 */
function scanPackage(pkgPath) {
  const findings = [];
  const pkgJsonPath = path.join(pkgPath, 'package.json');

  // Check package.json for suspicious install hooks
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const content = fs.readFileSync(pkgJsonPath, 'utf-8');
      const postinstallRule = RULES.find(r => r.id === 'POSTINSTALL_SUSPICIOUS');
      if (postinstallRule) {
        findings.push(...postinstallRule.check(content, pkgJsonPath));
      }
    } catch { /* skip */ }
  }

  // Check entry point for Unicode clusters and known markers
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    const mainFile = pkg.main || 'index.js';
    const mainPath = path.join(pkgPath, mainFile);
    if (fs.existsSync(mainPath)) {
      const content = fs.readFileSync(mainPath, 'utf-8');
      const unicodeRule = RULES.find(r => r.id === 'UNICODE_CLUSTER');
      const markerRule = RULES.find(r => r.id === 'KNOWN_MARKER');
      if (unicodeRule) findings.push(...unicodeRule.check(content, mainPath));
      if (markerRule) findings.push(...markerRule.check(content, mainPath));
    }
  } catch { /* skip */ }

  return findings;
}

module.exports = { scanNodeModules, scanPackage };
