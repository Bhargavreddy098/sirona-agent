import React, { useState, useEffect } from 'react'
import { Folder, File, ChevronRight, ChevronDown, RefreshCw } from 'lucide-react'
import { api } from '../../api/client'

interface TreeNode {
  name: string
  path: string
  isDir: boolean
  children?: TreeNode[]
}

export const FileTreeExplorer: React.FC = () => {
  const [tree, setTree] = useState<TreeNode[]>([])
  const [openNodes, setOpenNodes] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)

  const loadTree = async () => {
    setLoading(true)
    try {
      const res = await api.executeTool('list_dir', { path: '.' })
      if (res.success && res.result?.entries) {
        const rootEntries: TreeNode[] = res.result.entries.map((e: any) => ({
          name: e.name,
          path: e.path,
          isDir: e.is_dir,
        }))
        setTree(rootEntries)
      }
    } catch (e) {
      // Fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTree()
  }, [])

  const toggle = async (node: TreeNode) => {
    const nextState = !openNodes[node.path]
    setOpenNodes((prev) => ({ ...prev, [node.path]: nextState }))

    if (nextState && (!node.children || node.children.length === 0)) {
      try {
        const res = await api.executeTool('list_dir', { path: node.path })
        if (res.success && res.result?.entries) {
          const children: TreeNode[] = res.result.entries.map((e: any) => ({
            name: e.name,
            path: e.path,
            isDir: e.is_dir,
          }))
          setTree((prev) => updateChildren(prev, node.path, children))
        }
      } catch (e) {
        // Fallback
      }
    }
  }

  const updateChildren = (nodes: TreeNode[], targetPath: string, children: TreeNode[]): TreeNode[] => {
    return nodes.map((n) => {
      if (n.path === targetPath) {
        return { ...n, children }
      }
      if (n.children) {
        return { ...n, children: updateChildren(n.children, targetPath, children) }
      }
      return n
    })
  }

  const handleFileClick = async (node: TreeNode) => {
    setSelectedFile(node.name)
    try {
      const res = await api.executeTool('read_file', { path: node.path })
      if (res.success) {
        setFileContent(res.result.content)
      } else {
        setFileContent(`Error reading file: ${res.error}`)
      }
    } catch (e: any) {
      setFileContent(`Error reading file: ${e.message}`)
    }
  }

  const renderNodes = (nodes: TreeNode[], depth: number = 0) => {
    return nodes.map((node) => {
      const isOpen = openNodes[node.path]
      return (
        <div key={node.path} style={{ paddingLeft: `${depth * 12}px` }}>
          <div
            onClick={() => (node.isDir ? toggle(node) : handleFileClick(node))}
            className="flex items-center gap-1.5 py-1 px-1.5 rounded-[6px] hover:bg-[#f5f3ef] cursor-pointer text-[12px] text-[#72706b] hover:text-[#27251e] transition-colors"
          >
            {node.isDir ? (
              isOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-[#72706b]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[#72706b]" />
              )
            ) : (
              <span className="w-3.5" />
            )}
            {node.isDir ? (
              <Folder className="w-3.5 h-3.5 text-[#016a71] shrink-0" />
            ) : (
              <File className="w-3.5 h-3.5 text-[#72706b] shrink-0" />
            )}
            <span className="truncate font-mono text-[11px]">{node.name}</span>
          </div>
          {node.isDir && isOpen && node.children && renderNodes(node.children, depth + 1)}
        </div>
      )
    })
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 select-none font-sans bg-[#faf8f5] flex flex-col">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[11px] font-medium tracking-wider uppercase text-[#72706b]">
          Workspace Files
        </span>
        <button
          onClick={loadTree}
          className="p-1 hover:bg-[#f5f3ef] rounded text-[#72706b] hover:text-[#27251e] transition-colors cursor-pointer"
          title="Refresh Directory"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tree.length > 0 ? (
          renderNodes(tree)
        ) : (
          <div className="text-[12px] text-[#72706b] py-4 text-center">
            {loading ? 'Scanning workspace...' : 'No files found'}
          </div>
        )}
      </div>

      {/* File Preview Drawer if file clicked */}
      {selectedFile && fileContent && (
        <div className="mt-3 border-t border-[#d1d1cd] pt-2 flex flex-col max-h-48 overflow-hidden">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#016a71] mb-1">
            <span className="truncate">{selectedFile}</span>
            <button
              onClick={() => {
                setSelectedFile(null)
                setFileContent(null)
              }}
              className="text-[#72706b] hover:text-[#27251e]"
            >
              ×
            </button>
          </div>
          <pre className="p-2 bg-[#fdfbfa] border border-[#d1d1cd] rounded-[6px] text-[10px] font-mono overflow-auto flex-1 select-text">
            {fileContent}
          </pre>
        </div>
      )}
    </div>
  )
}
