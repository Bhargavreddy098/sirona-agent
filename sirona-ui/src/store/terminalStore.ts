import { atom } from 'nanostores'

export interface TerminalTab {
  id: string
  title: string
  type: 'shell' | 'agent'
  lines: string[]
  history: string[]
  connected: boolean
}

const DEFAULT_WELCOME = [
  'Sirona Interactive Terminal Deck v0.1.0',
  'Environment: local workspace shell session',
  'Type commands below, press Up/Down for command history:',
]

export const $terminalTabs = atom<TerminalTab[]>([
  {
    id: 'term-1',
    title: 'Shell 1',
    type: 'shell',
    lines: [...DEFAULT_WELCOME],
    history: [],
    connected: false,
  },
])

export const $activeTerminalTabId = atom<string>('term-1')

export function createTerminalTab(title?: string, type: 'shell' | 'agent' = 'shell'): string {
  const current = $terminalTabs.get()
  const nextNum = current.length + 1
  const id = `term-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const newTab: TerminalTab = {
    id,
    title: title || `${type === 'agent' ? 'Agent Run' : 'Shell'} ${nextNum}`,
    type,
    lines: [
      `Sirona ${type === 'agent' ? 'Agent Console' : 'Interactive Shell'} (Tab #${nextNum})`,
      'Ready for commands.',
    ],
    history: [],
    connected: false,
  }
  $terminalTabs.set([...current, newTab])
  $activeTerminalTabId.set(id)
  return id
}

export function closeTerminalTab(id: string): void {
  const current = $terminalTabs.get()
  if (current.length <= 1) {
    // If closing last tab, reset to a fresh default
    const resetTab: TerminalTab = {
      id: 'term-1',
      title: 'Shell 1',
      type: 'shell',
      lines: [...DEFAULT_WELCOME],
      history: [],
      connected: false,
    }
    $terminalTabs.set([resetTab])
    $activeTerminalTabId.set('term-1')
    return
  }

  const filtered = current.filter((t) => t.id !== id)
  $terminalTabs.set(filtered)

  if ($activeTerminalTabId.get() === id) {
    $activeTerminalTabId.set(filtered[filtered.length - 1].id)
  }
}

export function setActiveTerminalTab(id: string): void {
  $activeTerminalTabId.set(id)
}

export function appendTerminalOutput(id: string, text: string): void {
  const current = $terminalTabs.get()
  const tab = current.find((t) => t.id === id)
  if (!tab) return

  // Split lines if incoming text contains newlines
  const incoming = text.split(/\r?\n/)
  // Cap at 2000 lines per session to prevent memory leak
  const updatedLines = [...tab.lines, ...incoming].slice(-2000)

  $terminalTabs.set(
    current.map((t) => (t.id === id ? { ...t, lines: updatedLines } : t))
  )
}

export function clearTerminalOutput(id: string): void {
  const current = $terminalTabs.get()
  $terminalTabs.set(
    current.map((t) => (t.id === id ? { ...t, lines: [] } : t))
  )
}

export function recordTerminalCommand(id: string, cmd: string): void {
  if (!cmd.trim()) return
  const current = $terminalTabs.get()
  $terminalTabs.set(
    current.map((t) => {
      if (t.id !== id) return t
      // Deduplicate consecutive identical commands
      const history = [...t.history]
      if (history[history.length - 1] !== cmd) {
        history.push(cmd)
      }
      return { ...t, history: history.slice(-100) }
    })
  )
}

export function setTerminalConnected(id: string, connected: boolean): void {
  const current = $terminalTabs.get()
  $terminalTabs.set(
    current.map((t) => (t.id === id ? { ...t, connected } : t))
  )
}

export interface AnsiSpan {
  text: string
  color?: string
  bold?: boolean
}

const ANSI_COLOR_MAP: Record<string, string> = {
  '30': '#72706b', // black / dim
  '31': '#ef4444', // red
  '32': '#10b981', // green
  '33': '#f59e0b', // yellow
  '34': '#3b82f6', // blue
  '35': '#a855f7', // magenta
  '36': '#06b6d4', // cyan
  '37': '#f5f3ef', // white
  '90': '#92918b', // bright black / gray
  '91': '#f87171', // bright red
  '92': '#34d399', // bright green
  '93': '#fbbf24', // bright yellow
  '94': '#60a5fa', // bright blue
  '95': '#c084fc', // bright magenta
  '96': '#22d3ee', // bright cyan
  '97': '#ffffff', // bright white
}

export function parseAnsiLine(raw: string): AnsiSpan[] {
  if (!raw) return [{ text: ' ' }]

  const regex = /\x1b\[([0-9;]*)m/g
  const spans: AnsiSpan[] = []
  let lastIndex = 0
  let currentColor: string | undefined = undefined
  let currentBold: boolean = false

  let match: RegExpExecArray | null
  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      spans.push({
        text: raw.slice(lastIndex, match.index),
        color: currentColor,
        bold: currentBold,
      })
    }

    const codes = match[1].split(';')
    for (const code of codes) {
      if (code === '' || code === '0') {
        currentColor = undefined
        currentBold = false
      } else if (code === '1') {
        currentBold = true
      } else if (ANSI_COLOR_MAP[code]) {
        currentColor = ANSI_COLOR_MAP[code]
      }
    }

    lastIndex = regex.lastIndex
  }

  if (lastIndex < raw.length) {
    spans.push({
      text: raw.slice(lastIndex),
      color: currentColor,
      bold: currentBold,
    })
  }

  return spans.length > 0 ? spans : [{ text: raw }]
}
