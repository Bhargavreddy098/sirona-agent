import { atom, computed } from 'nanostores'
import {
  $commandPaletteOpen,
  toggleCommandPalette,
  toggleTerminalDeck,
  setActiveContextTab,
  toggleSettings,
  toggleStarmap,
  toggleSidebar,
} from './layoutStore'
import { $sessions, openSessionInTab, createNewSession } from './sessionStore'
import { $fileTree, openFile, type FileTreeNode } from './fileStore'
import { stageFile, refreshGitStatus } from './gitStore'

export type CommandCategory = 'Slash Commands' | 'Sessions' | 'Files' | 'Git' | 'Views' | 'Settings' | 'Messages & FTS'

export interface PaletteItem {
  id: string
  title: string
  subtitle?: string
  category: CommandCategory
  shortcut?: string
  iconType: 'slash' | 'session' | 'file' | 'git' | 'view' | 'settings' | 'sparkle'
  action: () => void | Promise<void>
}

export const $paletteQuery = atom<string>('')
export const $selectedIndex = atom<number>(0)
export const $ftsResults = atom<PaletteItem[]>([])

export function setPaletteQuery(q: string): void {
  $paletteQuery.set(q)
  $selectedIndex.set(0)
}

export function openPaletteWithQuery(q = ''): void {
  $paletteQuery.set(q)
  $selectedIndex.set(0)
  $commandPaletteOpen.set(true)
}

let ftsDebounceTimer: ReturnType<typeof setTimeout> | null = null

export async function searchTranscriptFts(query: string): Promise<void> {
  const trimmed = query.trim()
  if (!trimmed || trimmed.length < 2 || trimmed.startsWith('/')) {
    $ftsResults.set([])
    return
  }

  try {
    const res = await fetch(`http://127.0.0.1:8000/api/search?q=${encodeURIComponent(trimmed)}&limit=15`)
    if (!res.ok) {
      $ftsResults.set([])
      return
    }
    const data = await res.json()
    const results = data.results || []
    const items: PaletteItem[] = results.map((r: { message_id: number; session_id: string; role: string; content: string; snippet?: string }) => {
      const cleanSnippet = r.snippet ? r.snippet.replace(/<[^>]+>/g, '') : r.content
      const preview = cleanSnippet.length > 80 ? cleanSnippet.slice(0, 77) + '...' : cleanSnippet
      return {
        id: `fts-${r.message_id}`,
        title: preview,
        subtitle: `${r.role === 'user' ? 'User' : 'Assistant'} · session ${r.session_id.slice(0, 8)}...`,
        category: 'Messages & FTS',
        iconType: 'sparkle',
        action: () => {
          openSessionInTab(r.session_id)
          toggleCommandPalette()
        },
      }
    })
    $ftsResults.set(items)
  } catch {
    $ftsResults.set([])
  }
}

$paletteQuery.subscribe((q) => {
  if (ftsDebounceTimer) clearTimeout(ftsDebounceTimer)
  ftsDebounceTimer = setTimeout(() => {
    searchTranscriptFts(q)
  }, 180)
})


// Flatten file tree nodes into simple list
function flattenFiles(nodes: FileTreeNode[], acc: Array<{ path: string; name: string }> = []): Array<{ path: string; name: string }> {
  for (const n of nodes) {
    if (!n.is_dir) {
      acc.push({ path: n.path, name: n.name })
    }
    if (n.children) {
      flattenFiles(n.children, acc)
    }
  }
  return acc
}

// Built-in Slash Commands & Core Actions
export function getBaseCommands(): PaletteItem[] {
  return [
    {
      id: 'slash-goal',
      title: '/goal',
      subtitle: 'Run a long-running autonomous goal until completed',
      category: 'Slash Commands',
      iconType: 'slash',
      action: () => {
        toggleCommandPalette()
      },
    },
    {
      id: 'slash-plan',
      title: '/plan',
      subtitle: 'Create a comprehensive architectural implementation plan',
      category: 'Slash Commands',
      iconType: 'slash',
      action: () => {
        toggleCommandPalette()
      },
    },
    {
      id: 'slash-terminal',
      title: '/terminal',
      subtitle: 'Toggle bottom docked PTY terminal deck',
      category: 'Slash Commands',
      shortcut: '⌘`',
      iconType: 'slash',
      action: () => {
        toggleTerminalDeck()
        toggleCommandPalette()
      },
    },
    {
      id: 'slash-diff',
      title: '/diff',
      subtitle: 'Review git unstaged/staged working tree changes',
      category: 'Slash Commands',
      iconType: 'slash',
      action: () => {
        setActiveContextTab('review')
        toggleCommandPalette()
      },
    },
    {
      id: 'slash-files',
      title: '/files',
      subtitle: 'Explore and search project workspace files',
      category: 'Slash Commands',
      shortcut: '⌘\\',
      iconType: 'slash',
      action: () => {
        setActiveContextTab('files')
        toggleCommandPalette()
      },
    },
    {
      id: 'slash-preview',
      title: '/preview',
      subtitle: 'View live sandboxed HTML / SVG artifact preview',
      category: 'Slash Commands',
      iconType: 'slash',
      action: () => {
        setActiveContextTab('preview')
        toggleCommandPalette()
      },
    },
    {
      id: 'slash-starmap',
      title: '/starmap',
      subtitle: 'Inspect DAG session lineage and checkpoint history',
      category: 'Slash Commands',
      iconType: 'slash',
      action: () => {
        toggleStarmap()
        toggleCommandPalette()
      },
    },
    {
      id: 'slash-settings',
      title: '/settings',
      subtitle: 'Manage model API keys, reasoning effort and guardrails',
      category: 'Slash Commands',
      iconType: 'slash',
      action: () => {
        toggleSettings()
        toggleCommandPalette()
      },
    },
    {
      id: 'action-new-chat',
      title: 'New Chat Session',
      subtitle: 'Start an empty conversation thread',
      category: 'Views',
      shortcut: '⌘N',
      iconType: 'sparkle',
      action: () => {
        createNewSession()
        toggleCommandPalette()
      },
    },
    {
      id: 'action-toggle-sidebar',
      title: 'Toggle Left Sidebar',
      subtitle: 'Show or hide conversation history rail',
      category: 'Views',
      shortcut: '⌘B',
      iconType: 'view',
      action: () => {
        toggleSidebar()
        toggleCommandPalette()
      },
    },
    {
      id: 'git-stage-all',
      title: 'Git: Stage All Changes',
      subtitle: 'Add all tracked & untracked files to git staging index',
      category: 'Git',
      iconType: 'git',
      action: async () => {
        await stageFile()
        await refreshGitStatus()
        toggleCommandPalette()
      },
    },
    {
      id: 'git-refresh-status',
      title: 'Git: Refresh Repository Status',
      subtitle: 'Sync status with local working tree',
      category: 'Git',
      iconType: 'git',
      action: async () => {
        await refreshGitStatus()
        toggleCommandPalette()
      },
    },
  ]
}

// Simple fuzzy score algorithm
export function fuzzyMatch(pattern: string, text: string): number {
  if (!pattern) return 1
  const p = pattern.toLowerCase()
  const t = text.toLowerCase()

  if (t === p) return 100
  if (t.startsWith(p)) return 80
  if (t.includes(p)) return 50

  // Acronym match / character sequence
  let pIdx = 0
  let score = 0
  for (let tIdx = 0; tIdx < t.length && pIdx < p.length; tIdx++) {
    if (t[tIdx] === p[pIdx]) {
      score += 10
      pIdx++
    }
  }
  return pIdx === p.length ? score : 0
}

// Computed combined items filtered by active query
export const $filteredItems = computed(
  [$paletteQuery, $sessions, $fileTree, $ftsResults],
  (query, sessions, fileTree, ftsItems) => {
    const q = query.trim()
    const baseItems = getBaseCommands()

    // Add sessions
    const sessionItems: PaletteItem[] = sessions.map((s) => ({
      id: `session-${s.id}`,
      title: s.title || 'Untitled Session',
      subtitle: `${s.model} · ${s.message_count || 0} messages`,
      category: 'Sessions',
      iconType: 'session',
      action: () => {
        openSessionInTab(s.id)
        toggleCommandPalette()
      },
    }))

    // Add workspace files
    const flatFiles = flattenFiles(fileTree)
    const fileItems: PaletteItem[] = flatFiles.slice(0, 50).map((f) => ({
      id: `file-${f.path}`,
      title: f.name,
      subtitle: f.path,
      category: 'Files',
      iconType: 'file',
      action: () => {
        openFile(f.path)
        setActiveContextTab('files')
        toggleCommandPalette()
      },
    }))

    const all = [...baseItems, ...sessionItems, ...fileItems, ...ftsItems]


    if (!q) {
      return all
    }

    // Score and rank
    const scored = all
      .map((item) => {
        const titleScore = fuzzyMatch(q, item.title)
        const subScore = item.subtitle ? fuzzyMatch(q, item.subtitle) * 0.5 : 0
        const total = Math.max(titleScore, subScore)
        return { item, score: total }
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.item)

    return scored
  }
)

export function selectNext(): void {
  const items = $filteredItems.get()
  if (items.length === 0) return
  const current = $selectedIndex.get()
  $selectedIndex.set((current + 1) % items.length)
}

export function selectPrev(): void {
  const items = $filteredItems.get()
  if (items.length === 0) return
  const current = $selectedIndex.get()
  $selectedIndex.set((current - 1 + items.length) % items.length)
}

export function executeSelected(): void {
  const items = $filteredItems.get()
  const current = $selectedIndex.get()
  if (items[current]) {
    items[current].action()
  }
}
