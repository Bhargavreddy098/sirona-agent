import React, { useState, useEffect } from 'react'
import { Sparkles, Brain, ChevronDown, ChevronRight, Copy, Check, Loader2, AlertCircle } from 'lucide-react'

export interface AssistantMessageProps {
  content: string
  reasoning?: string
  isStreaming?: boolean
  isReasoningStreaming?: boolean
  interrupted?: boolean
}

export const AssistantMessage: React.FC<AssistantMessageProps> = ({
  content,
  reasoning,
  isStreaming = false,
  isReasoningStreaming = false,
  interrupted = false,
}) => {
  // If actively reasoning, keep accordion open by default
  const [reasoningOpen, setReasoningOpen] = useState(Boolean(isReasoningStreaming))
  const [copied, setCopied] = useState(false)
  const [copiedReasoning, setCopiedReasoning] = useState(false)

  useEffect(() => {
    if (isReasoningStreaming) {
      setReasoningOpen(true)
    }
  }, [isReasoningStreaming])

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyReasoning = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!reasoning) return
    navigator.clipboard.writeText(reasoning)
    setCopiedReasoning(true)
    setTimeout(() => setCopiedReasoning(false), 2000)
  }

  const wordCount = reasoning ? reasoning.trim().split(/\s+/).filter(Boolean).length : 0

  // Parse markdown blocks (code blocks, headings, lists, bold)
  const renderFormattedMarkdown = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g)

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n')
        const language = lines[0].match(/^[a-z0-9_-]+$/i) ? lines[0] : ''
        const codeContent = language ? lines.slice(1).join('\n') : lines.join('\n')

        return (
          <div
            key={index}
            className="my-3 rounded-[12px] border border-[#d1d1cd] bg-[#fdfbfa] overflow-hidden shadow-[var(--shadow-subtle)] font-mono text-[12px]"
          >
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#faf8f5] border-b border-[#d1d1cd] text-[11px] text-[#72706b]">
              <span className="font-medium text-[#016a71] uppercase tracking-wider">
                {language || 'code'}
              </span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(codeContent)}
                className="flex items-center gap-1 hover:text-[#27251e] transition-colors cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>
            <pre className="p-3.5 text-[#27251e] overflow-x-auto leading-relaxed whitespace-pre font-mono">
              {codeContent}
            </pre>
          </div>
        )
      }

      // Paragraphs / Markdown elements
      return (
        <div key={index} className="space-y-2">
          {part.split('\n\n').map((paragraph, pIdx) => {
            const lines = paragraph.split('\n')

            return (
              <div key={pIdx}>
                {lines.map((line, lIdx) => {
                  if (line.startsWith('### ')) {
                    return (
                      <h3 key={lIdx} className="text-[16px] font-medium text-[#27251e] mt-3 mb-1.5">
                        {line.slice(4)}
                      </h3>
                    )
                  }
                  if (line.startsWith('## ')) {
                    return (
                      <h2 key={lIdx} className="text-[18px] font-medium text-[#27251e] mt-4 mb-2">
                        {line.slice(3)}
                      </h2>
                    )
                  }
                  if (line.startsWith('- ') || line.startsWith('* ')) {
                    return (
                      <div key={lIdx} className="flex items-start gap-2 pl-2 my-1 text-[14px]">
                        <span className="text-[#016a71] mt-1 text-xs">•</span>
                        <span>{renderInline(line.slice(2))}</span>
                      </div>
                    )
                  }
                  return (
                    <p key={lIdx} className="my-1 leading-relaxed text-[14px]">
                      {renderInline(line)}
                    </p>
                  )
                })}
              </div>
            )
          })}
        </div>
      )
    })
  }

  const renderInline = (str: string) => {
    // Render inline code `code` and bold **bold**
    const tokens = str.split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
    return tokens.map((t, idx) => {
      if (t.startsWith('`') && t.endsWith('`')) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 rounded-[4px] bg-[#f5f3ef] border border-[#d1d1cd] font-mono text-[12px] text-[#016a71]"
          >
            {t.slice(1, -1)}
          </code>
        )
      }
      if (t.startsWith('**') && t.endsWith('**')) {
        return (
          <strong key={idx} className="font-medium text-[#27251e]">
            {t.slice(2, -2)}
          </strong>
        )
      }
      return t
    })
  }

  return (
    <div className="flex flex-col my-5 select-text font-sans">
      {/* Sirona Header Indicator */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-[14px] font-medium text-[#27251e]">
          <span className="p-1 rounded-full bg-[#fdfbfa] border border-[#d1d1cd] shadow-[var(--shadow-subtle)]">
            <Sparkles className="w-3.5 h-3.5 text-[#016a71]" />
          </span>
          <span>Sirona</span>
          {interrupted && (
            <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#fcedea] text-[#901300] border border-[#f5c6cb]">
              <AlertCircle className="w-3 h-3" />
              Interrupted
            </span>
          )}
        </div>
        {content && !isStreaming && (
          <button
            onClick={handleCopy}
            className="p-1.5 text-[#72706b] hover:text-[#27251e] hover:bg-[#f5f3ef] transition-colors rounded-[6px] cursor-pointer"
            title="Copy Response"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#016a71]" /> : <Copy className="w-3.5 h-3.5 text-[#72706b]" />}
          </button>
        )}
      </div>

      {/* Reasoning Collapser Accordion */}
      {reasoning && (
        <div className="mb-3 border border-[#d1d1cd] bg-[#fdfbfa] rounded-[14px] overflow-hidden shadow-[var(--shadow-subtle)] transition-all">
          <div
            onClick={() => setReasoningOpen(!reasoningOpen)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-[12px] text-[#72706b] hover:text-[#27251e] select-none text-left cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <Brain className={`w-3.5 h-3.5 ${isReasoningStreaming ? 'text-[#016a71] animate-pulse' : 'text-[#72706b]'}`} />
              <span className="font-medium">
                {isReasoningStreaming ? 'Thinking...' : 'Reasoning Process'}
              </span>
              <span className="text-[11px] text-[#92918b] font-mono">
                ({wordCount} words{isReasoningStreaming ? ', streaming' : ''})
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isReasoningStreaming && (
                <Loader2 className="w-3 h-3 text-[#016a71] animate-spin" />
              )}
              <button
                type="button"
                onClick={handleCopyReasoning}
                title="Copy Reasoning"
                className="hover:text-[#27251e] p-1 rounded transition-colors"
              >
                {copiedReasoning ? <Check className="w-3 h-3 text-[#016a71]" /> : <Copy className="w-3 h-3" />}
              </button>
              {reasoningOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-[#72706b]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[#72706b]" />
              )}
            </div>
          </div>

          {reasoningOpen && (
            <div className="px-3.5 pb-3.5 pt-2 text-[12px] text-[#55534e] whitespace-pre-wrap font-mono border-t border-[#d1d1cd] bg-[#faf8f5] leading-relaxed max-h-80 overflow-y-auto">
              {reasoning}
            </div>
          )}
        </div>
      )}

      {/* Assistant Content Prose */}
      {content && (
        <div className="text-[14px] text-[#27251e] leading-[1.6] font-normal">
          {renderFormattedMarkdown(content)}
        </div>
      )}
    </div>
  )
}
