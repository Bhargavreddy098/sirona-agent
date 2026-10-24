import { describe, it, expect, beforeEach } from 'vitest'
import {
  $selectedIndex,
  $filteredItems,
  setPaletteQuery,
  selectNext,
  selectPrev,
  executeSelected,
  fuzzyMatch,
  getBaseCommands,
} from '../store/commandStore'
import { $commandPaletteOpen, $terminalDeckOpen, $settingsOpen } from '../store/layoutStore'
import { $sessions } from '../store/sessionStore'
import { $fileTree } from '../store/fileStore'

describe('commandStore & Command Palette Fuzzy Matching', () => {
  beforeEach(() => {
    setPaletteQuery('')
    $selectedIndex.set(0)
    $commandPaletteOpen.set(true)
    $terminalDeckOpen.set(false)
    $settingsOpen.set(false)
    $sessions.set([
      { id: 'sess-1', title: 'Refactor Auth Pipeline', model: 'gemini-2.5-flash', message_count: 8, started_at: Date.now() / 1000, pinned: 0, archived: 0 },
      { id: 'sess-2', title: 'Debug Memory Leak in Electron', model: 'claude-3.5-sonnet', message_count: 14, started_at: Date.now() / 1000, pinned: 0, archived: 0 },
    ])
    $fileTree.set([
      {
        name: 'src',
        path: 'src',
        is_dir: true,
        children: [
          { name: 'App.tsx', path: 'src/App.tsx', is_dir: false, size: 2048 },
          { name: 'main.py', path: 'src/main.py', is_dir: false, size: 1024 },
        ],
      },
    ])
  })

  it('provides base slash commands and actions', () => {
    const commands = getBaseCommands()
    const slashCmds = commands.filter((c) => c.category === 'Slash Commands')
    expect(slashCmds.some((c) => c.title === '/goal')).toBe(true)
    expect(slashCmds.some((c) => c.title === '/plan')).toBe(true)
    expect(slashCmds.some((c) => c.title === '/terminal')).toBe(true)
    expect(slashCmds.some((c) => c.title === '/diff')).toBe(true)
    expect(slashCmds.some((c) => c.title === '/files')).toBe(true)
    expect(slashCmds.some((c) => c.title === '/preview')).toBe(true)
    expect(slashCmds.some((c) => c.title === '/starmap')).toBe(true)
    expect(slashCmds.some((c) => c.title === '/settings')).toBe(true)
  })

  it('scores fuzzy matches with exact, prefix, substring, and acronym weights', () => {
    // Exact match
    expect(fuzzyMatch('goal', 'goal')).toBe(100)
    // Prefix match
    expect(fuzzyMatch('term', 'terminal')).toBe(80)
    // Substring match
    expect(fuzzyMatch('deck', 'terminal deck')).toBe(50)
    // Acronym / sequence match
    expect(fuzzyMatch('gt', 'git-terminal')).toBeGreaterThan(0)
    // No match
    expect(fuzzyMatch('xyz', 'terminal')).toBe(0)
  })

  it('filters items dynamically based on search query', () => {
    setPaletteQuery('/term')
    const items = $filteredItems.get()
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].title).toBe('/terminal')

    setPaletteQuery('Auth')
    const sessionMatches = $filteredItems.get()
    expect(sessionMatches.some((i) => i.id === 'session-sess-1')).toBe(true)

    setPaletteQuery('App.tsx')
    const fileMatches = $filteredItems.get()
    expect(fileMatches.some((i) => i.title === 'App.tsx')).toBe(true)
  })

  it('navigates selected index with wrapping on bounds', () => {
    setPaletteQuery('')
    const total = $filteredItems.get().length
    expect(total).toBeGreaterThan(3)

    // Initial
    expect($selectedIndex.get()).toBe(0)

    // Next
    selectNext()
    expect($selectedIndex.get()).toBe(1)

    // Prev
    selectPrev()
    expect($selectedIndex.get()).toBe(0)

    // Prev wrapping to last item
    selectPrev()
    expect($selectedIndex.get()).toBe(total - 1)

    // Next wrapping to first item
    selectNext()
    expect($selectedIndex.get()).toBe(0)
  })

  it('executes selected command and updates layout state', () => {
    setPaletteQuery('/terminal')
    expect($filteredItems.get()[0].title).toBe('/terminal')

    expect($terminalDeckOpen.get()).toBe(false)
    executeSelected()

    // Terminal deck should have opened and command palette closed
    expect($terminalDeckOpen.get()).toBe(true)
    expect($commandPaletteOpen.get()).toBe(false)
  })
})
