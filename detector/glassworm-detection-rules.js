// ⚠️ EDUCATIONAL POC — DO NOT USE MALICIOUSLY
// Detection rules for identifying Glassworm-style Unicode obfuscation attacks.

'use strict';

// Variation selector ranges used by Glassworm
const VS_START = 0xFE00;
const VS_END = 0xFE0F;
const SVS_START = 0xE0100;
const SVS_END = 0xE01EF;

function isVariationSelector(cp) {
  return (cp >= VS_START && cp <= VS_END) || (cp >= SVS_START && cp <= SVS_END);
}

/**
 * Count consecutive variation selectors in a string, tracking line/column.
 * Returns array of clusters: { line, column, count }
 */
function findUnicodeClusters(content, threshold) {
  const clusters = [];
  let line = 1;
  let col = 1;
  let clusterStart = null;
  let clusterCount = 0;

  for (const char of content) {
    const cp = char.codePointAt(0);
    if (isVariationSelector(cp)) {
      if (clusterCount === 0) {
        clusterStart = { line, col };
      }
      clusterCount++;
    } else {
      if (clusterCount >= threshold) {
        clusters.push({ ...clusterStart, count: clusterCount });
      }
      clusterCount = 0;
      clusterStart = null;
    }
    if (char === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  // Handle trailing cluster
  if (clusterCount >= threshold && clusterStart) {
    clusters.push({ ...clusterStart, count: clusterCount });
  }
  return clusters;
}

// --- Rule definitions ---

const RULES = [
  {
    id: 'UNICODE_CLUSTER',
    severity: 'CRITICAL',
    description: 'Invisible Unicode variation selector cluster detected',
    check(content, filePath) {
      const clusters = findUnicodeClusters(content, 10);
      return clusters.map(c => ({
        rule: 'UNICODE_CLUSTER',
        severity: 'CRITICAL',
        file: filePath,
        line: c.line,
        column: c.col,
        context: `${c.count} invisible variation selectors in sequence`,
        details: { count: c.count }
      }));
    }
  },
  {
    id: 'EVAL_BUFFER',
    severity: 'HIGH',
    description: 'eval() or Function() with Buffer decode pattern',
    check(content, filePath) {
      const findings = [];
      const lines = content.split('\n');
      const pattern = /\b(eval\s*\(|new\s+Function\s*\().*?(Buffer\.from|\.toString\s*\(\s*['"]utf)/;
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(pattern);
        if (match) {
          findings.push({
            rule: 'EVAL_BUFFER',
            severity: 'HIGH',
            file: filePath,
            line: i + 1,
            column: match.index + 1,
            context: lines[i].trim().slice(0, 120),
            details: {}
          });
        }
      }
      return findings;
    }
  },
  {
    id: 'KNOWN_MARKER',
    severity: 'CRITICAL',
    description: 'Known Glassworm marker variable detected',
    check(content, filePath) {
      const findings = [];
      const lines = content.split('\n');
      const markers = ['lzcdrtfxyqiplpd'];
      for (let i = 0; i < lines.length; i++) {
        for (const marker of markers) {
          const idx = lines[i].indexOf(marker);
          if (idx !== -1) {
            findings.push({
              rule: 'KNOWN_MARKER',
              severity: 'CRITICAL',
              file: filePath,
              line: i + 1,
              column: idx + 1,
              context: lines[i].trim().slice(0, 120),
              details: { marker }
            });
          }
        }
      }
      return findings;
    }
  },
  {
    id: 'SOLANA_ENDPOINT',
    severity: 'MEDIUM',
    description: 'Solana RPC endpoint or wallet address pattern',
    check(content, filePath) {
      const findings = [];
      const lines = content.split('\n');
      const pattern = /(devnet\.solana|mainnet-beta\.solana|api\.mainnet\.solana|solana\.com\/rpc)/i;
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(pattern);
        if (match) {
          findings.push({
            rule: 'SOLANA_ENDPOINT',
            severity: 'MEDIUM',
            file: filePath,
            line: i + 1,
            column: match.index + 1,
            context: lines[i].trim().slice(0, 120),
            details: {}
          });
        }
      }
      return findings;
    }
  },
  {
    id: 'CREDENTIAL_ACCESS',
    severity: 'HIGH',
    description: 'Code accessing sensitive credential files',
    check(content, filePath) {
      const findings = [];
      const lines = content.split('\n');
      const pattern = /[\/'"](\.ssh|\.npmrc|\.gitconfig|\.aws\/credentials|\.env)\b/;
      for (let i = 0; i < lines.length; i++) {
        // Skip comments
        const trimmed = lines[i].trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) continue;

        const match = lines[i].match(pattern);
        if (match) {
          findings.push({
            rule: 'CREDENTIAL_ACCESS',
            severity: 'HIGH',
            file: filePath,
            line: i + 1,
            column: match.index + 1,
            context: lines[i].trim().slice(0, 120),
            details: { target: match[1] }
          });
        }
      }
      return findings;
    }
  },
  {
    id: 'POSTINSTALL_SUSPICIOUS',
    severity: 'HIGH',
    description: 'Suspicious postinstall script in package.json',
    check(content, filePath) {
      if (!filePath.endsWith('package.json')) return [];
      const findings = [];
      try {
        const pkg = JSON.parse(content);
        const scripts = pkg.scripts || {};
        const suspicious = ['postinstall', 'preinstall', 'install'];
        const dangerPattern = /\b(curl|wget|node\s+\w+\.js|sh\s|bash\s|powershell|eval)/i;
        for (const hook of suspicious) {
          if (scripts[hook] && dangerPattern.test(scripts[hook])) {
            findings.push({
              rule: 'POSTINSTALL_SUSPICIOUS',
              severity: 'HIGH',
              file: filePath,
              line: 1,
              column: 1,
              context: `${hook}: "${scripts[hook]}"`,
              details: { hook, script: scripts[hook] }
            });
          }
        }
      } catch { /* not valid JSON, skip */ }
      return findings;
    }
  }
];

module.exports = { RULES, findUnicodeClusters, isVariationSelector };
