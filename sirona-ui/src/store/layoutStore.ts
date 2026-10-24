import { atom } from 'nanostores'

export type ContextTab = 'files' | 'review' | 'terminal' | 'preview'
export type LayoutPreset = 'default' | 'focus' | 'terminal-deck'

export const $sidebarOpen = atom<boolean>(true)
export const $contextPaneOpen = atom<boolean>(true)
export const $activeContextTab = atom<ContextTab>('files')
export const $layoutPreset = atom<LayoutPreset>('default')
export const $terminalDeckOpen = atom<boolean>(false)
export const $commandPaletteOpen = atom<boolean>(false)
export const $settingsOpen = atom<boolean>(false)
export const $starmapOpen = atom<boolean>(false)

export function toggleSidebar(): void {
  $sidebarOpen.set(!$sidebarOpen.get())
}

export function toggleContextPane(): void {
  $contextPaneOpen.set(!$contextPaneOpen.get())
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
  }
}

export function toggleTerminalDeck(): void {
  $terminalDeckOpen.set(!$terminalDeckOpen.get())
}
