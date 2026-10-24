import { describe, it, expect } from 'vitest'
import {
  glassSupportedOn,
  translucencySupportedOn,
  parseSlashCommand,
  looksLikeSlashCommand,
  fuzzyScore,
  fuzzyRank,
  jsonRpcErrorFromFrame,
  stripAnsi,
} from '@sirona/shared'

describe('Stage 1: Desktop Shell & Shared Contracts', () => {
  describe('Translucency & OS Support Verification', () => {
    it('detects Windows 11 as glass and translucency supported', () => {
      // Windows 11 builds are 22000+
      expect(glassSupportedOn('win32', '10.0.22631')).toBe(true)
      expect(translucencySupportedOn('win32')).toBe(true)
    })

    it('detects Windows 10 as translucency supported but not glass', () => {
      // Windows 10 builds are 10240 - 19045
      expect(glassSupportedOn('win32', '10.0.19045')).toBe(false)
      expect(translucencySupportedOn('win32')).toBe(true)
    })

    it('detects macOS as glass and translucency supported', () => {
      expect(glassSupportedOn('darwin', '23.4.0')).toBe(true)
      expect(translucencySupportedOn('darwin')).toBe(true)
    })

    it('detects Linux as neither glass nor translucency by default', () => {
      expect(glassSupportedOn('linux', '6.5.0')).toBe(false)
      expect(translucencySupportedOn('linux')).toBe(false)
    })
  })

  describe('Slash Command Parser Verification', () => {
    it('identifies slash commands correctly', () => {
      expect(looksLikeSlashCommand('/clear')).toBe(true)
      expect(looksLikeSlashCommand('/help with my code')).toBe(true)
      expect(looksLikeSlashCommand('hello world')).toBe(false)
      expect(looksLikeSlashCommand('/not-a-command/path')).toBe(false)
    })

    it('parses slash command arguments', () => {
      const parsed = parseSlashCommand('/model claude-3-5-sonnet --temp 0.7')
      expect(parsed).toEqual({
        name: 'model',
        arg: 'claude-3-5-sonnet --temp 0.7',
      })
    })
  })

  describe('Fuzzy Ranking & Utility Verification', () => {
    it('scores matching target and query accurately', () => {
      const match = fuzzyScore('sirona-core', 'sirona')
      expect(match).not.toBeNull()
      expect(match?.score).toBeGreaterThan(0)

      const noMatch = fuzzyScore('readme.md', 'sirona')
      expect(noMatch).toBeNull()
    })

    it('ranks candidate array with fuzzyRank', () => {
      const candidates = [
        { name: 'settings' },
        { name: 'session-view' },
        { name: 'terminal-deck' },
      ]
      const ranked = fuzzyRank(candidates, 'sett', (c) => c.name)
      expect(ranked.length).toBeGreaterThan(0)
      expect(ranked[0].item.name).toBe('settings')
    })

    it('strips ANSI formatting codes cleanly', () => {
      const ansiText = '\u001b[31mError:\u001b[0m Connection failed'
      expect(stripAnsi(ansiText)).toBe('Error: Connection failed')
    })
  })

  describe('JSON-RPC Error Handling', () => {
    it('identifies JSON-RPC error responses accurately from payload', () => {
      const errorPayload = {
        code: -32601,
        message: 'Method not found',
      }

      const err = jsonRpcErrorFromFrame(errorPayload)
      expect(err).toBeDefined()
      expect(err.code).toBe(-32601)
      expect(err.message).toBe('Method not found')
    })

    it('uses fallback message when error message is missing', () => {
      const err = jsonRpcErrorFromFrame({}, 'Custom fallback')
      expect(err.message).toBe('Custom fallback')
    })
  })

  describe('External Link Security Validation', () => {
    function isSafeExternalUrl(url: unknown): boolean {
      if (!url || typeof url !== 'string') return false
      try {
        const parsed = new URL(url)
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      } catch {
        return false
      }
    }

    it('allows valid http and https URLs', () => {
      expect(isSafeExternalUrl('https://github.com')).toBe(true)
      expect(isSafeExternalUrl('http://127.0.0.1:8000')).toBe(true)
    })

    it('strictly denies unsafe schemes', () => {
      expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false)
      expect(isSafeExternalUrl('file:///C:/Windows/System32/cmd.exe')).toBe(false)
      expect(isSafeExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
      expect(isSafeExternalUrl('powershell:Invoke-Expression')).toBe(false)
      expect(isSafeExternalUrl('')).toBe(false)
    })
  })
})
