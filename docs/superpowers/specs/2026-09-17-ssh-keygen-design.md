# SSH Key Pair Generator Tool Design

## Goal

Add a new "SSH Key Generator" tool that generates an SSH key pair (Ed25519 or RSA) entirely client-side, matching `ssh-keygen`'s default output formats: an `openssh-key-v1` PEM private key (optionally passphrase-encrypted), a single-line OpenSSH public key, and SHA256/MD5 fingerprints. Zero new npm dependencies — key generation uses the browser's native Web Crypto API; the OpenSSH wire format and the `bcrypt_pbkdf` key-derivation function (used for passphrase encryption) are hand-implemented, since no maintained, dependency-free browser package exists for either.

## Registration

- Route `/crypto/ssh-keygen`, tool id `ssh-keygen`, category `Cryptography`, icon `Terminal` (lucide-react; `KeyRound` and `KeySquare` are already used by `bp-jwt` and `jwt-decode`)
- Register in `src/lib/routes.ts`, `src/lib/tools-config.ts`, `src/App.tsx`
- New `ssh-keygen` namespace added to `tools.json` in all 9 locales

## Scope

In scope: generating a fresh Ed25519 or RSA (2048/3072/4096) SSH key pair, with an optional passphrase, in the formats `ssh-keygen` produces by default (OpenSSH `openssh-key-v1` private key, single-line public key, fingerprints).

Out of scope (explicitly deferred, not stubbed): SSH certificates (CA-signed public keys), X.509/TLS certificates, ECDSA/DSA algorithms, parsing or converting existing keys, and any server-side or storage component. Nothing is uploaded; all computation is local, matching every other tool in this repo.

## Core module — `src/lib/tools/ssh-keygen.ts` (pure, unit-tested)

```ts
type SshAlgorithm = 'ed25519' | 'rsa'
type RsaKeySize = 2048 | 3072 | 4096

interface GenerateOptions {
  algorithm: SshAlgorithm
  rsaKeySize?: RsaKeySize // required when algorithm === 'rsa', ignored otherwise
  comment: string // may be empty
  passphrase: string // empty string = unencrypted private key
}

interface SshKeyPairResult {
  privateKeyPem: string // "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----\n"
  publicKeyLine: string // "ssh-ed25519 AAAA... comment" or "ssh-rsa AAAA... comment"
  fingerprintSha256: string // "SHA256:base64nopad..."
  fingerprintMd5: string // "aa:bb:cc:...:ff" (legacy, colon-hex)
}

async function generateSshKeyPair(options: GenerateOptions): Promise<SshKeyPairResult>
```

### Key generation

- **Ed25519**: `crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])`, then `exportKey('raw', publicKey)` (32 bytes) and `exportKey('pkcs8', privateKey)` to recover the 32-byte seed (the last 32 bytes of the PKCS8 `OneAsymmetricKey` OCTET STRING — Ed25519 PKCS8 has a fixed, well-known structure, so the seed can be sliced out by a fixed byte offset without a general ASN.1 parser).
- **RSA**: `crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: rsaKeySize, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' }, true, ['sign','verify'])`, then `exportKey('jwk', ...)` on both keys to obtain `n, e, d, p, q, dp, dq, qi` as base64url — decoded to big-endian byte arrays (via a small base64url decoder, no BigInt math needed since Web Crypto already produced the CRT parameters).

### OpenSSH wire format — low-level encoders

- `sshString(bytes: Uint8Array): Uint8Array` — 4-byte big-endian length prefix + bytes (per OpenSSH `PROTOCOL.key` / RFC 4251 §5).
- `mpint(bytes: Uint8Array): Uint8Array` — same as `sshString` but prepends a `0x00` byte if the high bit of the first byte is set (positive-number encoding for RSA integers).
- `concatUint8Arrays(...parts): Uint8Array`.
- Public key blob:
  - Ed25519: `sshString("ssh-ed25519") + sshString(pubkeyBytes)`
  - RSA: `sshString("ssh-rsa") + mpint(e) + mpint(n)`
- Public key line: `<ssh-ed25519|ssh-rsa> " " base64(blob) " " comment` (trim the trailing space when comment is empty).
- Private section (before encryption, per `openssh-key-v1` spec):
  - `checkint` (random uint32) repeated twice
  - Ed25519: `sshString("ssh-ed25519") + sshString(pubkey) + sshString(privkey32 + pubkey32)` (OpenSSH stores the 32-byte seed concatenated with the 32-byte public key as the "private key" field)
  - RSA: `sshString("ssh-rsa") + mpint(n) + mpint(e) + mpint(d) + mpint(iqmp) + mpint(p) + mpint(q)` (note the OpenSSH field order differs from PKCS8/JWK order — `iqmp` before `p`/`q`)
  - `sshString(comment)`
  - padding bytes `0x01, 0x02, 0x03, ...` up to the cipher block size (8 bytes for `none`, 16 for `aes256-ctr`)
- Full private key file structure: magic `"openssh-key-v1\0"` + `sshString(ciphername)` + `sshString(kdfname)` + `sshString(kdfoptions)` + `uint32(1)` (number of keys) + `sshString(publicKeyBlob)` + `sshString(encryptedOrPlainPrivateSection)`, base64-encoded in 70-column lines and wrapped in the `BEGIN/END OPENSSH PRIVATE KEY` PEM markers.
  - Unencrypted: `ciphername = "none"`, `kdfname = "none"`, `kdfoptions = ""` (empty string), private section is plaintext.
  - Encrypted: `ciphername = "aes256-ctr"`, `kdfname = "bcrypt"`, `kdfoptions = sshString(salt) + uint32(rounds)`, private section is AES-256-CTR ciphertext.

### Passphrase encryption — hand-rolled `bcrypt_pbkdf`

New internal module `src/lib/tools/bcrypt-pbkdf.ts`:
- `blowfishSetup(key, salt)` / `blowfishEncrypt(block)` — standard Blowfish cipher (P-array + 4 S-boxes, 16 rounds), initialized with the OpenBSD `bcrypt` variant's Eksblowfish key schedule.
- `bcryptHash(password, salt): Uint8Array` — the core `bcrypt` hash function adapted for KDF use (fixed at the algorithm's required 64 rounds internally, distinct from the caller-supplied `rounds` parameter used for stretching).
- `bcryptPbkdf(password: Uint8Array, salt: Uint8Array, rounds: number, keyLen: number): Uint8Array` — the OpenSSH `bcrypt_pbkdf` construction: repeatedly hashes `(password, salt)` and `(password, prevHash)` across `rounds` iterations, XORing outputs, then stretches/truncates via SHA-512 to `keyLen` bytes. This is what `ssh-keygen -o` uses for `-N <passphrase>`.
- Derives 48 bytes (32-byte AES-256 key + 16-byte IV) from a 16-byte random salt and `rounds = 16` (OpenSSH's own default), matching real `ssh-keygen` output parameters exactly.
- Encryption: `crypto.subtle.importKey('raw', aesKeyBytes, 'AES-CTR', false, ['encrypt'])` then `crypto.subtle.encrypt({ name: 'AES-CTR', counter: iv, length: 128 }, key, paddedPrivateSection)`.

Verified against the published OpenBSD/OpenSSH `bcrypt_pbkdf` test vectors (see Testing).

### Fingerprints

- SHA-256: `crypto.subtle.digest('SHA-256', publicKeyBlob)` → base64, no padding, prefixed `"SHA256:"` (matches `ssh-keygen -l` default since OpenSSH 6.8).
- MD5 (legacy): `crypto-js` MD5 (already a project dependency, used by the existing MD5 tool) over the public key blob → lowercase colon-separated hex pairs.

## Passphrase-derivation cost — Web Worker

`bcrypt_pbkdf` is intentionally slow (≈100ms–1s+ at `rounds = 16` depending on device). Run key generation + passphrase encryption in a dedicated worker (`src/lib/tools/ssh-keygen.worker.ts`), following the existing `bg-remove.worker.ts` / `RegexPage` worker pattern, so the UI thread never blocks. The worker receives `GenerateOptions` and returns `SshKeyPairResult` (or a serializable error).

## Page flow — `SshKeygenPage.tsx`

Single-column form (no file upload, no large preview — this tool has no sidebar/result-split layout need), following `docs/design-system.md`:

1. **Inputs**: algorithm select (Ed25519 default / RSA), RSA key-size select (`SelectTrigger size="sm"`, only shown when RSA is selected, default 3072), comment text input (`Input`, placeholder like `you@example.com`), passphrase input (`Input type="password"`, optional, empty = unencrypted), "Generate" button.
2. **Generating state**: `ToolStatus` (`role="status"`) while the worker runs, since RSA-4096 keygen + bcrypt can take over a second.
3. **Result state**:
   - Public key line — `ToolResultField` (single-line, copyable)
   - Private key PEM — `ToolResultField` with `multiline`, copyable, plus a "Download" button (`Blob([privateKeyPem], { type: 'text/plain' })` + `<a download>` named `id_ed25519` / `id_rsa`, matching `ssh-keygen`'s default filename convention) — no file extension, matching real OpenSSH private key file naming
   - Public key — separate "Download" button for the `.pub` file (`id_ed25519.pub` / `id_rsa.pub`)
   - SHA256 and MD5 fingerprints — two `ToolResultField`s
   - "Generate another" re-runs the form without navigating away
4. Inline disclaimer (`ToolFeedback`-style muted text, like `beijing-getihu.disclaimer`): keys never leave the browser; regenerate rather than reuse if this page was ever loaded over an untrusted network.

## Error handling

- RSA/Ed25519 `generateKey` failures (e.g., unsupported browser) surface via `ToolError` with a message naming the missing algorithm; Ed25519 requires a reasonably modern browser (Chrome 137+/Firefox 130+/Safari 17+) — detect via a `try/catch` around a feature probe on mount and disable the Ed25519 option with an inline note if unavailable, defaulting to RSA instead.
- Worker exceptions (e.g., OOM on RSA-4096 on a constrained device) are caught and surfaced through the same `ToolError` path.
- No network calls exist to fail.

## Testing

`src/lib/tools/bcrypt-pbkdf.test.ts`:
- Verify `bcryptPbkdf` output against published OpenBSD/OpenSSH reference test vectors (fixed password/salt/rounds → known output bytes).

`src/lib/tools/ssh-keygen.test.ts`:
- Round-trip: parse the tool's own generated `openssh-key-v1` output (a minimal internal parser mirroring the encoder) and confirm the recovered public key matches the one returned alongside it, for both Ed25519 and each RSA key size.
- Passphrase round-trip: decrypt the tool's own encrypted private section using the derived key/IV and confirm the two `checkint` values match and decrypted padding is well-formed, proving the passphrase path is self-consistent.
- Public key line format: `ssh-<type> <base64> <comment>` shape, and that an empty comment omits the trailing space.
- Fingerprint format: `SHA256:` prefix with no `=` padding; MD5 as 16 colon-separated lowercase hex pairs.
- Cross-check a handful of generated keys' encoded structure byte-for-byte against real `ssh-keygen`-produced reference fixtures (checked into the test file as constants, generated once locally with the actual `ssh-keygen` binary and a fixed passphrase/comment for reproducibility).

No component tests, per project convention.

## i18n

New `ssh-keygen` namespace in `tools.json` for all 9 locales: `title`, `description`, `algorithm`, `rsaKeySize`, `comment`, `commentPlaceholder`, `passphrase`, `passphrasePlaceholder`, `passphraseHint` (explains empty = unencrypted), `generate`, `generating`, `publicKey`, `privateKey`, `downloadPrivateKey`, `downloadPublicKey`, `fingerprintSha256`, `fingerprintMd5`, `regenerate`, `disclaimer`, `ed25519Unavailable` (fallback notice).

## Validation

- `pnpm test:run` (new `bcrypt-pbkdf.test.ts` + `ssh-keygen.test.ts`, all existing tests unchanged)
- `pnpm build` (type-check, bundle, prerender — confirms the worker bundles correctly)
- `pnpm lint`
- Manually verify: both algorithms, all three RSA sizes, with/without passphrase, with/without comment, copy buttons, both downloads, light/dark mode, narrow mobile viewport
- Cross-check at least one generated key end-to-end against real OpenSSH tooling: `ssh-keygen -y -f <downloaded private key>` should reproduce the tool's displayed public key; for a passphrase-protected key, OpenSSH must accept the passphrase and decrypt successfully
- Confirm all 9 locales contain the new `ssh-keygen` keys
