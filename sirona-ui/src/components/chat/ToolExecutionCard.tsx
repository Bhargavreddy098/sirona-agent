import React, { useState, useEffect } from 'react'
import {
  Terminal,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  FileCode,
  GitBranch,
  Globe,
  Code2,
  Copy,
  Check,
  XCircle,
  Clock,
} from 'lucide-react'
import { RunTicker } from './RunTicker'

export interface ToolExecutionCardProps {
  toolName: string
  toolCallId?: string
  args?: Record<string, any>
  result?: string
  durationMs?: number
  isRunning?: boolean
  status?: 'running' | 'completed' | 'denied' | 'error'
  startedAt?: number
}

function getToolIcon(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes('git')) {
    return <GitBranch className="w-3.5 h-3.5 text-[#016a71]" />
  }
  if (lower.includes('file') || lower.includes('dir')) {
    return <FileCode className="w-3.5 h-3.5 text-[#016a71]" />
  }
  if (lower.includes('web') || lower.includes('search') || lower.includes('scrape')) {
    return <Globe className="w-3.5 h-3.5 text-[#016a71]" />
  }
  if (lower.includes('python') || lower.includes('repl')) {
    return <Code2 className="w-3.5 h-3.5 text-[#016a71]" />
  }
  return <Terminal className="w-3.5 h-3.5 text-[#016a71]" />
}

export const ToolExecutionCard: React.FC<ToolExecutionCardProps> = ({
  toolName,
  toolCallId,
  args,
  result,
  durationMs,
  isRunning = false,
  status,
  startedAt,
}) => {
  const [expanded, setExpanded] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [copiedArgs, setCopiedArgs] = useState(false)
  const [copiedResult, setCopiedResult] = useState(false)

  // Live timer tick during active running
  useEffect(() => {
    if (!isRunning) {
      return
    }
    const start = startedAt || Date.now()
    const timer = setInterval(() => {
      setElapsedMs(Date.now() - start)
    }, 100)

    return () => clearInterval(timer)
  }, [isRunning, startedAt])

  const handleCopyArgs = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!args) return
    navigator.clipboard.writeText(JSON.stringify(args, null, 2))
    setCopiedArgs(true)
    setTimeout(() => setCopiedArgs(false), 2000)
  }

  const handleCopyResult = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!result) return
    navigator.clipboard.writeText(result)
    setCopiedResult(true)
    setTimeout(() => setCopiedResult(false), 2000)
  }

  const isDenied = status === 'denied' || result === 'Execution Denied by User.'
  const isError = status === 'error' || (result && result.startsWith('Execution error'))

  return (
    <div
      data-testid="tool-execution-card"
      data-tool-name={toolName}
      data-tool-call-id={toolCallId}
      className="my-2.5 border border-[#d1d1cd] bg-[#fdfbfa] hover:bg-[#ffffff] rounded-[16px] transition-all duration-150 overflow-hidden text-[13px] shadow-[var(--shadow-subtle)]"
    >
      {/* Header bar */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-[#72706b] shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[#72706b] shrink-0" />
          )}
          <span className="shrink-0">{getToolIcon(toolName)}</span>
          <span className="font-mono font-medium text-[#27251e] shrink-0">{toolName}</span>
          {args && (
            <span className="text-[#72706b] truncate max-w-sm font-mono text-[11px] bg-[#f5f3ef] px-2 py-0.5 rounded-[6px] border border-[#d1d1cd]">
              {JSON.stringify(args)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isRunning ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[#016a71] flex items-center gap-1">
                <Clock className="w-3 h-3 animate-pulse" />
                {(elapsedMs / 1000).toFixed(1)}s
              </span>
              <RunTicker />
            </div>
          ) : isDenied ? (
            <div className="flex items-center gap-1 text-[11px] font-mono text-[#901300] bg-[#fcedea] px-2 py-0.5 rounded-full border border-[#f5c6cb]">
              <XCircle className="w-3 h-3" />
              <span>Denied</span>
            </div>
          ) : isError ? (
            <div className="flex items-center gap-1 text-[11px] font-mono text-[#901300] bg-[#fcedea] px-2 py-0.5 rounded-full border border-[#f5c6cb]">
              <XCircle className="w-3 h-3" />
              <span>Failed</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[#016a71]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {durationMs !== undefined && (
                <span className="text-[11px] text-[#92918b] font-mono">{durationMs}ms</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Output Body */}
      {expanded && (
        <div className="px-3.5 pb-3.5 pt-2 border-t border-[#d1d1cd] bg-[#faf8f5] font-mono text-[12px]">
          {args && Object.keys(args).length > 0 && (
            <div className="mb-2.5">
              <div className="flex items-center justify-between text-[#72706b] mb-1 font-medium uppercase text-[10px] tracking-wider">
                <span>Arguments:</span>
                <button
                  type="button"
                  onClick={handleCopyArgs}
                  className="flex items-center gap-1 hover:text-[#27251e] transition-colors cursor-pointer text-[11px]"
                >
                  {copiedArgs ? <Check className="w-3 h-3 text-[#016a71]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedArgs ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="text-[#27251e] bg-[#fdfbfa] p-2.5 rounded-[12px] border border-[#d1d1cd] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}
          {result !== undefined && (
            <div>
              <div className="flex items-center justify-between text-[#72706b] mb-1 font-medium uppercase text-[10px] tracking-wider">
                <span>Output:</span>
                <button
                  type="button"
                  onClick={handleCopyResult}
                  className="flex items-center gap-1 hover:text-[#27251e] transition-colors cursor-pointer text-[11px]"
                >
                  {copiedResult ? <Check className="w-3 h-3 text-[#016a71]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedResult ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre
                className={`p-2.5 rounded-[12px] border overflow-x-auto whitespace-pre-wrap max-h-60 leading-relaxed ${
                  isDenied || isError
                    ? 'bg-[#fff5f5] text-[#901300] border-[#f5c6cb]'
                    : 'bg-[#fdfbfa] text-[#27251e] border-[#d1d1cd]'
                }`}
              >
                {result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
