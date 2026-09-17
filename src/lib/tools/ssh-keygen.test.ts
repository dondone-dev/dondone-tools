import { describe, it, expect } from 'vitest'
import {
  u32be,
  sshString,
  mpint,
  concatBytes,
  base64urlToBytes,
  generateEd25519KeyMaterial,
  buildEd25519PublicKeyBlob,
  formatPublicKeyLine,
  fingerprintSha256,
  fingerprintMd5,
} from './ssh-keygen'

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

describe('wire-format primitives', () => {
  it('u32be encodes a 4-byte big-endian length', () => {
    expect(bytesToHex(u32be(11))).toBe('0000000b')
    expect(bytesToHex(u32be(256))).toBe('00000100')
  })

  it('sshString prefixes a 4-byte big-endian length', () => {
    const bytes = new TextEncoder().encode('ssh-ed25519')
    const encoded = sshString(bytes)
    expect(encoded.length).toBe(4 + 11)
    expect(bytesToHex(encoded.subarray(0, 4))).toBe('0000000b')
  })

  it('mpint leaves a positive-high-bit-clear number unchanged', () => {
    const bytes = Uint8Array.from([0x01, 0x00, 0x01]) // e = 65537, high bit clear
    expect(bytesToHex(mpint(bytes))).toBe('00000003010001')
  })

  it('mpint prepends 0x00 when the high bit is set', () => {
    const bytes = Uint8Array.from([0xff, 0x01]) // high bit set
    expect(bytesToHex(mpint(bytes))).toBe('00000003' + '00ff01')
  })

  it('mpint strips leading zero bytes before re-checking the high bit', () => {
    const bytes = Uint8Array.from([0x00, 0x00, 0x01]) // one significant byte, high bit clear
    expect(bytesToHex(mpint(bytes))).toBe('0000000101')
  })

  it('concatBytes joins arrays in order', () => {
    expect(bytesToHex(concatBytes(Uint8Array.from([1, 2]), Uint8Array.from([3])))).toBe('010203')
  })

  it('base64urlToBytes decodes without padding', () => {
    expect(bytesToHex(base64urlToBytes('AQAB'))).toBe('010001')
  })
})

describe('generateEd25519KeyMaterial', () => {
  it('produces a 32-byte seed and 32-byte public key', async () => {
    const { seed, pub } = await generateEd25519KeyMaterial()
    expect(seed.length).toBe(32)
    expect(pub.length).toBe(32)
  })

  it('produces different key material on each call', async () => {
    const a = await generateEd25519KeyMaterial()
    const b = await generateEd25519KeyMaterial()
    expect(bytesToHex(a.seed)).not.toBe(bytesToHex(b.seed))
  })
})

describe('public key line + fingerprints — verified against real `ssh-keygen` output', () => {
  // From a real `ssh-keygen -t ed25519` key pair.
  const pub = base64urlToBytesFromB64Std('qKrPj5tY+4KMIAqJwAUIjf73XhiqIDhv4bi6hbhA+P4=')
  function base64urlToBytesFromB64Std(std: string): Uint8Array {
    return new Uint8Array(Buffer.from(std, 'base64'))
  }
  const pubBlob = buildEd25519PublicKeyBlob(pub)

  it('formatPublicKeyLine matches the real `ssh-keygen` public key line', () => {
    const line = formatPublicKeyLine(pubBlob, 'my-test@example.com')
    expect(line).toBe(
      'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKiqz4+bWPuCjCAKicAFCI3+914YqiA4b+G4uoW4QPj+ my-test@example.com',
    )
  })

  it('formatPublicKeyLine omits the trailing space for an empty comment', () => {
    const line = formatPublicKeyLine(pubBlob, '')
    expect(line.endsWith(' ')).toBe(false)
    expect(line).toBe('ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKiqz4+bWPuCjCAKicAFCI3+914YqiA4b+G4uoW4QPj+')
  })

  it('fingerprintSha256 matches `ssh-keygen -l -E sha256`', async () => {
    expect(await fingerprintSha256(pubBlob)).toBe('SHA256:KVxTgTCX01v+EZrHEgik2VuPnlfTNeNnan5Up6W49Os')
  })

  it('fingerprintMd5 matches `ssh-keygen -l -E md5`', () => {
    expect(fingerprintMd5(pubBlob)).toBe('cb:3e:7c:70:3f:02:0e:c3:25:e6:c8:f3:9d:0c:d8:1d')
  })
})
