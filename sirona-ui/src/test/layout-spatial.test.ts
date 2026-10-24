import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  $sidebarOpen,
  $contextPaneOpen,
  $activeContextTab,
  toggleSidebar,
  toggleContextPane,
  setActiveContextTab,
  handleWindowResize,
} from '../store/layoutStore'

describe('Layout & Spatial System — Stage 01–16 Normalization', () => {
  beforeEach(() => {
    // Ensure window object exists for test suite
    if (typeof globalThis.window === 'undefined') {
      ;(globalThis as any).window = { innerWidth: 1440 }
    } else {
      globalThis.window.innerWidth = 1440
    }
    $sidebarOpen.set(true)
    $contextPaneOpen.set(false)
    $activeContextTab.set('files')
  })

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.innerWidth = 1440
    }
  })

  it('defaults to focused single-canvas mode with ContextPane closed', () => {
    expect($sidebarOpen.get()).toBe(true)
    expect($contextPaneOpen.get()).toBe(false)
  })

  it('guarantees SessionsRail and ContextPane do not remain expanded simultaneously below 1200px (at 980px)', () => {
    globalThis.window.innerWidth = 980

    // Open context pane while sidebar is open
    toggleContextPane()
    expect($contextPaneOpen.get()).toBe(true)
    expect($sidebarOpen.get()).toBe(false) // Sidebar automatically collapsed to preserve canvas

    // Now open sidebar
    toggleSidebar()
    expect($sidebarOpen.get()).toBe(true)
    expect($contextPaneOpen.get()).toBe(false) // Context pane automatically collapsed
  })

  it('preserves single-canvas priority at intermediate 1100px width', () => {
    globalThis.window.innerWidth = 1100

    setActiveContextTab('preview')
    expect($contextPaneOpen.get()).toBe(true)
    expect($sidebarOpen.get()).toBe(false)
  })

  it('permits simultaneous manual expansion at supported desktop widths >= 1200px', () => {
    globalThis.window.innerWidth = 1200

    $sidebarOpen.set(true)
    toggleContextPane()

    expect($sidebarOpen.get()).toBe(true)
    expect($contextPaneOpen.get()).toBe(true)
  })

  it('supports wide preview/review pane coexistence at 1440px+', () => {
    globalThis.window.innerWidth = 1440

    $sidebarOpen.set(true)
    setActiveContextTab('preview')

    expect($sidebarOpen.get()).toBe(true)
    expect($contextPaneOpen.get()).toBe(true)
    expect($activeContextTab.get()).toBe('preview')
  })

  it('handleWindowResize automatically collapses conflicting pane when resizing below 1200px', () => {
    $sidebarOpen.set(true)
    $contextPaneOpen.set(true)
    $activeContextTab.set('files')

    handleWindowResize(980)

    expect($contextPaneOpen.get()).toBe(false)
    expect($sidebarOpen.get()).toBe(true)
  })

  it('handleWindowResize preserves active preview/review tab by collapsing sidebar on shrink', () => {
    $sidebarOpen.set(true)
    $contextPaneOpen.set(true)
    $activeContextTab.set('preview')

    handleWindowResize(1100)

    expect($contextPaneOpen.get()).toBe(true)
    expect($sidebarOpen.get()).toBe(false)
  })
})
