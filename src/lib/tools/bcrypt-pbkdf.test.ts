import { describe, it, expect } from 'vitest'
import { bcryptPbkdf } from './bcrypt-pbkdf'

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) out[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16)
  return out
}
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

describe('bcryptPbkdf', () => {
  it('matches the key/IV a real `ssh-keygen -o` derived for a known salt/passphrase/rounds', async () => {
    // From a real OpenSSH-generated `openssh-key-v1` file's kdfoptions.
    const salt = hexToBytes('7c7e04d125731df9c86abca9af86d843')
    const rounds = 24
    const passphrase = new TextEncoder().encode('hunter2')

    const derived = await bcryptPbkdf(passphrase, salt, rounds, 48)

    expect(bytesToHex(derived)).toBe(
      '630afa0aabcbcf1fd125475b8d03f49b191d50cbd2b036f921185a4735a142211929bacbd83ff718ea8bb76a8f010eac',
    )
  })

  it('rejects an empty password, salt, or keyLen', async () => {
    const salt = hexToBytes('00112233445566778899aabbccddeeff')
    await expect(bcryptPbkdf(new Uint8Array(0), salt, 16, 48)).rejects.toThrow()
    await expect(bcryptPbkdf(new TextEncoder().encode('x'), new Uint8Array(0), 16, 48)).rejects.toThrow()
    await expect(bcryptPbkdf(new TextEncoder().encode('x'), salt, 16, 0)).rejects.toThrow()
  })

  it('rejects rounds < 1', async () => {
    const salt = hexToBytes('00112233445566778899aabbccddeeff')
    await expect(bcryptPbkdf(new TextEncoder().encode('x'), salt, 0, 48)).rejects.toThrow()
  })
})
