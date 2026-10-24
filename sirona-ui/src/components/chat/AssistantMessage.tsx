import React, { useState } from 'react'
import { Sparkles, Brain, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'

export interface AssistantMessageProps {
  content: string
  reasoning?: string
}

export const AssistantMessage: React.FC<AssistantMessageProps> = ({ content, reasoning }) => {
  const [reasoningOpen, setReasoningOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
        </div>
        <button
          onClick={handleCopy}
          className="p-1.5 text-[#72706b] hover:text-[#27251e] hover:bg-[#f5f3ef] transition-colors rounded-[6px] cursor-pointer"
          title="Copy Response"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#016a71]" /> : <Copy className="w-3.5 h-3.5 text-[#72706b]" />}
        </button>
      </div>

      {/* Reasoning Accordion */}
      {reasoning && (
        <div className="mb-3 border border-[#d1d1cd] bg-[#fdfbfa] rounded-[12px] overflow-hidden shadow-[var(--shadow-subtle)]">
          <button
            onClick={() => setReasoningOpen(!reasoningOpen)}
            className="w-full flex items-center gap-2 px-3.5 py-2 text-[12px] text-[#72706b] hover:text-[#27251e] select-none text-left cursor-pointer transition-colors"
          >
            <Brain className="w-3.5 h-3.5 text-[#016a71]" />
            <span className="font-medium">Reasoning Process</span>
            {reasoningOpen ? (
              <ChevronDown className="w-3 h-3 ml-auto text-[#72706b]" />
            ) : (
              <ChevronRight className="w-3 h-3 ml-auto text-[#72706b]" />
            )}
          </button>
          {reasoningOpen && (
            <div className="px-3.5 pb-3 pt-2 text-[12px] text-[#72706b] whitespace-pre-wrap font-mono border-t border-[#d1d1cd] bg-[#faf8f5] leading-relaxed">
              {reasoning}
            </div>
          )}
        </div>
      )}

      {/* Assistant Content Prose */}
      <div className="text-[14px] text-[#27251e] leading-[1.6] font-normal">
        {renderFormattedMarkdown(content)}
      </div>
    </div>
  )
}
