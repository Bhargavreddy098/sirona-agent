import React, { useEffect, useState } from 'react'
import { useStore } from '@nanostores/react'
import {
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileJson,
  FileText,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Search,
  X,
  Copy,
  Check,
  Save,
  Edit2,
  FolderTree,
  ExternalLink,
} from 'lucide-react'
import {
  $fileTree,
  $openFolders,
  $fileSearchQuery,
  $searchResults,
  $isLoadingTree,
  $activeFile,
  $isEditingFile,
  $editedContent,
  $isSaving,
  loadWorkspaceTree,
  toggleFolder,
  openFile,
  saveActiveFile,
  searchFiles,
  clearSearch,
  closeActiveFile,
  revealFile,
  type FileTreeNode,
} from '../../store/fileStore'

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) {
    return <FileCode className="w-3.5 h-3.5 text-[var(--dt-primary)] shrink-0" />
  }
  if (['py'].includes(ext || '')) {
    return <FileCode className="w-3.5 h-3.5 text-[var(--dt-warning)] shrink-0" />
  }
  if (['json', 'yaml', 'yml', 'toml'].includes(ext || '')) {
    return <FileJson className="w-3.5 h-3.5 text-[var(--dt-warning)] shrink-0" />
  }
  if (['html', 'css', 'scss', 'svg'].includes(ext || '')) {
    return <FileText className="w-3.5 h-3.5 text-[var(--dt-accent-orange,#ea580c)] shrink-0" />
  }
  if (['md', 'txt', 'log'].includes(ext || '')) {
    return <FileText className="w-3.5 h-3.5 text-[var(--dt-muted-foreground)] shrink-0" />
  }
  return <File className="w-3.5 h-3.5 text-[var(--dt-muted-foreground)] shrink-0" />
}

export const FileTreeExplorer: React.FC = () => {
  const tree = useStore($fileTree)
  const openFolders = useStore($openFolders)
  const query = useStore($fileSearchQuery)
  const searchResults = useStore($searchResults)
  const loading = useStore($isLoadingTree)
  const activeFile = useStore($activeFile)
  const isEditing = useStore($isEditingFile)
  const editedContent = useStore($editedContent)
  const isSaving = useStore($isSaving)

  const [copiedPath, setCopiedPath] = useState(false)
  const [copiedContent, setCopiedContent] = useState(false)

  useEffect(() => {
    loadWorkspaceTree()
  }, [])

  const handleCopyPath = () => {
    if (!activeFile) return
    navigator.clipboard.writeText(activeFile.path)
    setCopiedPath(true)
    setTimeout(() => setCopiedPath(false), 2000)
  }

  const handleCopyContent = () => {
    if (!activeFile) return
    navigator.clipboard.writeText(activeFile.content)
    setCopiedContent(true)
    setTimeout(() => setCopiedContent(false), 2000)
  }

  const renderNodes = (nodes: FileTreeNode[], depth = 0) => {
    return nodes.map((node) => {
      const isOpen = openFolders[node.path]
      const isSelected = activeFile?.path === node.path

      return (
        <div key={node.path} style={{ paddingLeft: `${depth * 12}px` }}>
          <div
            onClick={() => (node.is_dir ? toggleFolder(node.path) : openFile(node.path))}
            className={`flex items-center justify-between py-1 px-1.5 rounded-[6px] cursor-pointer text-[12px] transition-colors group select-none ${
              isSelected
                ? 'bg-[var(--dt-sidebar-accent)] text-[var(--dt-primary)] font-medium'
                : 'text-[var(--dt-foreground)] hover:bg-[var(--dt-sidebar-accent)]'
            }`}
          >
            <div className="flex items-center gap-1.5 overflow-hidden">
              {node.is_dir ? (
                isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--dt-muted-foreground)] shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--dt-muted-foreground)] shrink-0" />
                )
              ) : (
                <span className="w-3.5 shrink-0" />
              )}
              {node.is_dir ? (
                isOpen ? (
                  <FolderOpen className="w-3.5 h-3.5 text-[var(--dt-primary)] shrink-0" />
                ) : (
                  <Folder className="w-3.5 h-3.5 text-[var(--dt-primary)] shrink-0" />
                )
              ) : (
                getFileIcon(node.name)
              )}
              <span className="truncate font-mono text-[11px]">{node.name}</span>
            </div>

            {node.size !== undefined && node.size > 0 && !node.is_dir && (
              <span className="text-[10px] text-[var(--dt-muted-foreground)] font-mono hidden group-hover:inline shrink-0 pr-1">
                {(node.size / 1024).toFixed(0)}kb
              </span>
            )}
          </div>

          {node.is_dir && isOpen && node.children && (
            <div>{renderNodes(node.children, depth + 1)}</div>
          )}
        </div>
      )
    })
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--dt-sidebar)] select-text overflow-hidden font-sans">
      {/* Top action toolbar */}
      <div className="p-2.5 border-b border-[var(--dt-border)] bg-[var(--dt-sidebar)] space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--dt-foreground)]">
            <FolderTree className="w-3.5 h-3.5 text-[var(--dt-primary)]" />
            <span>Workspace</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => loadWorkspaceTree()}
              className="p-1 hover:bg-[var(--dt-sidebar-accent)] rounded text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] transition-colors cursor-pointer"
              title="Refresh Workspace"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Live Search Input */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-[var(--dt-muted-foreground)] absolute left-2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => searchFiles(e.target.value)}
            placeholder="Search files..."
            className="w-full bg-[var(--dt-card)] border border-[var(--dt-border)] focus:border-[var(--dt-primary)] rounded-[6px] pl-7 pr-7 py-1 text-[11px] text-[var(--dt-foreground)] placeholder:text-[var(--dt-muted-foreground)] outline-none font-mono transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Files View */}
      <div className="flex-1 overflow-y-auto p-2">
        {query ? (
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-[var(--dt-muted-foreground)] px-1.5 pb-1 mb-1 border-b border-[var(--dt-border)]">
              Matches ({searchResults.length})
            </div>
            {searchResults.length > 0 ? (
              searchResults.map((match) => (
                <div
                  key={match.path}
                  onClick={() => openFile(match.path)}
                  className={`flex flex-col py-1.5 px-2 rounded-[6px] cursor-pointer text-[12px] transition-colors select-none ${
                    activeFile?.path === match.path
                      ? 'bg-[var(--dt-sidebar-accent)] text-[var(--dt-primary)] font-medium'
                      : 'text-[var(--dt-foreground)] hover:bg-[var(--dt-sidebar-accent)]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {getFileIcon(match.name)}
                    <span className="font-mono text-[11px] font-medium">{match.name}</span>
                  </div>
                  {match.relative_path && (
                    <span className="text-[10px] text-[var(--dt-muted-foreground)] font-mono truncate pl-5">
                      {match.relative_path}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-[12px] text-[var(--dt-muted-foreground)] py-6 text-center">
                No files matching "{query}"
              </div>
            )}
          </div>
        ) : tree.length > 0 ? (
          renderNodes(tree)
        ) : (
          <div className="text-[12px] text-[var(--dt-muted-foreground)] py-8 text-center">
            {loading ? 'Scanning workspace...' : 'No files found'}
          </div>
        )}
      </div>

      {/* Code Viewer / Editor Drawer */}
      {activeFile && (
        <div className="border-t border-[var(--dt-border)] bg-[var(--dt-card)] flex flex-col h-72 shrink-0 overflow-hidden shadow-[var(--shadow-subtle)]">
          {/* File Header Bar */}
          <div className="px-3 py-1.5 bg-[var(--dt-card-subtle)] border-b border-[var(--dt-border)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 overflow-hidden mr-2">
              <span className="font-mono text-[11px] font-medium text-[var(--dt-foreground)] truncate">
                {activeFile.name}
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-[var(--dt-sidebar)] border border-[var(--dt-border)] text-[var(--dt-primary)]">
                {activeFile.language}
              </span>
              <span className="text-[10px] text-[var(--dt-muted-foreground)] font-mono">
                {activeFile.total_lines} lines
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleCopyContent}
                className="p-1 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-sidebar-accent)] rounded transition-colors"
                title="Copy File Content"
              >
                {copiedContent ? <Check className="w-3 h-3 text-[var(--dt-primary)]" /> : <FileText className="w-3 h-3" />}
              </button>
              <button
                type="button"
                onClick={handleCopyPath}
                className="p-1 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-sidebar-accent)] rounded transition-colors"
                title="Copy Path"
              >
                {copiedPath ? <Check className="w-3 h-3 text-[var(--dt-primary)]" /> : <Copy className="w-3 h-3" />}
              </button>
              <button
                type="button"
                onClick={() => revealFile(activeFile.path)}
                className="p-1 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-sidebar-accent)] rounded transition-colors"
                title="Reveal in File Explorer"
              >
                <ExternalLink className="w-3 h-3" />
              </button>

              {isEditing ? (
                <button
                  type="button"
                  onClick={saveActiveFile}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--dt-primary)] text-white hover:bg-[var(--dt-primary-hover)] text-[11px] font-medium transition-colors"
                  title="Save File"
                >
                  <Save className="w-3 h-3" />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => $isEditingFile.set(true)}
                  className="p-1 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-sidebar-accent)] rounded transition-colors"
                  title="Edit File"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}

              <button
                type="button"
                onClick={closeActiveFile}
                className="p-1 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-sidebar-accent)] rounded transition-colors"
                title="Close Viewer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* File Content Body */}
          <div className="flex-1 overflow-auto p-2 bg-[var(--dt-card)] font-mono text-[11px] leading-relaxed">
            {isEditing ? (
              <textarea
                value={editedContent}
                onChange={(e) => $editedContent.set(e.target.value)}
                className="w-full h-full bg-transparent text-[var(--dt-foreground)] outline-none resize-none font-mono text-[11px] leading-relaxed select-text"
              />
            ) : (
              <pre className="text-[var(--dt-foreground)] whitespace-pre-wrap select-text">
                {activeFile.content}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}