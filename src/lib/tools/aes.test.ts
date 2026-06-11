import { test, expect } from 'vitest'
import { aesEncrypt, aesDecrypt, getDefaultAesOptions, aesTool } from './aes'

test('getDefaultAesOptions returns expected defaults', () => {
  expect(getDefaultAesOptions()).toEqual({
    mode: 'ecb',
    padding: 'pkcs7',
    inputEncoding: 'utf8',
    outputEncoding: 'base64',
    keyEncoding: 'utf8',
    ivEncoding: 'hex',
    keySizeBits: 128,
    key: '',
    iv: '',
    input: '',
  })
})

test('requiresIv returns false for ecb and true for cbc/ctr', () => {
  expect(aesTool.requiresIv('ecb')).toBe(false)
  expect(aesTool.requiresIv('cbc')).toBe(true)
  expect(aesTool.requiresIv('ctr')).toBe(true)
})

test('encrypts and decrypts AES-CBC with PKCS7 padding', () => {
  const plaintext = 'Pelican Tools CBC'
  const encrypted = aesEncrypt({
    input: plaintext, inputEncoding: 'utf8', outputEncoding: 'base64',
    key: '00112233445566778899aabbccddeeff', keyEncoding: 'hex',
    iv: '0102030405060708090a0b0c0d0e0f10', ivEncoding: 'hex',
    mode: 'cbc', padding: 'pkcs7', keySizeBits: 128,
  })
  const decrypted = aesDecrypt({
    input: encrypted, inputEncoding: 'base64', outputEncoding: 'utf8',
    key: '00112233445566778899aabbccddeeff', keyEncoding: 'hex',
    iv: '0102030405060708090a0b0c0d0e0f10', ivEncoding: 'hex',
    mode: 'cbc', padding: 'pkcs7', keySizeBits: 128,
  })
  expect(decrypted).toBe(plaintext)
})

test('encrypts and decrypts AES-CBC with zero padding and 192-bit key', () => {
  const plaintext = '1234567890ABCDEF'
  const encrypted = aesEncrypt({
    input: plaintext, inputEncoding: 'utf8', outputEncoding: 'hex',
    key: '1234567890abcdefghijklmn', keyEncoding: 'utf8',
    iv: '1234567890abcdef', ivEncoding: 'utf8',
    mode: 'cbc', padding: 'zero', keySizeBits: 192,
  })
  const decrypted = aesDecrypt({
    input: encrypted, inputEncoding: 'hex', outputEncoding: 'utf8',
    key: '1234567890abcdefghijklmn', keyEncoding: 'utf8',
    iv: '1234567890abcdef', ivEncoding: 'utf8',
    mode: 'cbc', padding: 'zero', keySizeBits: 192,
  })
  expect(decrypted).toBe(plaintext)
})

test('encrypts and decrypts AES-ECB with PKCS7 padding', () => {
  const plaintext = 'ECB mode still works'
  const encrypted = aesEncrypt({
    input: plaintext, inputEncoding: 'utf8', outputEncoding: 'hex',
    key: '1234567890abcdef1234567890abcdef', keyEncoding: 'utf8',
    iv: '', ivEncoding: 'hex',
    mode: 'ecb', padding: 'pkcs7', keySizeBits: 128,
  })
  const decrypted = aesDecrypt({
    input: encrypted, inputEncoding: 'hex', outputEncoding: 'utf8',
    key: '1234567890abcdef1234567890abcdef', keyEncoding: 'utf8',
    iv: '', ivEncoding: 'hex',
    mode: 'ecb', padding: 'pkcs7', keySizeBits: 128,
  })
  expect(decrypted).toBe(plaintext)
})

test('auto-detects hex ciphertext when decrypting with utf8 input encoding', () => {
  const plaintext = '{"name":"aes","ok":true}'
  const encrypted = aesEncrypt({
    input: plaintext, inputEncoding: 'utf8', outputEncoding: 'hex',
    key: '1234567890abcdef', keyEncoding: 'utf8',
    iv: '', ivEncoding: 'hex',
    mode: 'ecb', padding: 'pkcs7', keySizeBits: 128,
  })
  const decrypted = aesDecrypt({
    input: encrypted, inputEncoding: 'utf8', outputEncoding: 'utf8',
    key: '1234567890abcdef', keyEncoding: 'utf8',
    iv: '', ivEncoding: 'hex',
    mode: 'ecb', padding: 'pkcs7', keySizeBits: 128,
  })
  expect(decrypted).toBe(plaintext)
})

test('auto-detects base64 ciphertext when decrypting with utf8 input encoding', () => {
  const plaintext = '{"name":"aes","ok":true}'
  const encrypted = aesEncrypt({
    input: plaintext, inputEncoding: 'utf8', outputEncoding: 'base64',
    key: '1234567890abcdef', keyEncoding: 'utf8',
    iv: '', ivEncoding: 'hex',
    mode: 'ecb', padding: 'pkcs7', keySizeBits: 128,
  })
  const decrypted = aesDecrypt({
    input: encrypted, inputEncoding: 'utf8', outputEncoding: 'utf8',
    key: '1234567890abcdef', keyEncoding: 'utf8',
    iv: '', ivEncoding: 'hex',
    mode: 'ecb', padding: 'pkcs7', keySizeBits: 128,
  })
  expect(decrypted).toBe(plaintext)
})

test('encrypts and decrypts AES-ECB with no padding on a full block', () => {
  const plaintext = '1234567890ABCDEF'
  const encrypted = aesEncrypt({
    input: plaintext, inputEncoding: 'utf8', outputEncoding: 'base64',
    key: '1234567890abcdef', keyEncoding: 'utf8',
    iv: '', ivEncoding: 'hex',
    mode: 'ecb', padding: 'none', keySizeBits: 128,
  })
  const decrypted = aesDecrypt({
    input: encrypted, inputEncoding: 'base64', outputEncoding: 'utf8',
    key: '1234567890abcdef', keyEncoding: 'utf8',
    iv: '', ivEncoding: 'hex',
    mode: 'ecb', padding: 'none', keySizeBits: 128,
  })
  expect(decrypted).toBe(plaintext)
})

test('encrypts and decrypts AES-CTR without block padding', () => {
  const plaintext = 'CTR mode can stream uneven length'
  const encrypted = aesEncrypt({
    input: plaintext, inputEncoding: 'utf8', outputEncoding: 'base64',
    key: '1234567890abcdef1234567890abcdef', keyEncoding: 'utf8',
    iv: 'abcdef1234567890abcdef1234567890', ivEncoding: 'hex',
    mode: 'ctr', padding: 'none', keySizeBits: 128,
  })
  const decrypted = aesDecrypt({
    input: encrypted, inputEncoding: 'base64', outputEncoding: 'utf8',
    key: '1234567890abcdef1234567890abcdef', keyEncoding: 'utf8',
    iv: 'abcdef1234567890abcdef1234567890', ivEncoding: 'hex',
    mode: 'ctr', padding: 'none', keySizeBits: 128,
  })
  expect(decrypted).toBe(plaintext)
})

test('encrypts and decrypts AES-CTR with base64 IV and 256-bit key', () => {
  const plaintext = 'CTR can use base64 IV too'
  const encrypted = aesEncrypt({
    input: plaintext, inputEncoding: 'utf8', outputEncoding: 'hex',
    key: '1234567890abcdefghijklmnopqrstuv', keyEncoding: 'utf8',
    iv: 'AAECAwQFBgcICQoLDA0ODw==', ivEncoding: 'base64',
    mode: 'ctr', padding: 'pkcs7', keySizeBits: 256,
  })
  const decrypted = aesDecrypt({
    input: encrypted, inputEncoding: 'hex', outputEncoding: 'utf8',
    key: '1234567890abcdefghijklmnopqrstuv', keyEncoding: 'utf8',
    iv: 'AAECAwQFBgcICQoLDA0ODw==', ivEncoding: 'base64',
    mode: 'ctr', padding: 'pkcs7', keySizeBits: 256,
  })
  expect(decrypted).toBe(plaintext)
})

test('throws when CBC has no IV', () => {
  expect(() => aesEncrypt({
    input: 'needs iv', inputEncoding: 'utf8', outputEncoding: 'base64',
    key: '00112233445566778899aabbccddeeff', keyEncoding: 'hex',
    iv: '', ivEncoding: 'hex',
    mode: 'cbc', padding: 'pkcs7', keySizeBits: 128,
  })).toThrow(/IV/)
})

test('throws when padding none and input not 16-byte aligned', () => {
  expect(() => aesEncrypt({
    input: 'short text', inputEncoding: 'utf8', outputEncoding: 'hex',
    key: '00112233445566778899aabbccddeeff', keyEncoding: 'hex',
    iv: '', ivEncoding: 'hex',
    mode: 'ecb', padding: 'none', keySizeBits: 128,
  })).toThrow(/16-byte blocks/)
})

test('throws when CTR IV is wrong size', () => {
  expect(() => aesEncrypt({
    input: 'hello', inputEncoding: 'utf8', outputEncoding: 'base64',
    key: '1234567890abcdef', keyEncoding: 'utf8',
    iv: 'short-iv', ivEncoding: 'utf8',
    mode: 'ctr', padding: 'none', keySizeBits: 128,
  })).toThrow(/IV must be exactly 16 bytes/)
})

test('throws on invalid AES key length', () => {
  expect(() => aesEncrypt({
    input: 'hello', inputEncoding: 'utf8', outputEncoding: 'base64',
    key: 'deadbeef', keyEncoding: 'hex',
    iv: '0102030405060708090a0b0c0d0e0f10', ivEncoding: 'hex',
    mode: 'cbc', padding: 'pkcs7', keySizeBits: 128,
  })).toThrow(/AES key length/)
})

test('throws on invalid hex key input', () => {
  expect(() => aesEncrypt({
    input: 'hello', inputEncoding: 'utf8', outputEncoding: 'base64',
    key: 'zz', keyEncoding: 'hex',
    iv: '0102030405060708090a0b0c0d0e0f10', ivEncoding: 'hex',
    mode: 'cbc', padding: 'pkcs7', keySizeBits: 128,
  })).toThrow(/hex/i)
})

test('throws on invalid base64 key input', () => {
  expect(() => aesEncrypt({
    input: 'hello', inputEncoding: 'utf8', outputEncoding: 'base64',
    key: '%%%', keyEncoding: 'base64',
    iv: '0102030405060708090a0b0c0d0e0f10', ivEncoding: 'hex',
    mode: 'cbc', padding: 'pkcs7', keySizeBits: 128,
  })).toThrow(/base64/i)
})

test('throws on unsupported AES mode', () => {
  expect(() => aesEncrypt({
    input: 'hello', inputEncoding: 'utf8', outputEncoding: 'base64',
    key: '1234567890abcdef', keyEncoding: 'utf8',
    iv: '1234567890abcdef', ivEncoding: 'utf8',
    mode: 'gcm' as unknown as 'cbc', padding: 'pkcs7', keySizeBits: 128,
  })).toThrow(/Unsupported AES mode/)
})

test('throws on unsupported padding', () => {
  expect(() => aesEncrypt({
    input: 'hello', inputEncoding: 'utf8', outputEncoding: 'base64',
    key: '1234567890abcdef', keyEncoding: 'utf8',
    iv: '', ivEncoding: 'hex',
    mode: 'ecb', padding: 'iso10126' as unknown as 'pkcs7', keySizeBits: 128,
  })).toThrow(/Unsupported padding/)
})

test('throws on unsupported encoding', () => {
  expect(() => aesEncrypt({
    input: 'hello', inputEncoding: 'utf8', outputEncoding: 'base64',
    key: '1234567890abcdef', keyEncoding: 'gbk' as unknown as 'utf8',
    iv: '', ivEncoding: 'hex',
    mode: 'ecb', padding: 'pkcs7', keySizeBits: 128,
  })).toThrow(/Unsupported encoding/)
})
