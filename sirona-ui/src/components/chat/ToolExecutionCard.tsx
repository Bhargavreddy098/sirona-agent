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
    return <GitBranch className="w-3.5 h-3.5 text-[var(--dt-primary)]" />
  }
  if (lower.includes('file') || lower.includes('dir')) {
    return <FileCode className="w-3.5 h-3.5 text-[var(--dt-primary)]" />
  }
  if (lower.includes('web') || lower.includes('search') || lower.includes('scrape')) {
    return <Globe className="w-3.5 h-3.5 text-[var(--dt-primary)]" />
  }
  if (lower.includes('python') || lower.includes('repl')) {
    return <Code2 className="w-3.5 h-3.5 text-[var(--dt-primary)]" />
  }
  return <Terminal className="w-3.5 h-3.5 text-[var(--dt-primary)]" />
}

export const ToolExecutionCard: React.FC<ToolExecutionCardProps> = ({
  toolName,
  toolCallId: _toolCallId,
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

  // Live timer for active running tool
  useEffect(() => {
    if (!isRunning || !startedAt) return
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startedAt)
    }, 100)
    return () => clearInterval(interval)
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

  const isError = status === 'error'
  const isDenied = status === 'denied'

  return (
    <div className="mb-2.5 border border-[var(--dt-border)] bg-[var(--dt-card)] rounded-[12px] overflow-hidden shadow-[var(--shadow-subtle)] transition-all">
      {/* Header Bar */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-3.5 py-2 text-[12.5px] cursor-pointer hover:bg-[var(--dt-background)] select-none transition-colors"
      >
        <div className="flex items-center gap-2 truncate">
          <button type="button" className="text-[var(--dt-muted-foreground)] p-0.5">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          <span className="p-1 rounded-[6px] bg-[var(--dt-background)] border border-[var(--dt-border)]">
            {getToolIcon(toolName)}
          </span>
          <span className="font-mono text-[12px] font-medium text-[var(--dt-foreground)] truncate">
            {toolName}
          </span>
          {args && args.command && (
            <span className="text-[11px] font-mono text-[var(--dt-muted-foreground)] truncate max-w-xs">
              {args.command}
            </span>
          )}
          {args && args.path && (
            <span className="text-[11px] font-mono text-[var(--dt-muted-foreground)] truncate max-w-xs">
              {args.path}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isRunning ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[var(--dt-primary)] flex items-center gap-1">
                <Clock className="w-3 h-3 animate-pulse" />
                {(elapsedMs / 1000).toFixed(1)}s
              </span>
              <RunTicker />
            </div>
          ) : isDenied ? (
            <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--dt-destructive)] bg-[#ffebe9] px-2 py-0.5 rounded-full border border-[#ff8182]/30">
              <XCircle className="w-3 h-3" />
              <span>Denied</span>
            </div>
          ) : isError ? (
            <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--dt-destructive)] bg-[#ffebe9] px-2 py-0.5 rounded-full border border-[#ff8182]/30">
              <XCircle className="w-3 h-3" />
              <span>Failed</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[#1a7f37]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {durationMs !== undefined && (
                <span className="text-[11px] text-[var(--dt-muted-foreground)] font-mono">{durationMs}ms</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Output Body */}
      {expanded && (
        <div className="px-3.5 pb-3.5 pt-2 border-t border-[var(--dt-border)] bg-[var(--dt-background)] font-mono text-[12px]">
          {args && Object.keys(args).length > 0 && (
            <div className="mb-2.5">
              <div className="flex items-center justify-between text-[var(--dt-muted-foreground)] mb-1 font-semibold uppercase text-[10px] tracking-wider">
                <span>Arguments:</span>
                <button
                  type="button"
                  onClick={handleCopyArgs}
                  className="flex items-center gap-1 hover:text-[var(--dt-foreground)] transition-colors cursor-pointer text-[11px]"
                >
                  {copiedArgs ? <Check className="w-3 h-3 text-[var(--dt-primary)]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedArgs ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="text-[var(--dt-foreground)] bg-[var(--dt-card)] p-2.5 rounded-[8px] border border-[var(--dt-border)] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}
          {result !== undefined && (
            <div>
              <div className="flex items-center justify-between text-[var(--dt-muted-foreground)] mb-1 font-semibold uppercase text-[10px] tracking-wider">
                <span>Output:</span>
                <button
                  type="button"
                  onClick={handleCopyResult}
                  className="flex items-center gap-1 hover:text-[var(--dt-foreground)] transition-colors cursor-pointer text-[11px]"
                >
                  {copiedResult ? <Check className="w-3 h-3 text-[var(--dt-primary)]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedResult ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre
                className={`p-2.5 rounded-[8px] border overflow-x-auto whitespace-pre-wrap max-h-60 leading-relaxed ${
                  isDenied || isError
                    ? 'bg-[#ffebe9] text-[var(--dt-destructive)] border-[#ff8182]/30'
                    : 'bg-[var(--dt-card)] text-[var(--dt-foreground)] border-[var(--dt-border)]'
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
