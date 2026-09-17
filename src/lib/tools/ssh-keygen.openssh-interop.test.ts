import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, chmodSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { generateSshKeyPair, type SshAlgorithm } from './ssh-keygen'

const sshKeygenAvailable = spawnSync('ssh-keygen', ['-V'], { stdio: 'ignore' }).error === undefined

describe.skipIf(!sshKeygenAvailable)('OpenSSH interoperability', () => {
  let tempDir: string
  let keyNumber = 0

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'dondone-ssh-keygen-'))
  })

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  async function expectOpenSshPublicKey(
    algorithm: SshAlgorithm,
    passphrase: string,
  ): Promise<void> {
    const result = await generateSshKeyPair({
      algorithm,
      rsaKeySize: algorithm === 'rsa' ? 2048 : undefined,
      comment: `${algorithm}-interop@example.com`,
      passphrase,
    })
    const keyPath = join(tempDir, `key-${keyNumber++}`)
    writeFileSync(keyPath, result.privateKeyPem)
    chmodSync(keyPath, 0o600)

    const args = ['-y', '-f', keyPath]
    if (passphrase) args.push('-P', passphrase)
    const publicKey = execFileSync('ssh-keygen', args, { encoding: 'utf8' }).trim()

    expect(publicKey).toBe(result.publicKeyLine)
  }

  it.each([
    ['ed25519', ''] as const,
    ['ed25519', 'interop-secret'] as const,
    ['rsa', ''] as const,
    ['rsa', 'interop-secret'] as const,
  ])('reads a generated %s key with passphrase %s', async (algorithm, passphrase) => {
    await expectOpenSshPublicKey(algorithm, passphrase)
  })

  it('rejects a wrong passphrase for an encrypted key', async () => {
    const result = await generateSshKeyPair({
      algorithm: 'ed25519',
      comment: 'wrong-passphrase@example.com',
      passphrase: 'correct-passphrase',
    })
    const keyPath = join(tempDir, `key-${keyNumber++}`)
    writeFileSync(keyPath, result.privateKeyPem)
    chmodSync(keyPath, 0o600)

    expect(() =>
      execFileSync('ssh-keygen', ['-y', '-f', keyPath, '-P', 'wrong-passphrase'], {
        stdio: 'pipe',
      }),
    ).toThrow()
  })
})
