import React, { useState, useRef, useEffect } from 'react'
import { ArrowUp, Paperclip, ChevronDown, Sparkles, Mic, Sliders } from 'lucide-react'
import { useStore } from '@nanostores/react'
import { $activeSessionId } from '../../store/sessionStore'
import {
  appendUserMessage,
  appendAssistantMessage,
  $streamingState,
  $composerDraft,
} from '../../store/messageStore'
import { api } from '../../api/client'
import { gateway } from '../../api/gateway'
import { StatusDrawer } from './StatusDrawer'
import { DirectiveChips } from './DirectiveChips'

export const Composer: React.FC = () => {
  const activeSessionId = useStore($activeSessionId)
  const composerDraft = useStore($composerDraft)
  const [prompt, setPrompt] = useState('')
  const [model] = useState('gemini-2.5-flash')
  const [effort, setEffort] = useState<'low' | 'medium' | 'high'>('medium')
  const [chips, setChips] = useState<Array<{ id: string; label: string; type: 'file' | 'slash' | 'shell' }>>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [prompt])

  const handleSend = async () => {
    if (!prompt.trim() || !activeSessionId) return
    const currentPrompt = prompt
    setPrompt('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    // Add user message optimistically
    appendUserMessage(activeSessionId, currentPrompt)
    $streamingState.set({
      isStreaming: true,
      currentTokens: '',
      currentReasoning: '',
      activeToolName: null,
      activeToolArgs: null,
    })

    try {
      // Primary: Send over live WebSocket Gateway (JSON-RPC 2.0)
      const res = await gateway.call('prompt.submit', {
        session_id: activeSessionId,
        prompt: currentPrompt,
        reasoning_effort: effort,
      }).catch(async () => {
        // Fallback: REST API
        return await api.sendPrompt(activeSessionId, currentPrompt, effort)
      })

      if (res && res.response) {
        appendAssistantMessage(activeSessionId, res.response)
      }
    } catch (e: any) {
      appendAssistantMessage(activeSessionId, `Error: ${e.message || 'Failed to complete turn'}`)
    } finally {
      $streamingState.set({
        isStreaming: false,
        currentTokens: '',
        currentReasoning: '',
        activeToolName: null,
        activeToolArgs: null,
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="w-full bg-[#faf8f5] flex flex-col">
      <StatusDrawer />

      {/* Centered Composer Container */}
      <div className="w-full max-w-[900px] mx-auto px-4 pb-4 pt-1 flex flex-col">
        <DirectiveChips chips={chips} onRemove={(id) => setChips(chips.filter((c) => c.id !== id))} />

        {/* Focal Artifact: Perplexity Style Search Box */}
        <div className="w-full bg-[#ffffff] border border-[#d1d1cd] focus-within:border-[#016a71] rounded-[16px] shadow-[var(--shadow-subtle)] focus-within:shadow-[0_0_0_3px_rgba(1,106,113,0.12),var(--shadow-subtle)] transition-all p-3 flex flex-col">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Sirona anything, inspect code, run commands... (Enter to send)"
            rows={1}
            className="w-full bg-transparent text-[15px] text-[#27251e] placeholder:text-[#72706b] outline-none resize-none font-normal leading-relaxed px-1"
          />

          {/* Bottom Controls inside the search input */}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#f0eee9]">
            {/* Pill chips: Model & Reasoning Effort */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#faf8f5] hover:bg-[#f5f3ef] border border-[#d1d1cd] text-[#27251e] text-[13px] font-normal transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#016a71]" />
                <span>{model}</span>
                <ChevronDown className="w-3 h-3 text-[#72706b]" />
              </button>

              <button
                type="button"
                onClick={() =>
                  setEffort(effort === 'low' ? 'medium' : effort === 'medium' ? 'high' : 'low')
                }
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#faf8f5] hover:bg-[#f5f3ef] border border-[#d1d1cd] text-[#72706b] hover:text-[#27251e] text-[13px] font-normal transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-[#72706b]" />
                <span>Effort:</span>
                <span className="capitalize font-medium text-[#27251e]">{effort}</span>
              </button>
            </div>

            {/* Right controls: Attach, Voice, Send */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="p-1.5 text-[#72706b] hover:text-[#27251e] hover:bg-[#f5f3ef] rounded-[6px] transition-colors cursor-pointer"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 text-[#72706b] hover:text-[#27251e] hover:bg-[#f5f3ef] rounded-[6px] transition-colors cursor-pointer"
                title="Voice input"
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={!prompt.trim()}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all cursor-pointer ${
                  prompt.trim()
                    ? 'bg-[#016a71] text-white hover:bg-[#01585e] shadow-[var(--shadow-subtle)]'
                    : 'bg-[#e2e2de] text-[#92918b] cursor-not-allowed opacity-60'
                }`}
                title="Send query"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
