import React, { useEffect } from 'react'
import { useStore } from '@nanostores/react'
import { $sidebarOpen } from './store/layoutStore'
import { $activeSessionId, loadSessions } from './store/sessionStore'
import { loadMessages, $streamingState, appendAssistantMessage } from './store/messageStore'
import { pushApproval } from './store/approvalStore'
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

export const App: React.FC = () => {
  const sidebarOpen = useStore($sidebarOpen)
  const activeSessionId = useStore($activeSessionId)

  useEffect(() => {
    loadSessions()
    gateway.connect()

    // Listen to real-time WebSocket events from backend gateway
    const unsubToken = gateway.on('stream.token', (data) => {
      const current = $streamingState.get()
      $streamingState.set({
        ...current,
        isStreaming: true,
        currentTokens: current.currentTokens + (data.token || ''),
      })
    })

    const unsubReasoning = gateway.on('stream.reasoning', (data) => {
      const current = $streamingState.get()
      $streamingState.set({
        ...current,
        isStreaming: true,
        currentReasoning: current.currentReasoning + (data.token || ''),
      })
    })

    const unsubToolStart = gateway.on('tool_start', (data) => {
      const current = $streamingState.get()
      $streamingState.set({
        ...current,
        activeToolName: data.tool_name,
        activeToolArgs: data.args,
      })
    })

    const unsubApproval = gateway.on('approval_request', (data) => {
      pushApproval({
        prompt_id: data.prompt_id,
        session_id: $activeSessionId.get() || '',
        tool_name: data.tool_name,
        tool_args: data.args,
        danger_level: data.danger_level || 'destructive',
        created_at: Date.now(),
      })
    })

    const unsubTurnComplete = gateway.on('turn.complete', (data) => {
      const activeId = $activeSessionId.get()
      if (activeId && data.response) {
        appendAssistantMessage(activeId, data.response)
      }
      $streamingState.set({
        isStreaming: false,
        currentTokens: '',
        currentReasoning: '',
        activeToolName: null,
        activeToolArgs: null,
      })
    })

    return () => {
      unsubToken()
      unsubReasoning()
      unsubToolStart()
      unsubApproval()
      unsubTurnComplete()
    }
  }, [])

  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId)
    }
  }, [activeSessionId])

  return (
    <div className="h-screen w-screen flex flex-col bg-[#faf8f5] text-[#27251e] overflow-hidden font-sans">
      {/* 1. Titlebar Chrome with Workspace dropdown & controls */}
      <TitlebarChrome />

      {/* 2. Main Spatial Multi-Pane Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Workspace Profile Rail (48px) */}
        <WorkspaceRail />

        {/* Sessions & Projects Accordion Rail (256px) */}
        {sidebarOpen && <SessionsRail />}

        {/* Central Dominant Workspace Canvas */}
        <MainCanvas />

        {/* Right Collapsible Context Pane (Files | Review | Terminal) */}
        <ContextPane />
      </div>

      {/* 3. Bottom Statusbar Chrome */}
      <StatusBar />

      {/* 4. Global Overlays & Modals */}
      <CommandPalette />
      <SettingsModal />
      <StarmapModal />
    </div>
  )
}
