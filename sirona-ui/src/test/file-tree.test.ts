import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  $fileTree,
  $openFolders,
  $fileSearchQuery,
  $searchResults,
  $activeFile,
  $isEditingFile,
  $editedContent,
  loadWorkspaceTree,
  toggleFolder,
  openFile,
  saveActiveFile,
  searchFiles,
  clearSearch,
  closeActiveFile,
} from '../store/fileStore'
import { api } from '../api/client'

describe('Stage 8: Workspace File Tree, Live Search & Code Viewer', () => {
  beforeEach(() => {
    $fileTree.set([])
    $openFolders.set({})
    $fileSearchQuery.set('')
    $searchResults.set([])
    $activeFile.set(null)
    $isEditingFile.set(false)
    $editedContent.set('')
    vi.restoreAllMocks()
  })

  it('loads workspace tree nodes via api', async () => {
    const mockTree = [
      {
        name: 'src',
        path: 'sirona-ui/src',
        is_dir: true,
        children: [
          { name: 'App.tsx', path: 'sirona-ui/src/App.tsx', is_dir: false, size: 2400 },
        ],
      },
      { name: 'package.json', path: 'package.json', is_dir: false, size: 1200 },
    ]

    vi.spyOn(api, 'getFileTree').mockResolvedValue({
      root: '.',
      name: 'root',
      tree: mockTree,
    })

    await loadWorkspaceTree()

    const tree = $fileTree.get()
    expect(tree).toHaveLength(2)
    expect(tree[0].name).toBe('src')
    expect(tree[0].is_dir).toBe(true)
    expect(tree[0].children).toHaveLength(1)
    expect(tree[1].name).toBe('package.json')
  })

  it('toggles folder open and closed state', () => {
    expect($openFolders.get()['src']).toBeFalsy()

    toggleFolder('src')
    expect($openFolders.get()['src']).toBe(true)

    toggleFolder('src')
    expect($openFolders.get()['src']).toBe(false)
  })

  it('opens and closes a file cleanly', async () => {
    vi.spyOn(api, 'readWorkspaceFile').mockResolvedValue({
      path: 'sirona-ui/src/App.tsx',
      name: 'App.tsx',
      content: 'export const App = () => <div>Hello</div>',
      total_lines: 1,
      size: 42,
      language: 'typescript',
    })

    await openFile('sirona-ui/src/App.tsx')

    const file = $activeFile.get()
    expect(file).not.toBeNull()
    expect(file?.name).toBe('App.tsx')
    expect(file?.language).toBe('typescript')
    expect($editedContent.get()).toBe('export const App = () => <div>Hello</div>')

    closeActiveFile()
    expect($activeFile.get()).toBeNull()
    expect($editedContent.get()).toBe('')
  })

  it('saves edited file content through api', async () => {
    vi.spyOn(api, 'readWorkspaceFile').mockResolvedValue({
      path: 'docs/test.md',
      name: 'test.md',
      content: 'Original',
      total_lines: 1,
      size: 8,
      language: 'markdown',
    })

    const writeSpy = vi.spyOn(api, 'writeWorkspaceFile').mockResolvedValue({
      success: true,
      path: 'docs/test.md',
      bytes_written: 14,
    })

    await openFile('docs/test.md')
    $isEditingFile.set(true)
    $editedContent.set('Updated Content')

    const saved = await saveActiveFile()

    expect(saved).toBe(true)
    expect(writeSpy).toHaveBeenCalledWith('docs/test.md', 'Updated Content')
    expect($activeFile.get()?.content).toBe('Updated Content')
    expect($isEditingFile.get()).toBe(false)
  })

  it('performs live file search and clears query', async () => {
    vi.spyOn(api, 'searchFiles').mockResolvedValue({
      query: 'App',
      total: 1,
      matches: [
        {
          name: 'App.tsx',
          path: 'src/App.tsx',
          relative_path: 'src/App.tsx',
          size: 1024,
          language: 'typescript',
        },
      ],
    })

    await searchFiles('App')

    expect($fileSearchQuery.get()).toBe('App')
    expect($searchResults.get()).toHaveLength(1)
    expect($searchResults.get()[0].name).toBe('App.tsx')

    clearSearch()
    expect($fileSearchQuery.get()).toBe('')
    expect($searchResults.get()).toHaveLength(0)
  })
})
