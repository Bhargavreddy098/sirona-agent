import React, { useState, useRef, useEffect } from 'react'
import {
  ArrowUp,
  Paperclip,
  ChevronDown,
  Sparkles,
  Mic,
  Sliders,
  Square,
  Slash,
  Terminal,
  GitBranch,
  FileCode,
  Eye,
  GitFork,
  Settings,
  Trash2,
} from 'lucide-react'
import { useStore } from '@nanostores/react'
import { $activeSessionId } from '../../store/sessionStore'
import {
  appendUserMessage,
  appendAssistantMessage,
  startStreaming,
  finishStreaming,
  resetStreamingState,
  clearSessionMessages,
  $streamingState,
  $composerDraft,
} from '../../store/messageStore'
import {
  toggleTerminalDeck,
  setActiveContextTab,
  toggleStarmap,
  toggleSettings,
} from '../../store/layoutStore'
import { api } from '../../api/client'
import { gateway } from '../../api/gateway'
import { StatusDrawer } from './StatusDrawer'
import { DirectiveChips } from './DirectiveChips'

interface SlashOption {
  cmd: string
  label: string
  icon: React.ReactNode
  isAction?: boolean
  action?: () => void
}

export const Composer: React.FC = () => {
  const activeSessionId = useStore($activeSessionId)
  const composerDraft = useStore($composerDraft)
  const streaming = useStore($streamingState)
  const [prompt, setPrompt] = useState('')
  const [model] = useState('gemini-2.5-flash')
  const [effort, setEffort] = useState<'low' | 'medium' | 'high'>('medium')
  const [chips, setChips] = useState<Array<{ id: string; label: string; type: 'file' | 'slash' | 'shell' }>>([])
  const [slashIndex, setSlashIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const slashOptions: SlashOption[] = [
    {
      cmd: '/goal',
      label: 'Run a long-running autonomous goal until completed',
      icon: <Sparkles className="w-3.5 h-3.5 text-[var(--dt-primary)]" />,
    },
    {
      cmd: '/plan',
      label: 'Deep architectural planning and step-by-step breakdown',
      icon: <Sliders className="w-3.5 h-3.5 text-[var(--dt-primary)]" />,
    },
    {
      cmd: '/terminal',
      label: 'Toggle bottom docked PTY terminal deck',
      icon: <Terminal className="w-3.5 h-3.5 text-[var(--dt-primary)]" />,
      isAction: true,
      action: () => toggleTerminalDeck(),
    },
    {
      cmd: '/diff',
      label: 'Review git working tree changes and staged diffs',
      icon: <GitBranch className="w-3.5 h-3.5 text-[#10b981]" />,
      isAction: true,
      action: () => setActiveContextTab('review'),
    },
    {
      cmd: '/files',
      label: 'Explore and search project workspace files',
      icon: <FileCode className="w-3.5 h-3.5 text-[var(--dt-warning)]" />,
      isAction: true,
      action: () => setActiveContextTab('files'),
    },
    {
      cmd: '/preview',
      label: 'Live sandboxed HTML and SVG artifact preview',
      icon: <Eye className="w-3.5 h-3.5 text-[var(--dt-primary)]" />,
      isAction: true,
      action: () => setActiveContextTab('preview'),
    },
    {
      cmd: '/starmap',
      label: 'Session lineage tree, checkpoints & turn rewind',
      icon: <GitFork className="w-3.5 h-3.5 text-[var(--dt-primary)]" />,
      isAction: true,
      action: () => toggleStarmap(),
    },
    {
      cmd: '/settings',
      label: 'Configure AI model providers and guardrails',
      icon: <Settings className="w-3.5 h-3.5 text-[var(--dt-muted-foreground)]" />,
      isAction: true,
      action: () => toggleSettings(),
    },
    {
      cmd: '/clear',
      label: 'Clear active session transcript history',
      icon: <Trash2 className="w-3.5 h-3.5 text-[var(--dt-danger)]" />,
      isAction: true,
      action: () => {
        if (activeSessionId) {
          clearSessionMessages(activeSessionId)
        }
      },
    },
  ]

  // Filter slash options if prompt starts with '/' and has no spaces
  const isSlashActive = prompt.startsWith('/') && !prompt.includes(' ')
  const filteredSlash = isSlashActive
    ? slashOptions.filter((o) => o.cmd.toLowerCase().startsWith(prompt.toLowerCase()))
    : []

  // Reset slash index on query change
  useEffect(() => {
    setSlashIndex(0)
  }, [prompt])

  // Listen to suggestions clicked elsewhere
  useEffect(() => {
    if (composerDraft) {
      setPrompt(composerDraft)
      $composerDraft.set('')
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }
  }, [composerDraft])

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`
    }
  }, [prompt])

  const handleInterrupt = async () => {
    if (!activeSessionId) return
    try {
      await gateway.interruptSession(activeSessionId)
    } catch (err) {
      console.warn('Failed to interrupt session', err)
    }
  }

  const applySlashOption = (option: SlashOption) => {
    if (option.isAction && option.action) {
      option.action()
      setPrompt('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } else {
      setPrompt(option.cmd + ' ')
      // Add directive chip
      setChips((prev) => [
        ...prev.filter((c) => c.type !== 'slash'),
        { id: `slash-${Date.now()}`, label: option.cmd, type: 'slash' },
      ])
      textareaRef.current?.focus()
    }
  }

  const handleSend = async () => {
    if (!prompt.trim() || !activeSessionId || streaming.isStreaming) return

    // Intercept standalone action commands on send
    const trimmed = prompt.trim()
    const matchingAction = slashOptions.find((o) => o.isAction && o.cmd === trimmed)
    if (matchingAction && matchingAction.action) {
      matchingAction.action()
      setPrompt('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      return
    }

    const currentPrompt = prompt
    setPrompt('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    // Add user message optimistically
    appendUserMessage(activeSessionId, currentPrompt)
    startStreaming(activeSessionId)

    try {
      // Primary: Send over live WebSocket Gateway (JSON-RPC 2.0)
      const res = await gateway.submitPrompt(activeSessionId, currentPrompt, {
        reasoning_effort: effort,
        model,
      }).catch(async () => {
        // Fallback: REST API
        return await api.sendPrompt(activeSessionId, currentPrompt, effort)
      })

      // If REST fallback answered synchronously
      if (res && res.response) {
        finishStreaming(res.response)
      }
    } catch (e: any) {
      appendAssistantMessage(activeSessionId, `Error: ${e.message || 'Failed to submit prompt'}`)
      resetStreamingState()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Navigate slash popover when active
    if (isSlashActive && filteredSlash.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSlashIndex((prev) => (prev + 1) % filteredSlash.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSlashIndex((prev) => (prev - 1 + filteredSlash.length) % filteredSlash.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const selected = filteredSlash[slashIndex]
        if (selected) {
          applySlashOption(selected)
        }
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setPrompt('')
        return
      }
    }

    if (e.key === 'Escape' && streaming.isStreaming) {
      e.preventDefault()
      handleInterrupt()
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!streaming.isStreaming) {
        handleSend()
      }
    }
  }

  return (
    <div className="w-full bg-transparent flex flex-col pb-4 pt-1 z-20">
      <StatusDrawer />

      {/* Floating Centered Composer Surface */}
      <div className="w-full max-w-[800px] mx-auto px-4 flex flex-col relative">
        {/* Inline Slash Command Autocomplete Popover */}
        {isSlashActive && filteredSlash.length > 0 && (
          <div className="w-full mb-2 bg-[var(--dt-card)] border border-[var(--dt-border)] rounded-[14px] shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150 z-30 font-sans">
            <div className="px-3 py-1.5 bg-[var(--dt-card-subtle)] border-b border-[var(--dt-border)] text-[10.5px] font-semibold uppercase tracking-wider text-[var(--dt-muted-foreground)] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Slash className="w-3 h-3 text-[var(--dt-primary)]" />
                Slash Commands
              </span>
              <span className="font-mono text-[9.5px]">Tab or ↵ to select</span>
            </div>
            <div className="max-h-56 overflow-y-auto p-1 flex flex-col gap-0.5">
              {filteredSlash.map((opt, idx) => {
                const isSelected = idx === slashIndex
                return (
                  <div
                    key={opt.cmd}
                    onClick={() => applySlashOption(opt)}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-[8px] cursor-pointer text-[12.5px] transition-colors ${
                      isSelected
                        ? 'bg-[var(--dt-sidebar-accent)] text-[var(--dt-foreground)] font-medium'
                        : 'hover:bg-[var(--dt-sidebar-accent)] text-[var(--dt-foreground)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.icon}
                      <span className="font-mono font-medium text-[var(--dt-primary)]">{opt.cmd}</span>
                      <span className="text-[11px] text-[var(--dt-muted-foreground)] truncate">{opt.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <DirectiveChips chips={chips} onRemove={(id) => setChips(chips.filter((c) => c.id !== id))} />

        <div className="w-full composer-glass-surface rounded-[18px] focus-within:border-[var(--dt-primary)] focus-within:ring-2 focus-within:ring-[var(--dt-primary)]/15 transition-all p-3 flex flex-col">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Sirona anything, type / for commands... (Enter to send, Esc to stop)"
            rows={1}
            className="w-full bg-transparent text-[14px] text-[var(--dt-foreground)] placeholder:text-[var(--dt-muted-foreground)] outline-none resize-none font-normal leading-relaxed px-1"
          />

          {/* Bottom Controls inside the floating input */}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--dt-border)]/50">
            {/* Pill chips: Model & Reasoning Effort */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--dt-card)] hover:bg-[var(--dt-background)] border border-[var(--dt-border)] text-[var(--dt-foreground)] text-[12px] font-normal transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--dt-primary)]" />
                <span>{model}</span>
                <ChevronDown className="w-3 h-3 text-[var(--dt-muted-foreground)]" />
              </button>

              <button
                type="button"
                onClick={() =>
                  setEffort(effort === 'low' ? 'medium' : effort === 'medium' ? 'high' : 'low')
                }
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--dt-card)] hover:bg-[var(--dt-background)] border border-[var(--dt-border)] text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] text-[12px] font-normal transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-[var(--dt-muted-foreground)]" />
                <span>Effort:</span>
                <span className="capitalize font-medium text-[var(--dt-foreground)]">{effort}</span>
              </button>
            </div>

            {/* Right controls: Attach, Voice, Send / Stop */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="p-1.5 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-muted)] rounded-[6px] transition-colors cursor-pointer"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-muted)] rounded-[6px] transition-colors cursor-pointer"
                title="Voice input"
              >
                <Mic className="w-4 h-4" />
              </button>

              {streaming.isStreaming ? (
                <button
                  type="button"
                  onClick={handleInterrupt}
                  className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--dt-destructive)] hover:brightness-110 text-white shadow-sm transition-all cursor-pointer"
                  title="Stop generation (Esc)"
                >
                  <Square className="w-3 h-3 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!prompt.trim()}
                  className={`flex items-center justify-center w-7 h-7 rounded-full transition-all cursor-pointer ${
                    prompt.trim()
                      ? 'bg-[var(--dt-primary)] text-white hover:brightness-110 shadow-sm'
                      : 'bg-[var(--dt-border)] text-[var(--dt-muted-foreground)] cursor-not-allowed opacity-50'
                  }`}
                  title="Send query (Enter)"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
