import React, { useState, useEffect } from 'react'
import { FileCode, Check, GitCommit, RefreshCw } from 'lucide-react'
import { api } from '../../api/client'

export type DiffKind = 'add' | 'context' | 'remove'

export interface ParsedDiffLine {
  kind: DiffKind
  text: string
  oldNo?: number
  newNo?: number
}

const FALLBACK_DIFF = `diff --git a/sirona/database/connection.py b/sirona/database/connection.py
index 48a2bc1..9d04ef2 100644
--- a/sirona/database/connection.py
+++ b/sirona/database/connection.py
@@ -14,7 +14,8 @@ class DatabaseManager:
     def initialize(self):
-        self.conn.execute("PRAGMA journal_mode = DELETE;")
+        # Enable Write-Ahead Logging for high concurrent read performance
+        self.conn.execute("PRAGMA journal_mode = WAL;")
+        self.conn.execute("PRAGMA synchronous = NORMAL;")
         self.conn.execute("PRAGMA foreign_keys = ON;")
         self.conn.execute("PRAGMA busy_timeout = 5000;")
`

export function parseUnifiedDiff(rawDiff: string): ParsedDiffLine[] {
  const lines = rawDiff.split('\n')
  const result: ParsedDiffLine[] = []
  let oldLine = 0
  let newLine = 0
  let inHunk = false

  for (const line of lines) {
    if (
      line.startsWith('diff --git') ||
      line.startsWith('index ') ||
      line.startsWith('--- ') ||
      line.startsWith('+++ ')
    ) {
      continue
    }

    if (line.startsWith('@@')) {
      inHunk = true
      const match = line.match(/@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/)
      if (match) {
        oldLine = parseInt(match[1], 10)
        newLine = parseInt(match[2], 10)
      }
      continue
    }

    if (!inHunk) continue

    if (line.startsWith('+')) {
      result.push({
        kind: 'add',
        text: line.slice(1),
        newNo: newLine++,
      })
    } else if (line.startsWith('-')) {
      result.push({
        kind: 'remove',
        text: line.slice(1),
        oldNo: oldLine++,
      })
    } else if (line.startsWith(' ') || line === '') {
      result.push({
        kind: 'context',
        text: line.startsWith(' ') ? line.slice(1) : line,
        oldNo: oldLine++,
        newNo: newLine++,
      })
    }
  }

  return result
}

export const DiffReviewView: React.FC = () => {
  const [rawDiff, setRawDiff] = useState<string>(FALLBACK_DIFF)
  const [statusText, setStatusText] = useState<string>('Working Tree')
  const [loading, setLoading] = useState(false)

  const fetchDiff = async () => {
    setLoading(true)
    try {
      const res = await api.executeTool('git_diff')
      if (res.success && res.result?.diff?.trim()) {
        setRawDiff(res.result.diff)
        setStatusText('Working Tree Unstaged Changes')
      } else {
        const stagedRes = await api.executeTool('git_diff', { staged: true })
        if (stagedRes.success && stagedRes.result?.diff?.trim()) {
          setRawDiff(stagedRes.result.diff)
          setStatusText('Staged Changes')
        } else {
          setRawDiff(FALLBACK_DIFF)
          setStatusText('Working Tree Clean (Showing Reference Patch)')
        }
      }
    } catch (e) {
      // Fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDiff()
  }, [])

  const diffLines = parseUnifiedDiff(rawDiff)

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#faf8f5] flex flex-col font-sans select-text">
      {/* File header pill */}
      <div className="flex items-center justify-between mb-3 px-3 py-2 bg-[#fdfbfa] border border-[#d1d1cd] rounded-[12px] shadow-[var(--shadow-subtle)]">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-[#016a71]" />
          <span className="font-mono text-[12px] font-medium text-[#27251e] truncate">
            Working Tree Diff
          </span>
        </div>
        <button
          onClick={fetchDiff}
          disabled={loading}
          className="p-1 hover:bg-[#f5f3ef] rounded text-[#72706b] hover:text-[#27251e] transition-colors cursor-pointer"
          title="Refresh Git Diff"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Unified Diff Box (Cursor / Hermes style 2px gutter accents) */}
      <div className="rounded-[16px] border border-[#d1d1cd] bg-[#fdfbfa] shadow-[var(--shadow-subtle)] overflow-hidden font-mono text-[12px]">
        <div className="overflow-x-auto">
          {diffLines.map((line, idx) => {
            let rowStyle = 'border-l-2 border-transparent text-[#72706b]'
            if (line.kind === 'add') {
              rowStyle = 'border-l-2 border-[#016a71] bg-[rgba(1,106,113,0.06)] text-[#016a71]'
            } else if (line.kind === 'remove') {
              rowStyle = 'border-l-2 border-[#b91c1c] bg-[rgba(185,28,28,0.06)] text-[#991b1b]'
            }

            return (
              <div
                key={idx}
                className={`flex items-start px-2 py-0.5 leading-relaxed hover:bg-[rgba(0,0,0,0.02)] ${rowStyle}`}
              >
                {/* Line numbers column */}
                <span className="w-8 shrink-0 text-right pr-2 text-[10px] text-[#92918b] select-none font-mono">
                  {line.oldNo ?? ''}
                </span>
                <span className="w-8 shrink-0 text-right pr-3 text-[10px] text-[#92918b] select-none font-mono">
                  {line.newNo ?? ''}
                </span>

                {/* Diff kind marker prefix */}
                <span className="w-4 shrink-0 text-[11px] select-none font-bold">
                  {line.kind === 'add' ? '+' : line.kind === 'remove' ? '-' : ' '}
                </span>

                {/* Diff content line */}
                <span className="flex-1 whitespace-pre">{line.text || ' '}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 px-2 text-[11px] text-[#72706b]">
        <div className="flex items-center gap-1.5">
          <GitCommit className="w-3.5 h-3.5 text-[#016a71]" />
          <span>{statusText}</span>
        </div>
        <div className="flex items-center gap-1 text-[#016a71]">
          <Check className="w-3.5 h-3.5" />
          <span>Synchronized</span>
        </div>
      </div>
    </div>
  )
}
