import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseUnifiedDiff,
} from '../components/context/DiffReviewView'
import {
  $repoStatus,
  $branches,
  $worktrees,
  $selectedDiffFile,
  $activeDiffScope,
  $currentDiff,
  $gitCommitMessage,
  $worktreeModalOpen,
  refreshGitStatus,
  refreshBranches,
  refreshWorktrees,
  fetchDiff,
  stageFile,
  unstageFile,
  commitChanges,
  setSelectedDiffFile,
  setActiveDiffScope,
  setGitCommitMessage,
  setWorktreeModalOpen,
} from '../store/gitStore'
import { api } from '../api/client'

vi.mock('../api/client', () => ({
  api: {
    getGitStatus: vi.fn(),
    getGitDiff: vi.fn(),
    getGitBranches: vi.fn(),
    switchGitBranch: vi.fn(),
    stageGitFile: vi.fn(),
    unstageGitFile: vi.fn(),
    discardGitChanges: vi.fn(),
    commitGitChanges: vi.fn(),
    getGitWorktrees: vi.fn(),
    addGitWorktree: vi.fn(),
    removeGitWorktree: vi.fn(),
  },
}))

describe('parseUnifiedDiff', () => {
  it('returns empty array for empty diff', () => {
    expect(parseUnifiedDiff('')).toEqual([])
    expect(parseUnifiedDiff('   ')).toEqual([])
  })

  it('correctly parses headers, hunks, additions, deletions, and context lines', () => {
    const rawDiff = `diff --git a/file.ts b/file.ts
index 1234567..89abcdef 100644
--- a/file.ts
+++ b/file.ts
@@ -10,3 +10,4 @@ function hello() {
   const a = 1;
-  const b = 2;
+  const b = 20;
+  const c = 30;
 }`

    const parsed = parseUnifiedDiff(rawDiff)
    expect(parsed.length).toBeGreaterThan(0)

    const additions = parsed.filter((l) => l.kind === 'add')
    const deletions = parsed.filter((l) => l.kind === 'remove')
    const contexts = parsed.filter((l) => l.kind === 'context')

    expect(additions.length).toBe(2)
    expect(additions[0].text).toBe('  const b = 20;')
    expect(additions[0].newNo).toBe(11)
    expect(additions[1].text).toBe('  const c = 30;')
    expect(additions[1].newNo).toBe(12)

    expect(deletions.length).toBe(1)
    expect(deletions[0].text).toBe('  const b = 2;')
    expect(deletions[0].oldNo).toBe(11)

    expect(contexts.length).toBe(2)
    expect(contexts[0].text).toBe('  const a = 1;')
  })
})

describe('gitStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    $repoStatus.set(null)
    $branches.set([])
    $worktrees.set([])
    $selectedDiffFile.set(null)
    $activeDiffScope.set('all')
    $currentDiff.set('')
    $gitCommitMessage.set('')
    $worktreeModalOpen.set(false)
  })

  it('updates selected file and active diff scope', () => {
    vi.mocked(api.getGitDiff).mockResolvedValue({
      success: true,
      diff: 'mock diff',
      staged: false,
    })

    setSelectedDiffFile('src/app.ts')
    expect($selectedDiffFile.get()).toBe('src/app.ts')

    setActiveDiffScope('staged')
    expect($activeDiffScope.get()).toBe('staged')

    setGitCommitMessage('feat: test commit')
    expect($gitCommitMessage.get()).toBe('feat: test commit')

    setWorktreeModalOpen(true)
    expect($worktreeModalOpen.get()).toBe(true)
  })

  it('fetches git status and updates store', async () => {
    vi.mocked(api.getGitStatus).mockResolvedValue({
      is_repo: true,
      branch: 'master',
      ahead: 1,
      behind: 0,
      is_clean: false,
      staged: [{ path: 'foo.ts', status: 'M' }],
      unstaged: [],
      untracked: ['bar.ts'],
      total_changed: 2,
    })

    const status = await refreshGitStatus()
    expect(status?.branch).toBe('master')
    expect($repoStatus.get()?.total_changed).toBe(2)
  })

  it('fetches branches and worktrees', async () => {
    vi.mocked(api.getGitBranches).mockResolvedValue({
      current: 'master',
      branches: [
        { name: 'master', is_current: true, upstream: '', is_remote: false },
        { name: 'feat/test', is_current: false, upstream: '', is_remote: false },
      ],
    })

    vi.mocked(api.getGitWorktrees).mockResolvedValue({
      worktrees: [
        { path: '/repo', branch: 'master', is_main: true, detached: false, locked: false },
      ],
    })

    const branches = await refreshBranches()
    expect(branches.length).toBe(2)
    expect($branches.get().length).toBe(2)

    const trees = await refreshWorktrees()
    expect(trees.length).toBe(1)
    expect($worktrees.get()[0].branch).toBe('master')
  })

  it('stages file, unstages file, and commits changes', async () => {
    vi.mocked(api.stageGitFile).mockResolvedValue({ success: true })
    vi.mocked(api.unstageGitFile).mockResolvedValue({ success: true })
    vi.mocked(api.commitGitChanges).mockResolvedValue({
      success: true,
      commit_hash: 'abc1234',
      pushed: false,
    })
    vi.mocked(api.getGitStatus).mockResolvedValue({
      is_repo: true,
      branch: 'master',
      ahead: 0,
      behind: 0,
      is_clean: true,
      staged: [],
      unstaged: [],
      untracked: [],
      total_changed: 0,
    })
    vi.mocked(api.getGitDiff).mockResolvedValue({
      success: true,
      diff: '',
      staged: false,
    })

    const stageRes = await stageFile('file.ts')
    expect(stageRes).toBe(true)

    const unstageRes = await unstageFile('file.ts')
    expect(unstageRes).toBe(true)

    setGitCommitMessage('Initial commit')
    const commitRes = await commitChanges('Initial commit')
    expect(commitRes.success).toBe(true)
    expect(commitRes.commit_hash).toBe('abc1234')
    expect($gitCommitMessage.get()).toBe('')
  })

  it('fetches diff and updates currentDiff atom', async () => {
    vi.mocked(api.getGitDiff).mockResolvedValue({
      success: true,
      diff: '+added line\n-removed line',
      staged: false,
    })

    const diff = await fetchDiff('file.ts', 'unstaged')
    expect(diff).toContain('+added line')
    expect($currentDiff.get()).toContain('+added line')
  })
})
