// ⚠️ EDUCATIONAL POC — DO NOT USE MALICIOUSLY
// Formats detection findings as colored CLI output or JSON.

'use strict';

// ANSI color codes (no external deps needed)
const COLORS = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
  dim: '\x1b[2m'
};

const SEVERITY_COLORS = {
  CRITICAL: COLORS.red,
  HIGH: COLORS.yellow,
  MEDIUM: COLORS.cyan
};

/**
 * Format findings as colored CLI terminal output.
 */
function formatCli(findings, meta) {
  const lines = [];

  lines.push(`${COLORS.bold}🔍 Glassworm Detector v0.1.0${COLORS.reset}`);
  lines.push(`Scanning: ${meta.path} (${meta.filesScanned} files)\n`);

  if (findings.length === 0) {
    lines.push(`${COLORS.bold}✅ No findings — clean!${COLORS.reset}\n`);
  } else {
    for (const f of findings) {
      const color = SEVERITY_COLORS[f.severity] || COLORS.gray;
      const severity = `${color}${COLORS.bold}${f.severity.padEnd(9)}${COLORS.reset}`;
      const location = `${COLORS.dim}${f.file}:${f.line}:${f.column}${COLORS.reset}`;
      const rule = `${color}${f.rule}${COLORS.reset}`;

      lines.push(`${severity} ${location}  ${rule}`);
      lines.push(`          ${COLORS.gray}${f.context}${COLORS.reset}`);
      lines.push('');
    }
  }

  // Summary line
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0 };
  for (const f of findings) counts[f.severity] = (counts[f.severity] || 0) + 1;

  lines.push(`${'─'.repeat(50)}`);
  lines.push(
    `Scan complete: ${meta.filesScanned} files in ${(meta.duration / 1000).toFixed(2)}s`
  );
  lines.push(
    `Results: ${findings.length} findings ` +
    `(${COLORS.red}${counts.CRITICAL} critical${COLORS.reset}, ` +
    `${COLORS.yellow}${counts.HIGH} high${COLORS.reset}, ` +
    `${COLORS.cyan}${counts.MEDIUM} medium${COLORS.reset})`
  );

  return lines.join('\n');
}

/**
 * Format findings as JSON report.
 */
function formatJson(findings, meta) {
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0 };
  for (const f of findings) counts[f.severity] = (counts[f.severity] || 0) + 1;

  return JSON.stringify({
    scan: {
      path: meta.path,
      files: meta.filesScanned,
      duration_ms: meta.duration,
      timestamp: new Date().toISOString()
    },
    findings: findings.map(f => ({
      rule: f.rule,
      severity: f.severity,
      file: f.file,
      line: f.line,
      column: f.column,
      context: f.context,
      details: f.details || {}
    })),
    summary: {
      critical: counts.CRITICAL,
      high: counts.HIGH,
      medium: counts.MEDIUM,
      total: findings.length
    }
  }, null, 2);
}

module.exports = { formatCli, formatJson };
