import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  Terminal as TerminalIcon,
  Plus,
  X,
  Trash2,
  Copy,
  Check,
  RotateCw,
  Square,
} from 'lucide-react'
import { useStore } from '@nanostores/react'
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
} from '../../store/terminalStore'

export const TerminalDeck: React.FC = () => {
  const tabs = useStore($terminalTabs)
  const activeTabId = useStore($activeTerminalTabId)
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0]

  const [input, setInput] = useState('')
  const [historyIndex, setHistoryIndex] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const terminalEndRef = useRef<HTMLDivElement>(null)
  const socketsRef = useRef<Map<string, WebSocket>>(new Map())

  // Connect WebSocket for a given terminal tab
  const connectTabSocket = useCallback((tabId: string) => {
    let wsUrl: string
    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http') && window.location.host) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      wsUrl = `${protocol}//${window.location.host}/ws/terminal`
    } else {
      wsUrl = 'ws://127.0.0.1:8000/ws/terminal'
    }

    try {
      const existing = socketsRef.current.get(tabId)
      if (existing && existing.readyState === WebSocket.OPEN) {
        return
      }

      const ws = new WebSocket(wsUrl)
      socketsRef.current.set(tabId, ws)

      ws.onopen = () => {
        setTerminalConnected(tabId, true)
      }

      ws.onmessage = (event) => {
        appendTerminalOutput(tabId, event.data)
      }

      ws.onclose = () => {
        setTerminalConnected(tabId, false)
      }

      ws.onerror = () => {
        setTerminalConnected(tabId, false)
      }
    } catch (e) {
      console.warn(`[Terminal] WS error for tab ${tabId}:`, e)
      setTerminalConnected(tabId, false)
    }
  }, [])

  // Ensure active tab has an open socket
  useEffect(() => {
    if (activeTabId) {
      connectTabSocket(activeTabId)
    }
  }, [activeTabId, connectTabSocket])

  // Cleanup sockets on unmount
  useEffect(() => {
    const sockets = socketsRef.current
    return () => {
      sockets.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close()
        }
      })
      sockets.clear()
    }
  }, [])

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeTab?.lines])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() && input !== '') return
    const cmd = input
    setInput('')
    setHistoryIndex(null)

    if (cmd.trim()) {
      recordTerminalCommand(activeTab.id, cmd)
    }

    appendTerminalOutput(activeTab.id, `$ ${cmd}`)

    const ws = socketsRef.current.get(activeTab.id)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(cmd + '\n')
    } else {
      appendTerminalOutput(
        activeTab.id,
        '[Terminal Warning: Session disconnected. Reconnecting...]'
      )
      connectTabSocket(activeTab.id)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const history = activeTab.history
      if (history.length === 0) return

      let nextIndex = historyIndex === null ? history.length - 1 : historyIndex - 1
      if (nextIndex < 0) nextIndex = 0
      setHistoryIndex(nextIndex)
      setInput(history[nextIndex])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const history = activeTab.history
      if (historyIndex === null) return

      const nextIndex = historyIndex + 1
      if (nextIndex >= history.length) {
        setHistoryIndex(null)
        setInput('')
      } else {
        setHistoryIndex(nextIndex)
        setInput(history[nextIndex])
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      // Ctrl+C SIGINT
      handleSendInterrupt()
    }
  }

  const handleSendInterrupt = () => {
    const ws = socketsRef.current.get(activeTab.id)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send('\x03') // Send ASCII ETX (Ctrl+C)
    }
    appendTerminalOutput(activeTab.id, '^C')
  }

  const handleCopyAll = async () => {
    const fullText = activeTab.lines.join('\n')
    try {
      await navigator.clipboard.writeText(fullText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleClear = () => {
    clearTerminalOutput(activeTab.id)
  }

  const handleReconnect = () => {
    const ws = socketsRef.current.get(activeTab.id)
    if (ws) {
      ws.close()
    }
    connectTabSocket(activeTab.id)
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] font-mono text-[12px] select-text overflow-hidden">
      {/* Tab Strip */}
      <div className="flex items-center justify-between px-2 bg-[#010409] border-b border-[rgba(255,255,255,0.08)] h-9 shrink-0 select-none">
        {/* Left Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-[70%]">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab.id
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTerminalTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] cursor-pointer transition-colors shrink-0 ${
                  isActive
                    ? 'bg-[#161b22] text-[#f0f6fc] font-medium'
                    : 'text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#161b22]/50'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    tab.connected ? 'bg-[#238636]' : 'bg-[#d29922]'
                  }`}
                  title={tab.connected ? 'Connected' : 'Offline / Connecting'}
                />
                <TerminalIcon className="w-3 h-3 text-[var(--dt-primary)]" />
                <span className="truncate max-w-[90px]">{tab.title}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTerminalTab(tab.id)
                  }}
                  className="p-0.5 hover:bg-[#30363d] rounded text-[#8b949e] hover:text-[#f0f6fc]"
                  title="Close Terminal"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )
          })}

          <button
            type="button"
            onClick={() => createTerminalTab()}
            className="p-1 hover:bg-[#161b22] rounded-[6px] text-[#8b949e] hover:text-[#f0f6fc] cursor-pointer transition-colors"
            title="New Terminal Tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleSendInterrupt}
            className="p-1 text-[#8b949e] hover:text-[#f85149] hover:bg-[#161b22] rounded cursor-pointer transition-colors"
            title="Send Ctrl+C (Interrupt)"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleCopyAll}
            className="p-1 text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#161b22] rounded cursor-pointer transition-colors"
            title="Copy Terminal Output"
          >
            {copied ? <Check className="w-3 h-3 text-[#238636]" /> : <Copy className="w-3 h-3" />}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-[#8b949e] hover:text-[#f85149] hover:bg-[#161b22] rounded cursor-pointer transition-colors"
            title="Clear Output"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleReconnect}
            className="p-1 text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#161b22] rounded cursor-pointer transition-colors"
            title="Reconnect Terminal Session"
          >
            <RotateCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5 text-[#c9d1d9]">
        {activeTab.lines.map((l, i) => {
          const spans = parseAnsiLine(l)
          return (
            <div key={i} className="whitespace-pre-wrap leading-relaxed text-[#c9d1d9] text-[11px]">
              {spans.map((s, si) => (
                <span
                  key={si}
                  style={{ color: s.color }}
                  className={s.bold ? 'font-bold' : ''}
                >
                  {s.text}
                </span>
              ))}
            </div>
          )
        })}
        <div ref={terminalEndRef} />
      </div>

      {/* Terminal Input Bar */}
      <form
        onSubmit={handleSend}
        className="flex items-center px-3 py-2 border-t border-[rgba(255,255,255,0.08)] bg-[#010409] shrink-0"
      >
        <span className="text-[var(--dt-primary)] mr-2 font-bold select-none text-[12px]">$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Run command (Up/Down for history, Ctrl+C to cancel)..."
          className="flex-1 bg-transparent text-[#f0f6fc] outline-none font-mono text-[11px] placeholder:text-[#484f58]"
          autoFocus
        />
      </form>
    </div>
  )
}
