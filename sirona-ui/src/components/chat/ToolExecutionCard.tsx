import React, { useState } from 'react'
import { Terminal, CheckCircle2, ChevronRight, ChevronDown } from 'lucide-react'
import { RunTicker } from './RunTicker'

export interface ToolExecutionCardProps {
  toolName: string
  toolCallId?: string
  args?: Record<string, any>
  result?: string
  durationMs?: number
  isRunning?: boolean
}

export const ToolExecutionCard: React.FC<ToolExecutionCardProps> = ({
  toolName,
  args,
  result,
  durationMs,
  isRunning = false,
}) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="my-2.5 border border-[#d1d1cd] bg-[#fdfbfa] hover:bg-[#ffffff] rounded-[16px] transition-all duration-150 overflow-hidden text-[13px] shadow-[var(--shadow-subtle)]">
      {/* Header bar */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-[#72706b]" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[#72706b]" />
          )}
          <Terminal className="w-3.5 h-3.5 text-[#016a71]" />
          <span className="font-mono font-medium text-[#27251e]">{toolName}</span>
          {args && (
            <span className="text-[#72706b] truncate max-w-sm font-mono text-[12px]">
              {JSON.stringify(args)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isRunning ? (
            <RunTicker />
          ) : (
            <div className="flex items-center gap-1.5 text-[#016a71]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {durationMs && (
                <span className="text-[11px] text-[#92918b] font-mono">{durationMs}ms</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Output Body */}
      {expanded && (
        <div className="px-3.5 pb-3.5 pt-2 border-t border-[#d1d1cd] bg-[#faf8f5] font-mono text-[12px]">
          {args && (
            <div className="mb-2.5">
              <div className="text-[#72706b] mb-1 font-medium uppercase text-[10px] tracking-wider">Arguments:</div>
              <pre className="text-[#27251e] bg-[#fdfbfa] p-2.5 rounded-[12px] border border-[#d1d1cd] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}
          {result && (
            <div>
              <div className="text-[#72706b] mb-1 font-medium uppercase text-[10px] tracking-wider">Output:</div>
              <pre className="text-[#27251e] bg-[#fdfbfa] p-2.5 rounded-[12px] border border-[#d1d1cd] overflow-x-auto whitespace-pre-wrap max-h-60 leading-relaxed">
                {result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
