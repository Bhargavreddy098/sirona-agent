import { atom } from 'nanostores'
import { api } from '../api/client'

export interface FileTreeNode {
  name: string
  path: string
  is_dir: boolean
  size?: number
  children?: FileTreeNode[]
  relative_path?: string
  language?: string
}

export interface FileRecord {
  path: string
  name: string
  content: string
  total_lines: number
  size: number
  language: string
}

export const $fileTree = atom<FileTreeNode[]>([])
export const $openFolders = atom<Record<string, boolean>>({})
export const $fileSearchQuery = atom<string>('')
export const $searchResults = atom<FileTreeNode[]>([])
export const $isSearching = atom<boolean>(false)
export const $isLoadingTree = atom<boolean>(false)
export const $activeFile = atom<FileRecord | null>(null)
export const $isEditingFile = atom<boolean>(false)
export const $editedContent = atom<string>('')
export const $isSaving = atom<boolean>(false)

export async function loadWorkspaceTree(path = '.', maxDepth = 4): Promise<void> {
  $isLoadingTree.set(true)
  try {
    const res = await api.getFileTree(path, maxDepth)
    $fileTree.set(res.tree || [])
  } catch (err) {
    console.warn('Failed to load workspace file tree', err)
    $fileTree.set([])
  } finally {
    $isLoadingTree.set(false)
  }
}

export function toggleFolder(path: string): void {
  const current = $openFolders.get()
  $openFolders.set({
    ...current,
    [path]: !current[path],
  })
}

export async function openFile(path: string): Promise<void> {
  try {
    const file = await api.readWorkspaceFile(path)
    $activeFile.set(file)
    $editedContent.set(file.content)
    $isEditingFile.set(false)
  } catch (err) {
    console.error('Failed to read file', err)
    $activeFile.set({
      path,
      name: path.split('/').pop() || path,
      content: `Failed to read file: ${String(err)}`,
      total_lines: 1,
      size: 0,
      language: 'plaintext',
    })
    $isEditingFile.set(false)
  }
}

export async function saveActiveFile(): Promise<boolean> {
  const current = $activeFile.get()
  if (!current) return false

  const newContent = $editedContent.get()
  $isSaving.set(true)
  try {
    await api.writeWorkspaceFile(current.path, newContent)
    $activeFile.set({
      ...current,
      content: newContent,
      total_lines: newContent.split('\n').length,
      size: new Blob([newContent]).size,
    })
    $isEditingFile.set(false)
    return true
  } catch (err) {
    console.error('Failed to save file', err)
    return false
  } finally {
    $isSaving.set(false)
  }
}

export async function searchFiles(query: string): Promise<void> {
  $fileSearchQuery.set(query)
  if (!query.trim()) {
    $searchResults.set([])
    $isSearching.set(false)
    return
  }

  $isSearching.set(true)
  try {
    const res = await api.searchFiles(query)
    const matches: FileTreeNode[] = (res.matches || []).map((m: any) => ({
      name: m.name,
      path: m.path,
      relative_path: m.relative_path,
      is_dir: false,
      size: m.size,
      language: m.language,
    }))
    $searchResults.set(matches)
  } catch (err) {
    console.warn('File search failed', err)
    $searchResults.set([])
  } finally {
    $isSearching.set(false)
  }
}

export function clearSearch(): void {
  $fileSearchQuery.set('')
  $searchResults.set([])
  $isSearching.set(false)
}

export function closeActiveFile(): void {
  $activeFile.set(null)
  $isEditingFile.set(false)
  $editedContent.set('')
}

export async function revealFile(path: string): Promise<void> {
  try {
    if (typeof window !== 'undefined' && (window as any).sironaDesktop?.revealFile) {
      await (window as any).sironaDesktop.revealFile(path)
    } else {
      await api.revealFile(path)
    }
  } catch (err) {
    console.warn('Failed to reveal file', err)
  }
}
