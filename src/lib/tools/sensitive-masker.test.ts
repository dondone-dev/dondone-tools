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

  describe('sensitive query params in url field context', () => {
    it('masks access_token in a DingTalk webhook query string', () => {
      const input = 'webhook_url=https://oapi.dingtalk.com/robot/send?access_token=abc123secret456xyz'
      const result = maskText(input, 'dev')
      expect(result.output).not.toContain('abc123secret456xyz')
      expect(result.output).toContain('access_token=')
    })

    it('masks api_key and secret query params in a generic url field', () => {
      const input = 'endpoint=https://api.example.com/v1/send?api_key=AKIA1234567890SECRET&secret=deadbeefcafe1234'
      const result = maskText(input, 'dev')
      expect(result.output).not.toContain('AKIA1234567890SECRET')
      expect(result.output).not.toContain('deadbeefcafe1234')
    })

    it('leaves non-sensitive query params intact', () => {
      const input = 'api_url=https://api.example.com/v1/users?page=2&limit=50'
      const result = maskText(input, 'dev')
      expect(result.output).toContain('page=2')
      expect(result.output).toContain('limit=50')
    })
  })
})
