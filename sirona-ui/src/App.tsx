import React, { useEffect } from 'react'
import { useStore } from '@nanostores/react'
import { $sidebarOpen, handleWindowResize } from './store/layoutStore'
import { $activeSessionId, loadSessions } from './store/sessionStore'
import { loadMessages } from './store/messageStore'
import { gateway } from './api/gateway'
import { TitlebarChrome } from './components/layout/TitlebarChrome'
import { WorkspaceRail } from './components/layout/WorkspaceRail'
import { SessionsRail } from './components/layout/SessionsRail'
import { MainCanvas } from './components/layout/MainCanvas'
import { ContextPane } from './components/context/ContextPane'
import { StatusBar } from './components/layout/StatusBar'
import { CommandPalette } from './components/modals/CommandPalette'
import { SettingsModal } from './components/modals/SettingsModal'
import { StarmapModal } from './components/modals/StarmapModal'
import { DiagnosticsModal } from './components/telemetry/DiagnosticsModal'

export const App: React.FC = () => {
  const sidebarOpen = useStore($sidebarOpen)
  const activeSessionId = useStore($activeSessionId)

  useEffect(() => {
    loadSessions()
    gateway.connect()
  }, [])

  useEffect(() => {
    const onResize = () => {
      handleWindowResize(window.innerWidth)
    }
    window.addEventListener('resize', onResize)
    handleWindowResize(window.innerWidth)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId)
    }
  }, [activeSessionId])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--dt-background)] text-[var(--dt-foreground)] select-none font-sans">
      <TitlebarChrome />

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden relative">
        <WorkspaceRail />

        {sidebarOpen && <SessionsRail />}

        {/* Central Chat & Tool Canvas */}
        <MainCanvas />

        {/* Right Rail Context & Diagnostics */}
        <ContextPane />
      </div>

      <StatusBar />

      {/* Global Modals */}
      <CommandPalette />
      <SettingsModal />
      <StarmapModal />
      <DiagnosticsModal />
    </div>
  )
}
