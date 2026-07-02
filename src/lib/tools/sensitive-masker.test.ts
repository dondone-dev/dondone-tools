import { describe, it, expect } from 'vitest'
import { maskText } from './sensitive-masker'

describe('sensitive-masker', () => {
  describe('webhook URL in field context', () => {
    it('masks Slack webhook secret path when in a url field', () => {
      const input = 'webhook_url=https://hooks.slack.com/services/T01234ABC/B56789DEF/xYzSecretToken123'
      const result = maskText(input, 'dev')
      expect(result.output).not.toContain('xYzSecretToken123')
      expect(result.output).not.toContain('/services/T01234ABC/B56789DEF/')
    })

    it('masks Discord webhook secret path when in a url field', () => {
      const input = 'callback_url=https://discord.com/api/webhooks/123456789/abcdef-secret-token'
      const result = maskText(input, 'dev')
      expect(result.output).not.toContain('abcdef-secret-token')
    })

    it('still masks regular URLs by hostname only', () => {
      const input = 'api_url=https://internal.company.com/v1/users'
      const result = maskText(input, 'dev')
      expect(result.output).toContain('/v1/users')
      expect(result.output).not.toContain('internal.company')
    })
  })
})
