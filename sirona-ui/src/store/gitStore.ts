import { atom } from 'nanostores'
import {
  api,
  type GitStatusResponse,
  type GitBranch,
  type GitWorktree,
} from '../api/client'

export type DiffScope = 'all' | 'staged' | 'unstaged'

export const $repoStatus = atom<GitStatusResponse | null>(null)
export const $branches = atom<GitBranch[]>([])
export const $worktrees = atom<GitWorktree[]>([])
export const $selectedDiffFile = atom<string | null>(null)
export const $activeDiffScope = atom<DiffScope>('all')
export const $currentDiff = atom<string>('')
export const $isGitLoading = atom<boolean>(false)
export const $gitCommitMessage = atom<string>('')
export const $worktreeModalOpen = atom<boolean>(false)

export async function refreshGitStatus(cwd?: string): Promise<GitStatusResponse | null> {
  try {
    const status = await api.getGitStatus(cwd)
    $repoStatus.set(status)
    return status
  } catch (err) {
    console.warn('[GitStore] Failed to fetch git status:', err)
    return null
  }
}

export async function refreshBranches(cwd?: string): Promise<GitBranch[]> {
  try {
    const res = await api.getGitBranches(cwd)
    $branches.set(res.branches || [])
    return res.branches || []
  } catch (err) {
    console.warn('[GitStore] Failed to fetch branches:', err)
    return []
  }
}

export async function refreshWorktrees(cwd?: string): Promise<GitWorktree[]> {
  try {
    const res = await api.getGitWorktrees(cwd)
    $worktrees.set(res.worktrees || [])
    return res.worktrees || []
  } catch (err) {
    console.warn('[GitStore] Failed to fetch worktrees:', err)
    return []
  }
}

export async function fetchDiff(
  file?: string | null,
  scope?: DiffScope,
  cwd?: string
): Promise<string> {
  $isGitLoading.set(true)
  const targetScope = scope !== undefined ? scope : $activeDiffScope.get()
  const targetFile = file !== undefined ? file : $selectedDiffFile.get()

  try {
    const res = await api.getGitDiff({
      path: targetFile || undefined,
      staged: targetScope === 'staged',
      scope: targetScope,
      cwd,
    })
    const diff = res.diff || ''
    $currentDiff.set(diff)
    if (file !== undefined) {
      $selectedDiffFile.set(file)
    }
    if (scope !== undefined) {
      $activeDiffScope.set(scope)
    }
    return diff
  } catch (err) {
    console.warn('[GitStore] Failed to fetch diff:', err)
    $currentDiff.set('')
    return ''
  } finally {
    $isGitLoading.set(false)
  }
}

export async function stageFile(path?: string, cwd?: string): Promise<boolean> {
  try {
    const res = await api.stageGitFile(path, cwd)
    if (res.success) {
      await refreshGitStatus(cwd)
      await fetchDiff(undefined, undefined, cwd)
      return true
    }
    return false
  } catch (err) {
    console.error('[GitStore] Stage failed:', err)
    return false
  }
}

export async function unstageFile(path?: string, cwd?: string): Promise<boolean> {
  try {
    const res = await api.unstageGitFile(path, cwd)
    if (res.success) {
      await refreshGitStatus(cwd)
      await fetchDiff(undefined, undefined, cwd)
      return true
    }
    return false
  } catch (err) {
    console.error('[GitStore] Unstage failed:', err)
    return false
  }
}

export async function discardChanges(
  path: string,
  untracked = false,
  cwd?: string
): Promise<boolean> {
  try {
    const res = await api.discardGitChanges(path, untracked, cwd)
    if (res.success) {
      await refreshGitStatus(cwd)
      if ($selectedDiffFile.get() === path) {
        $selectedDiffFile.set(null)
      }
      await fetchDiff(undefined, undefined, cwd)
      return true
    }
    return false
  } catch (err) {
    console.error('[GitStore] Discard failed:', err)
    return false
  }
}

export async function commitChanges(
  message: string,
  push = false,
  cwd?: string
): Promise<{ success: boolean; commit_hash?: string; error?: string }> {
  try {
    const res = await api.commitGitChanges(message, push, cwd)
    if (res.success) {
      $gitCommitMessage.set('')
      await refreshGitStatus(cwd)
      await fetchDiff(null, 'all', cwd)
      return { success: true, commit_hash: res.commit_hash }
    }
    return { success: false, error: res.error || 'Commit failed' }
  } catch (err) {
    console.error('[GitStore] Commit failed:', err)
    return { success: false, error: String(err) }
  }
}

export async function switchBranch(
  branch: string,
  create = false,
  base?: string,
  cwd?: string
): Promise<boolean> {
  try {
    const res = await api.switchGitBranch(branch, create, base, cwd)
    if (res.success) {
      await refreshGitStatus(cwd)
      await refreshBranches(cwd)
      await fetchDiff(null, 'all', cwd)
      return true
    }
    return false
  } catch (err) {
    console.error('[GitStore] Switch branch failed:', err)
    return false
  }
}

export async function addWorktree(
  path: string,
  branch?: string,
  base?: string,
  newBranch = false,
  cwd?: string
): Promise<boolean> {
  try {
    const res = await api.addGitWorktree(path, branch, base, newBranch, cwd)
    if (res.success) {
      await refreshWorktrees(cwd)
      return true
    }
    return false
  } catch (err) {
    console.error('[GitStore] Add worktree failed:', err)
    return false
  }
}

export async function removeWorktree(
  path: string,
  force = false,
  cwd?: string
): Promise<boolean> {
  try {
    const res = await api.removeGitWorktree(path, force, cwd)
    if (res.success) {
      await refreshWorktrees(cwd)
      return true
    }
    return false
  } catch (err) {
    console.error('[GitStore] Remove worktree failed:', err)
    return false
  }
}

export function setSelectedDiffFile(file: string | null): void {
  $selectedDiffFile.set(file)
  fetchDiff(file)
}

export function setActiveDiffScope(scope: DiffScope): void {
  $activeDiffScope.set(scope)
  fetchDiff(undefined, scope)
}

export function setGitCommitMessage(msg: string): void {
  $gitCommitMessage.set(msg)
}

export function setWorktreeModalOpen(open: boolean): void {
  $worktreeModalOpen.set(open)
}
