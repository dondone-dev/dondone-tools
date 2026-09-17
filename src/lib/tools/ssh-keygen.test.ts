import { describe, it, expect } from 'vitest'
import { bcryptPbkdf } from './bcrypt-pbkdf'
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
  buildEd25519PrivateSection,
  padPrivateSection,
  assembleOpenSshPrivateKeyPem,
  encryptPrivateSection,
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

/** Test-only parser mirroring the encoder — NOT shipped in the product
 * bundle. Parses just enough of `openssh-key-v1` to verify round-trip
 * correctness of keys this tool built. */
function parseOpenSshPrivateKey(pem: string) {
  const b64 = pem
    .split('\n')
    .filter((l) => l && !l.startsWith('-----'))
    .join('')
  const buf = new Uint8Array(Buffer.from(b64, 'base64'))
  const magic = new TextDecoder().decode(buf.subarray(0, 15))
  expect(magic).toBe('openssh-key-v1\u0000')
  let off = 15
  function readU32(): number {
    const v = new DataView(buf.buffer, buf.byteOffset + off, 4).getUint32(0, false)
    off += 4
    return v
  }
  function readStr(): Uint8Array {
    const len = readU32()
    const s = buf.subarray(off, off + len)
    off += len
    return s
  }
  const cipherName = new TextDecoder().decode(readStr())
  const kdfName = new TextDecoder().decode(readStr())
  const kdfOptions = readStr()
  const numKeys = readU32()
  const pubBlob = readStr()
  const privSectionRaw = readStr()
  return { cipherName, kdfName, kdfOptions, numKeys, pubBlob, privSectionRaw }
}

/** Parses a decrypted (plaintext) private section: two checkints, key type,
 * public key, private key material, comment, and padding. */
function parsePrivateSection(bytes: Uint8Array) {
  let p = 0
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const checkint1 = view.getUint32(p, false)
  p += 4
  const checkint2 = view.getUint32(p, false)
  p += 4
  function readStr(): Uint8Array {
    const len = new DataView(bytes.buffer, bytes.byteOffset + p, 4).getUint32(0, false)
    p += 4
    const s = bytes.subarray(p, p + len)
    p += len
    return s
  }
  const keyType = new TextDecoder().decode(readStr())
  const pub = readStr()
  const priv = readStr()
  const comment = new TextDecoder().decode(readStr())
  const padding = bytes.subarray(p)
  return { checkint1, checkint2, keyType, pub, priv, comment, padding }
}

describe('Ed25519 unencrypted PEM assembly', () => {
  it('round-trips: the tool can parse its own output back to matching fields', async () => {
    const { seed, pub } = await generateEd25519KeyMaterial()
    const comment = 'roundtrip@example.com'
    const pubBlob = buildEd25519PublicKeyBlob(pub)
    let priv = buildEd25519PrivateSection(seed, pub, comment)
    priv = padPrivateSection(priv, 8) // "none" cipher block size
    const pem = assembleOpenSshPrivateKeyPem({
      cipherName: 'none',
      kdfName: 'none',
      kdfOptions: new Uint8Array(0),
      pubBlob,
      privSection: priv,
    })

    expect(pem.startsWith('-----BEGIN OPENSSH PRIVATE KEY-----\n')).toBe(true)
    expect(pem.endsWith('-----END OPENSSH PRIVATE KEY-----\n')).toBe(true)

    const parsed = parseOpenSshPrivateKey(pem)
    expect(parsed.cipherName).toBe('none')
    expect(parsed.kdfName).toBe('none')
    expect(parsed.kdfOptions.length).toBe(0)
    expect(parsed.numKeys).toBe(1)
    expect(Array.from(parsed.pubBlob)).toEqual(Array.from(pubBlob))

    const section = parsePrivateSection(parsed.privSectionRaw)
    expect(section.checkint1).toBe(section.checkint2)
    expect(section.keyType).toBe('ssh-ed25519')
    expect(Array.from(section.pub)).toEqual(Array.from(pub))
    expect(section.priv.length).toBe(64) // 32-byte seed + 32-byte pub
    expect(Array.from(section.priv.subarray(0, 32))).toEqual(Array.from(seed))
    expect(Array.from(section.priv.subarray(32))).toEqual(Array.from(pub))
    expect(section.comment).toBe(comment)
    expect(Array.from(section.padding)).toEqual(
      Array.from({ length: section.padding.length }, (_, i) => i + 1),
    )
  })

  it('padPrivateSection pads to the exact block size with 1,2,3,... bytes', () => {
    const section = new Uint8Array(13) // arbitrary length not a multiple of 16
    const padded = padPrivateSection(section, 16)
    expect(padded.length % 16).toBe(0)
    const added = padded.length - 13
    expect(Array.from(padded.subarray(13))).toEqual(Array.from({ length: added }, (_, i) => i + 1))
  })

  it('padPrivateSection adds no padding when already block-aligned', () => {
    const section = new Uint8Array(16)
    const padded = padPrivateSection(section, 8)
    expect(padded.length).toBe(16)
  })
})

describe('encryptPrivateSection', () => {
  it('derives key+IV that decrypts a real ssh-keygen-encrypted fixture correctly', async () => {
    // A real `ssh-keygen -t ed25519 -N hunter2` output, embedded verbatim.
    const REAL_ENCRYPTED_PEM = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHIAAAAGYmNyeXB0AAAAGAAAABB8fgTRJX
Md+chqvKmvhthDAAAAGAAAAAEAAAAzAAAAC3NzaC1lZDI1NTE5AAAAIBG1s5dRSMeajhkO
LQthgOwbP7FN801XuTDnW0uVtAVQAAAAoD1dS00DmSCkF/NBg0mhorkV40FdpyW8vXqVQ0
uMDv+ZVEfssPBYTKghF1+4uE2+foiNpnN53vJbxZ8IRwEnOXncCaAsXsxDWHSA19YuoYlH
G/HR5okCD5HbXzLC6fQ3HZQbJS8Q1BRiF0u/LdrRysPeZ1Y4Ic7qIsYtPetAiB8yPW5sRm
WV+UDjbthu6jHDwwX2wWHhijUHYLTY0ZdSgRI=
-----END OPENSSH PRIVATE KEY-----
`
    const REAL_PUB_LINE = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBG1s5dRSMeajhkOLQthgOwbP7FN801XuTDnW0uVtAVQ test@example.com'

    const b64 = REAL_ENCRYPTED_PEM.split('\n')
      .filter((l) => l && !l.startsWith('-----'))
      .join('')
    const buf = new Uint8Array(Buffer.from(b64, 'base64'))
    let off = 15
    function readU32(): number {
      const v = new DataView(buf.buffer, buf.byteOffset + off, 4).getUint32(0, false)
      off += 4
      return v
    }
    function readStr(): Uint8Array {
      const len = readU32()
      const s = buf.subarray(off, off + len)
      off += len
      return s
    }
    readStr() // cipher
    readStr() // kdf
    const kdfOptions = readStr()
    readU32() // numkeys
    readStr() // pubBlob (unused here — checked via REAL_PUB_LINE below)
    const encrypted = readStr()

    let kp = 0
    function readKdfStr(): Uint8Array {
      const len = new DataView(kdfOptions.buffer, kdfOptions.byteOffset + kp, 4).getUint32(0, false)
      kp += 4
      const s = kdfOptions.subarray(kp, kp + len)
      kp += len
      return s
    }
    const salt = readKdfStr()
    const rounds = new DataView(kdfOptions.buffer, kdfOptions.byteOffset + kp, 4).getUint32(0, false)
    const derived = await bcryptPbkdf(new TextEncoder().encode('hunter2'), salt, rounds, 48)
    const aesKey = await crypto.subtle.importKey('raw', derived.slice(0, 32), { name: 'AES-CTR' }, false, ['decrypt'])
    const decrypted = new Uint8Array(
      await crypto.subtle.decrypt({ name: 'AES-CTR', counter: derived.slice(32, 48), length: 128 }, aesKey, encrypted as BufferSource),
    )

    const view = new DataView(decrypted.buffer, decrypted.byteOffset, decrypted.byteLength)
    const checkint1 = view.getUint32(0, false)
    const checkint2 = view.getUint32(4, false)
    expect(checkint1).toBe(checkint2)

    let p = 8
    function readSectionStr(): Uint8Array {
      const len = new DataView(decrypted.buffer, decrypted.byteOffset + p, 4).getUint32(0, false)
      p += 4
      const s = decrypted.subarray(p, p + len)
      p += len
      return s
    }
    expect(new TextDecoder().decode(readSectionStr())).toBe('ssh-ed25519')
    const recoveredPub = readSectionStr()
    const recoveredPubBlob = buildEd25519PublicKeyBlob(recoveredPub)
    expect(formatPublicKeyLine(recoveredPubBlob, 'test@example.com')).toBe(REAL_PUB_LINE)
  })

  it('own-encrypt round-trips: WebCrypto AES-CTR decrypts what encryptPrivateSection produced', async () => {
    const { seed, pub } = await generateEd25519KeyMaterial()
    const comment = 'enc-roundtrip@example.com'
    let priv = buildEd25519PrivateSection(seed, pub, comment)
    priv = padPrivateSection(priv, 16) // aes256-ctr block size

    const { ciphertext, kdfOptions } = await encryptPrivateSection(priv, 'correct-horse-battery')
    expect(ciphertext.length).toBe(priv.length)

    let kp = 0
    function readKdfStr(): Uint8Array {
      const len = new DataView(kdfOptions.buffer, kdfOptions.byteOffset + kp, 4).getUint32(0, false)
      kp += 4
      const s = kdfOptions.subarray(kp, kp + len)
      kp += len
      return s
    }
    const salt = readKdfStr()
    expect(salt.length).toBe(16)
    const rounds = new DataView(kdfOptions.buffer, kdfOptions.byteOffset + kp, 4).getUint32(0, false)
    expect(rounds).toBe(16)

    const derived = await bcryptPbkdf(new TextEncoder().encode('correct-horse-battery'), salt, rounds, 48)
    const aesKey = await crypto.subtle.importKey('raw', derived.slice(0, 32), { name: 'AES-CTR' }, false, ['decrypt'])
    const decrypted = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: 'AES-CTR', counter: derived.slice(32, 48), length: 128 },
        aesKey,
        ciphertext as BufferSource,
      ),
    )
    expect(Array.from(decrypted)).toEqual(Array.from(priv))
  })
})
