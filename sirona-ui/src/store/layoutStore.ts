import { atom } from 'nanostores'

export type ContextTab = 'files' | 'review' | 'terminal' | 'preview'
export type LayoutPreset = 'default' | 'focus' | 'terminal-deck'

function getWindowWidth(): number {
  if (typeof window !== 'undefined' && typeof window.innerWidth === 'number') {
    return window.innerWidth
  }
  return 1440
}

export const $sidebarOpen = atom<boolean>(true)
export const $contextPaneOpen = atom<boolean>(false)
export const $activeContextTab = atom<ContextTab>('files')
export const $layoutPreset = atom<LayoutPreset>('focus')
export const $terminalDeckOpen = atom<boolean>(false)
export const $commandPaletteOpen = atom<boolean>(false)
export const $settingsOpen = atom<boolean>(false)
export const $starmapOpen = atom<boolean>(false)

export function toggleSidebar(): void {
  const willOpen = !$sidebarOpen.get()
  $sidebarOpen.set(willOpen)
  if (willOpen && getWindowWidth() < 1200 && $contextPaneOpen.get()) {
    $contextPaneOpen.set(false)
  }
}

export function toggleContextPane(): void {
  const willOpen = !$contextPaneOpen.get()
  $contextPaneOpen.set(willOpen)
  if (willOpen && getWindowWidth() < 1200 && $sidebarOpen.get()) {
    $sidebarOpen.set(false)
  }
}

export function toggleCommandPalette(): void {
  $commandPaletteOpen.set(!$commandPaletteOpen.get())
}

export function toggleSettings(): void {
  $settingsOpen.set(!$settingsOpen.get())
}

export function toggleStarmap(): void {
  $starmapOpen.set(!$starmapOpen.get())
}

export function setActiveContextTab(tab: ContextTab): void {
  $activeContextTab.set(tab)
  if (!$contextPaneOpen.get()) {
    $contextPaneOpen.set(true)
    if (getWindowWidth() < 1200 && $sidebarOpen.get()) {
      $sidebarOpen.set(false)
    }
  }
}

export function toggleTerminalDeck(): void {
  $terminalDeckOpen.set(!$terminalDeckOpen.get())
}

export function handleWindowResize(width: number): void {
  if (width < 1200) {
    if ($sidebarOpen.get() && $contextPaneOpen.get()) {
      const activeTab = $activeContextTab.get()
      if (activeTab === 'preview' || activeTab === 'review') {
        $sidebarOpen.set(false)
      } else {
        $contextPaneOpen.set(false)
      }
    }
  }
}
