# Glassworm POC

> **⚠️ EDUCATIONAL PURPOSE ONLY — DO NOT USE MALICIOUSLY ⚠️**
>
> This project demonstrates the Glassworm Unicode obfuscation attack for security research and education.
> It must NOT be used to create real malware, compromise systems, or harm others.

## What is Glassworm?

Glassworm is a supply-chain attack that hides malicious code in **invisible Unicode variation selector characters** (U+FE00-FE0F, U+E0100-E01EF). These characters render as zero-width in code editors, making the payload invisible during code review.

## Project Structure

```
glassworm-poc/
├── attack/                  — Attack demo (encoder + decoder + payload)
│   ├── glassworm-encoder.js   — Encode plaintext → invisible Unicode
│   ├── glassworm-decoder.js   — Decode invisible Unicode → plaintext
│   ├── glassworm-runner.js    — Decode + execute with safety wrapper
│   └── payload-demo.js        — Pre-encoded invisible payload
├── detector/                — Detection CLI tool
│   ├── glassworm-detector-cli.js       — CLI entry point
│   ├── glassworm-unicode-scanner.js    — Scan files for Unicode patterns
│   ├── glassworm-npm-scanner.js        — Scan node_modules
│   ├── glassworm-detection-rules.js    — Detection rules & signatures
│   └── glassworm-detection-reporter.js — CLI colored + JSON output
├── samples/                 — Test samples for detector validation
└── test/                    — Integration tests
```

## Usage

### Attack Demo

```bash
# Encode a payload into invisible Unicode
node attack/glassworm-encoder.js --file payload.js --output attack/payload-demo.js

# Run the (safe) demo payload
npm run decode
```

### Detection Tool

```bash
# Scan a directory
npm run scan -- ./samples

# Scan with JSON output
npm run scan:json -- ./samples

# Scan including node_modules
npm run scan -- ./my-project --include-deps
```

### Testing

```bash
npm test
```

## Safety Guardrails

- All files include educational disclaimer headers
- Demo payload is READ-ONLY (no network, no file writes, no persistence)
- `package.json` has `"private": true` to prevent npm publish
- Payload only reads `~/.ssh/known_hosts` and lists env var keys (not values)
