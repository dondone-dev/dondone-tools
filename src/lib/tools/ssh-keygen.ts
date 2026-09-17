// SSH key pair generation entirely in the browser: Ed25519 via Web Crypto's
// native Ed25519 support, RSA (added in Task 5) via Web Crypto's
// RSASSA-PKCS1-v1_5 keygen (used only as a vehicle for key material — SSH
// does not use PKCS1 signatures). The OpenSSH `openssh-key-v1` private-key
// wire format and the single-line public-key format are hand-encoded per
// OpenSSH's PROTOCOL.key spec.
//
// Every encoder here is verified against real `ssh-keygen`-produced keys —
// see ssh-keygen.test.ts: a key built here is parsed successfully by the
// real `ssh-keygen -y` binary, and a key built by the real binary is
// decrypted successfully by the code here (Task 6).

import CryptoJS from 'crypto-js'
import { bcryptPbkdf } from './bcrypt-pbkdf'

// ---- byte helpers ----

export function u32be(n: number): Uint8Array {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, n, false)
  return b
}

export function sshString(bytes: Uint8Array): Uint8Array {
  return concatBytes(u32be(bytes.length), bytes)
}

/** SSH `mpint` encoding: a `string` that additionally prepends 0x00 when the
 * high bit of the first significant byte is set, so the value is never
 * misread as negative. */
export function mpint(bytes: Uint8Array): Uint8Array {
  let i = 0
  while (i < bytes.length - 1 && bytes[i] === 0) i++
  const trimmed = bytes.subarray(i)
  if (trimmed.length > 0 && (trimmed[0] & 0x80) !== 0) {
    const withZero = new Uint8Array(trimmed.length + 1)
    withZero.set(trimmed, 1)
    return sshString(withZero)
  }
  return sshString(trimmed)
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

export function base64urlToBytes(s: string): Uint8Array {
  const std = s.replace(/-/g, '+').replace(/_/g, '/')
  const padded = std + '='.repeat((4 - (std.length % 4)) % 4)
  const binary = atob(padded)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

// Matches the bytesToWordArray helper already duplicated in aes.ts/sha2.ts —
// this file follows the same self-contained-per-tool-module convention.
function bytesToWordArray(bytes: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = []
  for (let i = 0; i < bytes.length; i++) {
    words[i >>> 2] |= bytes[i] << (24 - (i % 4) * 8)
  }
  return CryptoJS.lib.WordArray.create(words as unknown as number[], bytes.length)
}

// ---- Ed25519 ----

const ED25519_KEY_TYPE = new TextEncoder().encode('ssh-ed25519')

/** Generates a fresh Ed25519 key pair via Web Crypto. The 32-byte seed is
 * the last 32 bytes of the 48-byte PKCS8 export — Ed25519 PKCS8 has a fixed,
 * well-known structure (a 16-byte ASN.1 header then the raw seed), so no
 * general ASN.1 parser is needed. */
export async function generateEd25519KeyMaterial(): Promise<{ seed: Uint8Array; pub: Uint8Array }> {
  const keyPair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keyPair.privateKey))
  const seed = pkcs8.slice(16, 48)
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey))
  return { seed, pub }
}

export function buildEd25519PublicKeyBlob(pub: Uint8Array): Uint8Array {
  return concatBytes(sshString(ED25519_KEY_TYPE), sshString(pub))
}

// ---- public key line ----

export function formatPublicKeyLine(pubBlob: Uint8Array, comment: string): string {
  const base = `${keyTypeFromBlob(pubBlob)} ${bytesToBase64(pubBlob)}`
  return comment ? `${base} ${comment}` : base
}

function keyTypeFromBlob(pubBlob: Uint8Array): string {
  const len = new DataView(pubBlob.buffer, pubBlob.byteOffset, 4).getUint32(0, false)
  return new TextDecoder().decode(pubBlob.subarray(4, 4 + len))
}

// ---- fingerprints ----

export async function fingerprintSha256(pubBlob: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', pubBlob as BufferSource))
  const b64 = bytesToBase64(digest).replace(/=+$/, '')
  return `SHA256:${b64}`
}

export function fingerprintMd5(pubBlob: Uint8Array): string {
  const hex = CryptoJS.MD5(bytesToWordArray(pubBlob)).toString()
  return hex.match(/.{2}/g)!.join(':')
}

// ---- unencrypted private-key section (Ed25519) ----

/** Builds the `openssh-key-v1` private section for an Ed25519 key: two
 * random checkints (OpenSSH detects a wrong passphrase by comparing these
 * after decryption — they carry no other security purpose), the key type,
 * public key, the 64-byte "private key" field (32-byte seed + 32-byte
 * public key, per OpenSSH convention), and the comment. Caller pads the
 * result with `padPrivateSection` before encrypting or embedding it. */
export function buildEd25519PrivateSection(seed: Uint8Array, pub: Uint8Array, comment: string): Uint8Array {
  const checkint = crypto.getRandomValues(new Uint8Array(4))
  return concatBytes(
    checkint,
    checkint,
    sshString(ED25519_KEY_TYPE),
    sshString(pub),
    sshString(concatBytes(seed, pub)),
    sshString(new TextEncoder().encode(comment)),
  )
}

/** Pads to the cipher's block size with the sequence 1,2,3,... — the
 * `openssh-key-v1` spec's padding scheme, which also lets a decryptor
 * sanity-check the padding after decrypting. */
export function padPrivateSection(section: Uint8Array, blockSize: number): Uint8Array {
  const padLen = (blockSize - (section.length % blockSize)) % blockSize
  if (padLen === 0) return section
  const padding = new Uint8Array(padLen)
  for (let i = 0; i < padLen; i++) padding[i] = i + 1
  return concatBytes(section, padding)
}

const OPENSSH_MAGIC = new TextEncoder().encode('openssh-key-v1\0')

/** Assembles the full `openssh-key-v1` binary structure and wraps it as a
 * PEM block, base64-encoded in 70-column lines (matching `ssh-keygen`'s
 * own line width). */
export function assembleOpenSshPrivateKeyPem(opts: {
  cipherName: string
  kdfName: string
  kdfOptions: Uint8Array
  pubBlob: Uint8Array
  privSection: Uint8Array
}): string {
  const body = concatBytes(
    OPENSSH_MAGIC,
    sshString(new TextEncoder().encode(opts.cipherName)),
    sshString(new TextEncoder().encode(opts.kdfName)),
    sshString(opts.kdfOptions),
    u32be(1),
    sshString(opts.pubBlob),
    sshString(opts.privSection),
  )
  const b64 = bytesToBase64(body)
  const lines = b64.match(/.{1,70}/g) ?? []
  return `-----BEGIN OPENSSH PRIVATE KEY-----\n${lines.join('\n')}\n-----END OPENSSH PRIVATE KEY-----\n`
}

// ---- passphrase encryption ----

/** Encrypts a padded private section with `aes256-ctr`, deriving the key
 * and IV via `bcrypt_pbkdf` from a random 16-byte salt — the same
 * parameters (`rounds = 16`) `ssh-keygen` itself uses. Returns the
 * ciphertext and the `kdfoptions` blob to embed in the PEM. */
export async function encryptPrivateSection(
  privSection: Uint8Array,
  passphrase: string,
): Promise<{ ciphertext: Uint8Array; kdfOptions: Uint8Array }> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const rounds = 16
  const derived = await bcryptPbkdf(new TextEncoder().encode(passphrase), salt, rounds, 48)
  const aesKey = await crypto.subtle.importKey('raw', derived.slice(0, 32), { name: 'AES-CTR' }, false, ['encrypt'])
  const iv = derived.slice(32, 48)
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-CTR', counter: iv, length: 128 }, aesKey, privSection as BufferSource),
  )
  const kdfOptions = concatBytes(sshString(salt), u32be(rounds))
  return { ciphertext, kdfOptions }
}

// ---- RSA ----

const RSA_KEY_TYPE = new TextEncoder().encode('ssh-rsa')

export interface RsaKeyMaterial {
  n: Uint8Array
  e: Uint8Array
  d: Uint8Array
  p: Uint8Array
  q: Uint8Array
  /** q^-1 mod p — OpenSSH calls this field `iqmp`; Web Crypto's JWK export
   * calls it `qi`. Same value. */
  iqmp: Uint8Array
}

/** Generates an RSA key pair via Web Crypto and extracts the CRT parameters
 * needed for the OpenSSH wire format from its JWK export. `hash` is
 * required by the `RSASSA-PKCS1-v1_5` algorithm identifier but unused —
 * this key is never used to sign or verify with Web Crypto; it's only a
 * vehicle for standards-compliant RSA key generation. */
export async function generateRsaKeyMaterial(modulusLength: 2048 | 3072 | 4096): Promise<RsaKeyMaterial> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )
  const jwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey)
  return {
    n: base64urlToBytes(jwk.n!),
    e: base64urlToBytes(jwk.e!),
    d: base64urlToBytes(jwk.d!),
    p: base64urlToBytes(jwk.p!),
    q: base64urlToBytes(jwk.q!),
    iqmp: base64urlToBytes(jwk.qi!),
  }
}

export function buildRsaPublicKeyBlob(material: Pick<RsaKeyMaterial, 'n' | 'e'>): Uint8Array {
  return concatBytes(sshString(RSA_KEY_TYPE), mpint(material.e), mpint(material.n))
}

/** OpenSSH's RSA private-key field order is n, e, d, iqmp, p, q — note this
 * differs from PKCS8/JWK's own field order. */
export function buildRsaPrivateSection(material: RsaKeyMaterial, comment: string): Uint8Array {
  const checkint = crypto.getRandomValues(new Uint8Array(4))
  return concatBytes(
    checkint,
    checkint,
    sshString(RSA_KEY_TYPE),
    mpint(material.n),
    mpint(material.e),
    mpint(material.d),
    mpint(material.iqmp),
    mpint(material.p),
    mpint(material.q),
    sshString(new TextEncoder().encode(comment)),
  )
}
