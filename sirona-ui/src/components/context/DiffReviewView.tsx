import React, { useEffect, useState } from 'react'
import {
  GitCommit,
  GitBranch as GitBranchIcon,
  RefreshCw,
  Plus,
  Minus,
  RotateCcw,
  Check,
  FolderGit2,
  ChevronDown,
  ChevronRight,
  FileText,
  Send,
  AlertCircle,
  X,
} from 'lucide-react'
import { useStore } from '@nanostores/react'
import {
  $repoStatus,
  $branches,
  $worktrees,
  $selectedDiffFile,
  $activeDiffScope,
  $currentDiff,
  $isGitLoading,
  $gitCommitMessage,
  $worktreeModalOpen,
  refreshGitStatus,
  refreshBranches,
  refreshWorktrees,
  fetchDiff,
  stageFile,
  unstageFile,
  discardChanges,
  commitChanges,
  switchBranch,
  addWorktree,
  removeWorktree,
  setSelectedDiffFile,
  setActiveDiffScope,
  setGitCommitMessage,
  setWorktreeModalOpen,
  type DiffScope,
} from '../../store/gitStore'

export type DiffKind = 'add' | 'context' | 'remove' | 'header'

export interface ParsedDiffLine {
  kind: DiffKind
  text: string
  oldNo?: number
  newNo?: number
}

export function parseUnifiedDiff(rawDiff: string): ParsedDiffLine[] {
  if (!rawDiff || !rawDiff.trim()) return []

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
      line.startsWith('+++ ') ||
      line.startsWith('new file mode') ||
      line.startsWith('deleted file mode')
    ) {
      result.push({ kind: 'header', text: line })
      inHunk = false
      continue
    }

    if (line.startsWith('@@')) {
      inHunk = true
      const match = line.match(/@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/)
      if (match) {
        oldLine = parseInt(match[1], 10)
        newLine = parseInt(match[2], 10)
      }
      result.push({ kind: 'header', text: line })
      continue
    }

    if (!inHunk) {
      result.push({ kind: 'header', text: line })
      continue
    }

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
    } else {
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
  const repoStatus = useStore($repoStatus)
  const branches = useStore($branches)
  const worktrees = useStore($worktrees)
  const selectedFile = useStore($selectedDiffFile)
  const activeScope = useStore($activeDiffScope)
  const rawDiff = useStore($currentDiff)
  const isLoading = useStore($isGitLoading)
  const commitMsg = useStore($gitCommitMessage)
  const worktreeModalOpen = useStore($worktreeModalOpen)

  const [stagedExpanded, setStagedExpanded] = useState(true)
  const [unstagedExpanded, setUnstagedExpanded] = useState(true)
  const [untrackedExpanded, setUntrackedExpanded] = useState(true)
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false)
  const [newBranchInput, setNewBranchInput] = useState('')
  const [isCreatingBranch, setIsCreatingBranch] = useState(false)
  const [commitStatus, setCommitStatus] = useState<string | null>(null)

  // Worktree form state
  const [wtPath, setWtPath] = useState('')
  const [wtBranch, setWtBranch] = useState('')
  const [wtNewBranch, setWtNewBranch] = useState(true)

  useEffect(() => {
    refreshGitStatus()
    refreshBranches()
    refreshWorktrees()
    fetchDiff(null, 'all')
  }, [])

  const handleRefresh = async () => {
    await refreshGitStatus()
    await refreshBranches()
    await refreshWorktrees()
    await fetchDiff(selectedFile, activeScope)
  }

  const handleCommit = async (push = false) => {
    if (!commitMsg.trim()) return
    setCommitStatus('Committing...')
    // If no staged changes but unstaged exist, stage all first
    if ((repoStatus?.staged.length ?? 0) === 0 && (repoStatus?.unstaged.length ?? 0) > 0) {
      await stageFile()
    }
    const res = await commitChanges(commitMsg, push)
    if (res.success) {
      setCommitStatus(push ? 'Committed and pushed successfully' : `Committed ${res.commit_hash}`)
      setTimeout(() => setCommitStatus(null), 4000)
    } else {
      setCommitStatus(`Error: ${res.error}`)
    }
  }

  const handleSwitchBranch = async (branchName: string) => {
    setBranchDropdownOpen(false)
    await switchBranch(branchName)
  }

  const handleCreateBranch = async () => {
    if (!newBranchInput.trim()) return
    await switchBranch(newBranchInput.trim(), true)
    setNewBranchInput('')
    setIsCreatingBranch(false)
    setBranchDropdownOpen(false)
  }

  const handleAddWorktree = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wtPath.trim()) return
    await addWorktree(wtPath.trim(), wtBranch.trim() || undefined, undefined, wtNewBranch)
    setWtPath('')
    setWtBranch('')
  }

  const diffLines = parseUnifiedDiff(rawDiff)
  const stagedCount = repoStatus?.staged.length ?? 0
  const unstagedCount = repoStatus?.unstaged.length ?? 0
  const untrackedCount = repoStatus?.untracked.length ?? 0
  const totalChanges = stagedCount + unstagedCount + untrackedCount

  return (
    <div className="flex-1 overflow-hidden bg-[var(--dt-sidebar)] flex flex-col font-sans select-text">
      {/* Top Action Bar */}
      <div className="px-3 py-2 border-b border-[var(--dt-border)] bg-[var(--dt-card)] flex items-center justify-between shrink-0">
        {/* Branch pill with switcher */}
        <div className="relative">
          <button
            onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-mono bg-[var(--dt-sidebar)] hover:bg-[var(--dt-sidebar-accent)] border border-[var(--dt-border)] rounded-[8px] text-[var(--dt-foreground)] cursor-pointer transition-colors"
          >
            <GitBranchIcon className="w-3.5 h-3.5 text-[var(--dt-primary)]" />
            <span className="font-semibold max-w-[130px] truncate">
              {repoStatus?.branch || 'main'}
            </span>
            {(repoStatus?.ahead ?? 0) > 0 && (
              <span className="text-[10px] text-[var(--dt-primary)] font-bold">↑{repoStatus?.ahead}</span>
            )}
            {(repoStatus?.behind ?? 0) > 0 && (
              <span className="text-[10px] text-[var(--dt-danger)] font-bold">↓{repoStatus?.behind}</span>
            )}
            <ChevronDown className="w-3 h-3 text-[var(--dt-muted-foreground)]" />
          </button>

          {/* Branch dropdown */}
          {branchDropdownOpen && (
            <div className="absolute left-0 mt-1 w-64 bg-[var(--dt-card)] border border-[var(--dt-border)] rounded-[10px] shadow-lg z-50 p-2 text-[12px]">
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-[var(--dt-border)]">
                <span className="font-medium text-[var(--dt-muted-foreground)]">Branches</span>
                <button
                  onClick={() => setIsCreatingBranch(!isCreatingBranch)}
                  className="text-[11px] text-[var(--dt-primary)] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {isCreatingBranch ? 'Cancel' : 'New Branch'}
                </button>
              </div>

              {isCreatingBranch && (
                <div className="mb-2 p-1.5 bg-[var(--dt-sidebar)] rounded-[6px]">
                  <input
                    type="text"
                    placeholder="branch-name"
                    value={newBranchInput}
                    onChange={(e) => setNewBranchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
                    className="w-full px-2 py-1 text-[11px] bg-[var(--dt-card)] border border-[var(--dt-border)] rounded outline-none font-mono text-[var(--dt-foreground)]"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateBranch}
                    className="mt-1 w-full py-1 text-[11px] bg-[var(--dt-primary)] hover:bg-[var(--dt-primary-hover)] text-white rounded font-medium cursor-pointer"
                  >
                    Create & Switch
                  </button>
                </div>
              )}

              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {branches.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => handleSwitchBranch(b.name)}
                    className={`w-full text-left px-2 py-1 rounded-[6px] font-mono text-[11px] flex items-center justify-between cursor-pointer ${
                      b.is_current
                        ? 'bg-[var(--dt-sidebar-accent)] text-[var(--dt-primary)] font-semibold'
                        : 'hover:bg-[var(--dt-sidebar-accent)] text-[var(--dt-foreground)]'
                    }`}
                  >
                    <span className="truncate">{b.name}</span>
                    {b.is_current && <Check className="w-3 h-3 shrink-0 text-[var(--dt-primary)]" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right tools: Worktrees & Refresh */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setWorktreeModalOpen(true)}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] bg-[var(--dt-sidebar)] hover:bg-[var(--dt-sidebar-accent)] rounded-[6px] border border-[var(--dt-border)] cursor-pointer transition-colors"
            title="Manage Git Worktrees"
          >
            <FolderGit2 className="w-3.5 h-3.5 text-[var(--dt-primary)]" />
            <span>Worktrees ({worktrees.length})</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1.5 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-sidebar-accent)] rounded-[6px] cursor-pointer transition-colors"
            title="Refresh Git Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Scope Switcher & Filter */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--dt-border)] bg-[var(--dt-card-subtle)] text-[11px]">
        <div className="flex items-center gap-1">
          {(['all', 'staged', 'unstaged'] as DiffScope[]).map((scope) => (
            <button
              key={scope}
              onClick={() => setActiveDiffScope(scope)}
              className={`px-2 py-0.5 rounded-[5px] transition-colors cursor-pointer capitalize ${
                activeScope === scope
                  ? 'bg-[var(--dt-primary)] text-white font-medium'
                  : 'text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-sidebar-accent)]'
              }`}
            >
              {scope === 'all' ? `All (${totalChanges})` : scope === 'staged' ? `Staged (${stagedCount})` : `Unstaged (${unstagedCount + untrackedCount})`}
            </button>
          ))}
        </div>

        {selectedFile && (
          <button
            onClick={() => setSelectedDiffFile(null)}
            className="text-[10px] text-[var(--dt-primary)] hover:underline cursor-pointer flex items-center gap-0.5"
            title="View whole repository diff"
          >
            <span>Whole Diff</span>
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* Main Content: Split List and Diff View */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {/* Changed Files Rail */}
        <div className="border-b border-[var(--dt-border)] bg-[var(--dt-card)] shrink-0 max-h-48 overflow-y-auto divide-y divide-[var(--dt-border)]">
          {/* Staged Section */}
          {stagedCount > 0 && (
            <div>
              <div
                onClick={() => setStagedExpanded(!stagedExpanded)}
                className="flex items-center justify-between px-3 py-1 bg-[var(--dt-card-subtle)] cursor-pointer text-[11px] font-medium text-[var(--dt-foreground)] hover:bg-[var(--dt-sidebar-accent)]"
              >
                <div className="flex items-center gap-1.5">
                  {stagedExpanded ? <ChevronDown className="w-3 h-3 text-[var(--dt-muted-foreground)]" /> : <ChevronRight className="w-3 h-3 text-[var(--dt-muted-foreground)]" />}
                  <span>Staged Changes ({stagedCount})</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    unstageFile()
                  }}
                  className="text-[10px] text-[var(--dt-muted-foreground)] hover:text-[var(--dt-danger)] cursor-pointer"
                  title="Unstage all files"
                >
                  Unstage All
                </button>
              </div>

              {stagedExpanded && (
                <div className="divide-y divide-[var(--dt-border)]">
                  {repoStatus?.staged.map((f) => (
                    <div
                      key={`staged-${f.path}`}
                      onClick={() => setSelectedDiffFile(f.path)}
                      className={`flex items-center justify-between px-3 py-1 text-[11px] font-mono cursor-pointer transition-colors ${
                        selectedFile === f.path ? 'bg-[var(--dt-sidebar-accent)] text-[var(--dt-primary)] font-medium' : 'hover:bg-[var(--dt-sidebar-accent)] text-[var(--dt-foreground)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-3.5 h-3.5 rounded bg-[var(--dt-sidebar-accent)] text-[var(--dt-primary)] text-[9px] font-bold flex items-center justify-center shrink-0">
                          {f.status}
                        </span>
                        <span className="truncate">{f.path}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            unstageFile(f.path)
                          }}
                          className="p-1 hover:bg-[var(--dt-sidebar-accent)] rounded text-[var(--dt-muted-foreground)] hover:text-[var(--dt-danger)]"
                          title="Unstage file"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Unstaged Section */}
          {unstagedCount > 0 && (
            <div>
              <div
                onClick={() => setUnstagedExpanded(!unstagedExpanded)}
                className="flex items-center justify-between px-3 py-1 bg-[var(--dt-card-subtle)] cursor-pointer text-[11px] font-medium text-[var(--dt-foreground)] hover:bg-[var(--dt-sidebar-accent)]"
              >
                <div className="flex items-center gap-1.5">
                  {unstagedExpanded ? <ChevronDown className="w-3 h-3 text-[var(--dt-muted-foreground)]" /> : <ChevronRight className="w-3 h-3 text-[var(--dt-muted-foreground)]" />}
                  <span>Changes ({unstagedCount})</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    stageFile()
                  }}
                  className="text-[10px] text-[var(--dt-primary)] hover:underline cursor-pointer"
                  title="Stage all files"
                >
                  Stage All
                </button>
              </div>

              {unstagedExpanded && (
                <div className="divide-y divide-[var(--dt-border)]">
                  {repoStatus?.unstaged.map((f) => (
                    <div
                      key={`unstaged-${f.path}`}
                      onClick={() => setSelectedDiffFile(f.path)}
                      className={`flex items-center justify-between px-3 py-1 text-[11px] font-mono cursor-pointer transition-colors ${
                        selectedFile === f.path ? 'bg-[var(--dt-sidebar-accent)] text-[var(--dt-primary)] font-medium' : 'hover:bg-[var(--dt-sidebar-accent)] text-[var(--dt-foreground)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-3.5 h-3.5 rounded bg-[var(--dt-warning)]/15 text-[var(--dt-warning)] text-[9px] font-bold flex items-center justify-center shrink-0">
                          {f.status}
                        </span>
                        <span className="truncate">{f.path}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            stageFile(f.path)
                          }}
                          className="p-1 hover:bg-[var(--dt-sidebar-accent)] rounded text-[var(--dt-muted-foreground)] hover:text-[var(--dt-primary)]"
                          title="Stage file"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            discardChanges(f.path)
                          }}
                          className="p-1 hover:bg-[var(--dt-sidebar-accent)] rounded text-[var(--dt-muted-foreground)] hover:text-[var(--dt-danger)]"
                          title="Discard changes"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Untracked Section */}
          {untrackedCount > 0 && (
            <div>
              <div
                onClick={() => setUntrackedExpanded(!untrackedExpanded)}
                className="flex items-center justify-between px-3 py-1 bg-[var(--dt-card-subtle)] cursor-pointer text-[11px] font-medium text-[var(--dt-foreground)] hover:bg-[var(--dt-sidebar-accent)]"
              >
                <div className="flex items-center gap-1.5">
                  {untrackedExpanded ? <ChevronDown className="w-3 h-3 text-[var(--dt-muted-foreground)]" /> : <ChevronRight className="w-3 h-3 text-[var(--dt-muted-foreground)]" />}
                  <span>Untracked Files ({untrackedCount})</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    stageFile()
                  }}
                  className="text-[10px] text-[var(--dt-primary)] hover:underline cursor-pointer"
                  title="Stage all untracked"
                >
                  Stage All
                </button>
              </div>

              {untrackedExpanded && (
                <div className="divide-y divide-[var(--dt-border)]">
                  {repoStatus?.untracked.map((path) => (
                    <div
                      key={`untracked-${path}`}
                      onClick={() => setSelectedDiffFile(path)}
                      className={`flex items-center justify-between px-3 py-1 text-[11px] font-mono cursor-pointer transition-colors ${
                        selectedFile === path ? 'bg-[var(--dt-sidebar-accent)] text-[var(--dt-primary)] font-medium' : 'hover:bg-[var(--dt-sidebar-accent)] text-[var(--dt-foreground)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-3.5 h-3.5 rounded bg-[var(--dt-primary)]/15 text-[var(--dt-primary)] text-[9px] font-bold flex items-center justify-center shrink-0">
                          ?
                        </span>
                        <span className="truncate">{path}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            stageFile(path)
                          }}
                          className="p-1 hover:bg-[var(--dt-sidebar-accent)] rounded text-[var(--dt-muted-foreground)] hover:text-[var(--dt-primary)]"
                          title="Stage file"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            discardChanges(path, true)
                          }}
                          className="p-1 hover:bg-[var(--dt-sidebar-accent)] rounded text-[var(--dt-muted-foreground)] hover:text-[var(--dt-danger)]"
                          title="Delete untracked file"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {totalChanges === 0 && (
            <div className="py-4 text-center text-[12px] text-[var(--dt-muted-foreground)] flex flex-col items-center gap-1">
              <Check className="w-4 h-4 text-[var(--dt-primary)]" />
              <span>Working tree clean</span>
            </div>
          )}
        </div>

        {/* Diff Content Box */}
        <div className="flex-1 overflow-auto p-2 bg-[var(--dt-sidebar)]">
          {diffLines.length > 0 ? (
            <div className="rounded-[12px] border border-[var(--dt-border)] bg-[var(--dt-card)] shadow-[var(--shadow-subtle)] overflow-hidden font-mono text-[11px]">
              {diffLines.map((line, idx) => {
                let rowStyle = 'border-l-2 border-transparent text-[var(--dt-muted-foreground)]'
                if (line.kind === 'add') {
                  rowStyle = 'border-l-2 border-[var(--dt-primary)] bg-[var(--dt-primary)]/10 text-[var(--dt-primary)]'
                } else if (line.kind === 'remove') {
                  rowStyle = 'border-l-2 border-[var(--dt-danger)] bg-[var(--dt-danger)]/10 text-[var(--dt-danger)]'
                } else if (line.kind === 'header') {
                  rowStyle = 'border-l-2 border-[var(--dt-border)] bg-[var(--dt-card-subtle)] text-[var(--dt-foreground)] font-semibold'
                }

                return (
                  <div
                    key={idx}
                    className={`flex items-start px-2 py-0.5 leading-relaxed hover:bg-[var(--dt-sidebar-accent)]/50 ${rowStyle}`}
                  >
                    <span className="w-7 shrink-0 text-right pr-2 text-[10px] text-[var(--dt-muted-foreground)] select-none font-mono">
                      {line.oldNo ?? ''}
                    </span>
                    <span className="w-7 shrink-0 text-right pr-3 text-[10px] text-[var(--dt-muted-foreground)] select-none font-mono">
                      {line.newNo ?? ''}
                    </span>
                    <span className="w-4 shrink-0 text-[11px] select-none font-bold">
                      {line.kind === 'add' ? '+' : line.kind === 'remove' ? '-' : ' '}
                    </span>
                    <span className="flex-1 whitespace-pre overflow-x-auto">{line.text || ' '}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[var(--dt-muted-foreground)]">
              <FileText className="w-8 h-8 text-[var(--dt-border)] mb-2" />
              <p className="text-[12px]">No diff to display</p>
              <p className="text-[11px] text-[var(--dt-muted-foreground)] mt-1">Select a changed file or modify files to view git diff.</p>
            </div>
          )}
        </div>
      </div>

      {/* Commit & Ship Bar */}
      <div className="p-3 border-t border-[var(--dt-border)] bg-[var(--dt-card)] shrink-0 flex flex-col gap-2">
        {commitStatus && (
          <div className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded bg-[var(--dt-sidebar)] border border-[var(--dt-border)] text-[var(--dt-foreground)]">
            <AlertCircle className="w-3.5 h-3.5 text-[var(--dt-primary)] shrink-0" />
            <span className="truncate">{commitStatus}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Commit message (e.g. feat: add new feature)..."
            value={commitMsg}
            onChange={(e) => setGitCommitMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCommit(false)}
            className="flex-1 px-3 py-1.5 text-[12px] bg-[var(--dt-sidebar)] border border-[var(--dt-border)] rounded-[8px] outline-none focus:border-[var(--dt-primary)] text-[var(--dt-foreground)] placeholder:text-[var(--dt-muted-foreground)]"
          />
          <button
            onClick={() => handleCommit(false)}
            disabled={!commitMsg.trim() || totalChanges === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-[var(--dt-primary)] text-white rounded-[8px] hover:bg-[var(--dt-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm shrink-0"
            title="Commit staged changes"
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Commit</span>
          </button>
          <button
            onClick={() => handleCommit(true)}
            disabled={!commitMsg.trim() || totalChanges === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium bg-[var(--dt-foreground)] text-[var(--dt-background)] rounded-[8px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm shrink-0"
            title="Commit & Push to Remote"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Worktrees Management Drawer/Modal */}
      {worktreeModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--dt-card)] border border-[var(--dt-border)] rounded-[16px] shadow-2xl max-w-lg w-full p-4 flex flex-col font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--dt-border)]">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-[var(--dt-primary)]" />
                <h3 className="text-[14px] font-semibold text-[var(--dt-foreground)]">Git Worktrees</h3>
              </div>
              <button
                onClick={() => setWorktreeModalOpen(false)}
                className="p-1 hover:bg-[var(--dt-sidebar-accent)] rounded text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Existing Worktrees */}
            <div className="my-3 space-y-2 max-h-48 overflow-y-auto">
              {worktrees.map((wt) => (
                <div
                  key={wt.path}
                  className="flex items-center justify-between p-2 rounded-[8px] bg-[var(--dt-sidebar)] border border-[var(--dt-border)] text-[12px]"
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className="font-mono font-medium truncate text-[var(--dt-foreground)]">{wt.path}</span>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--dt-muted-foreground)] font-mono mt-0.5">
                      <span>branch: {wt.branch || '(detached)'}</span>
                      {wt.is_main && <span className="text-[var(--dt-primary)] font-semibold">main</span>}
                      {wt.locked && <span className="text-[var(--dt-warning)]">locked</span>}
                    </div>
                  </div>
                  {!wt.is_main && (
                    <button
                      onClick={() => removeWorktree(wt.path, false)}
                      className="text-[11px] text-[var(--dt-danger)] hover:underline cursor-pointer shrink-0"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add New Worktree Form */}
            <form onSubmit={handleAddWorktree} className="pt-3 border-t border-[var(--dt-border)] space-y-2">
              <span className="text-[12px] font-medium text-[var(--dt-foreground)]">Add Worktree</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Relative path (e.g. ../feature-wt)"
                  value={wtPath}
                  onChange={(e) => setWtPath(e.target.value)}
                  className="px-2.5 py-1.5 text-[11px] bg-[var(--dt-card)] border border-[var(--dt-border)] rounded-[6px] outline-none font-mono text-[var(--dt-foreground)]"
                  required
                />
                <input
                  type="text"
                  placeholder="Branch name (e.g. feat/wt-1)"
                  value={wtBranch}
                  onChange={(e) => setWtBranch(e.target.value)}
                  className="px-2.5 py-1.5 text-[11px] bg-[var(--dt-card)] border border-[var(--dt-border)] rounded-[6px] outline-none font-mono text-[var(--dt-foreground)]"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-1.5 text-[11px] text-[var(--dt-muted-foreground)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wtNewBranch}
                    onChange={(e) => setWtNewBranch(e.target.checked)}
                    className="rounded text-[var(--dt-primary)]"
                  />
                  <span>Create new branch (-b)</span>
                </label>
                <button
                  type="submit"
                  className="px-3 py-1 text-[11px] bg-[var(--dt-primary)] text-white rounded-[6px] font-medium hover:bg-[var(--dt-primary-hover)] cursor-pointer"
                >
                  Add Worktree
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
