import { describe, it, expect, beforeEach } from 'vitest'
import {
  $terminalTabs,
  $activeTerminalTabId,
  createTerminalTab,
  closeTerminalTab,
  setActiveTerminalTab,
  appendTerminalOutput,
  clearTerminalOutput,
  recordTerminalCommand,
  setTerminalConnected,
  parseAnsiLine,
} from '../store/terminalStore'

describe('terminalStore & ANSI Parser', () => {
  beforeEach(() => {
    // Reset terminal state
    $terminalTabs.set([
      {
        id: 'term-1',
        title: 'Shell 1',
        type: 'shell',
        lines: ['Welcome to Sirona'],
        history: [],
        connected: false,
      },
    ])
    $activeTerminalTabId.set('term-1')
  })

  it('parses ANSI colors and formatting into structured spans', () => {
    // Plain text
    const plain = parseAnsiLine('Hello world')
    expect(plain).toEqual([{ text: 'Hello world', color: undefined, bold: false }])

    // ANSI green + bold
    const ansi = '\x1b[32;1mSuccess\x1b[0m done'
    const parsed = parseAnsiLine(ansi)
    expect(parsed.length).toBe(2)
    expect(parsed[0].text).toBe('Success')
    expect(parsed[0].color).toBe('#10b981')
    expect(parsed[0].bold).toBe(true)
    expect(parsed[1].text).toBe(' done')
    expect(parsed[1].bold).toBe(false)
  })

  it('creates new terminal tab and sets active tab', () => {
    const newId = createTerminalTab('Build Task', 'agent')
    expect(newId).toBeDefined()
    expect($activeTerminalTabId.get()).toBe(newId)

    const tabs = $terminalTabs.get()
    expect(tabs.length).toBe(2)
    const newTab = tabs.find((t) => t.id === newId)
    expect(newTab?.title).toBe('Build Task')
    expect(newTab?.type).toBe('agent')
  })

  it('switches and closes terminal tabs gracefully', () => {
    const tab2 = createTerminalTab('Shell 2')
    const tab3 = createTerminalTab('Shell 3')
    expect($terminalTabs.get().length).toBe(3)

    setActiveTerminalTab(tab2)
    expect($activeTerminalTabId.get()).toBe(tab2)

    // Close tab 3
    closeTerminalTab(tab3)
    expect($terminalTabs.get().length).toBe(2)

    // Close active tab 2 (should switch to remaining tab)
    closeTerminalTab(tab2)
    expect($terminalTabs.get().length).toBe(1)
    expect($activeTerminalTabId.get()).toBe('term-1')

    // Close final tab (resets to default tab)
    closeTerminalTab('term-1')
    expect($terminalTabs.get().length).toBe(1)
    expect($terminalTabs.get()[0].title).toBe('Shell 1')
  })

  it('appends output lines and clears output', () => {
    appendTerminalOutput('term-1', 'line 1\nline 2')
    const tab = $terminalTabs.get().find((t) => t.id === 'term-1')
    expect(tab?.lines).toContain('line 1')
    expect(tab?.lines).toContain('line 2')

    clearTerminalOutput('term-1')
    const cleared = $terminalTabs.get().find((t) => t.id === 'term-1')
    expect(cleared?.lines.length).toBe(0)
  })

  it('records commands and navigates history', () => {
    recordTerminalCommand('term-1', 'ls -la')
    recordTerminalCommand('term-1', 'git status')
    recordTerminalCommand('term-1', 'git status') // duplicate consecutive

    const tab = $terminalTabs.get().find((t) => t.id === 'term-1')
    expect(tab?.history).toEqual(['ls -la', 'git status'])
  })

  it('updates connection state', () => {
    setTerminalConnected('term-1', true)
    let tab = $terminalTabs.get().find((t) => t.id === 'term-1')
    expect(tab?.connected).toBe(true)

    setTerminalConnected('term-1', false)
    tab = $terminalTabs.get().find((t) => t.id === 'term-1')
    expect(tab?.connected).toBe(false)
  })
})
