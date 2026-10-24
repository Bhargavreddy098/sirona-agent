import React, { useEffect, useState } from 'react'
import {
  X,
  GitFork,
  RotateCcw,
  Play,
  Search,
  MessageSquare,
  Bot,
  User,
  Plus,
  Compass,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react'
import { useStore } from '@nanostores/react'
import { $starmapOpen, toggleStarmap } from '../../store/layoutStore'
import { $activeSessionId, openSessionInTab } from '../../store/sessionStore'
import {
  $topology,
  $selectedSessionId,
  $selectedLineage,
  $selectedMessages,
  $isLoadingTopology,
  $isLoadingLineage,
  $rewindingMessageId,
  $starmapSearch,
  loadTopology,
  selectSession,
  rewindSession,
  forkNewBranch,
  setStarmapSearch,
} from '../../store/starmapStore'

export const StarmapModal: React.FC = () => {
  const isOpen = useStore($starmapOpen)
  const activeSessionId = useStore($activeSessionId)
  const topology = useStore($topology)
  const selectedId = useStore($selectedSessionId)
  const lineage = useStore($selectedLineage)
  const messages = useStore($selectedMessages)
  const isLoading = useStore($isLoadingTopology)
  const isLoadingLineage = useStore($isLoadingLineage)
  const rewindingId = useStore($rewindingMessageId)
  const searchQuery = useStore($starmapSearch)

  const [branchInputOpen, setBranchInputOpen] = useState(false)
  const [newBranchTitle, setNewBranchTitle] = useState('')
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadTopology()
      if (activeSessionId) {
        selectSession(activeSessionId)
      }
    }
  }, [isOpen, activeSessionId])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        toggleStarmap()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  if (!isOpen) return null

  const handleOpenInWorkspace = (sessionId: string) => {
    openSessionInTab(sessionId)
    toggleStarmap()
  }

  const handleRewind = async (sessionId: string, messageId: number) => {
    if (window.confirm(`Rewind session to turn #${messageId}? Subsequent messages will be archived.`)) {
      setActionNotice('Rewinding session history...')
      const success = await rewindSession(sessionId, messageId)
      if (success) {
        setActionNotice(`Successfully rewound to turn #${messageId}`)
        setTimeout(() => setActionNotice(null), 3000)
      }
    }
  }

  const handleForkBranch = async (sessionId: string, messageId?: number) => {
    const title = newBranchTitle.trim() || undefined
    setActionNotice('Forking new session branch...')
    const newId = await forkNewBranch(sessionId, messageId, title)
    if (newId) {
      setNewBranchTitle('')
      setBranchInputOpen(false)
      setActionNotice('Branch created! Switched to new session.')
      setTimeout(() => setActionNotice(null), 3000)
    }
  }

  // Filter nodes
  const nodes = topology?.nodes || []
  const filteredNodes = nodes.filter((n) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return n.title.toLowerCase().includes(q) || n.model.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)
  })

  // Group into root nodes vs child branches
  const rootNodes = filteredNodes.filter((n) => !n.parent_session_id)
  const childNodesMap = new Map<string, typeof nodes>()
  for (const n of filteredNodes) {
    if (n.parent_session_id) {
      const list = childNodesMap.get(n.parent_session_id) || []
      list.push(n)
      childNodesMap.set(n.parent_session_id, list)
    }
  }

  const selectedNode = nodes.find((n) => n.id === selectedId)

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in duration-150 font-sans select-none">
      <div
        className="w-full max-w-5xl bg-[#faf8f5] border border-[#d1d1cd] rounded-[20px] shadow-2xl flex flex-col h-[650px] overflow-hidden select-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#d1d1cd] bg-[#fdfbfa] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[12px] bg-[rgba(1,106,113,0.1)] flex items-center justify-center text-[#016a71]">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold text-[#27251e] tracking-tight">Sirona Starmap</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[rgba(1,106,113,0.08)] text-[#016a71] font-semibold">
                  Lineage Topology
                </span>
              </div>
              <p className="text-[11px] text-[#72706b]">
                Genealogical DAG branch topology, checkpoint recovery, and interactive history rewind
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search filter */}
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#92918b]" />
              <input
                type="text"
                placeholder="Search branches..."
                value={searchQuery}
                onChange={(e) => setStarmapSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-[#f5f3ef] border border-[#d1d1cd] rounded-[8px] outline-none text-[#27251e] placeholder:text-[#92918b]"
              />
            </div>

            <button
              onClick={toggleStarmap}
              className="p-1.5 hover:bg-[#f0eee9] text-[#72706b] hover:text-[#27251e] rounded-[8px] transition-colors cursor-pointer"
              title="Close Starmap (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action notice toast */}
        {actionNotice && (
          <div className="bg-[rgba(1,106,113,0.1)] text-[#016a71] px-6 py-2 text-[12px] font-medium border-b border-[#016a71]/20 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Body Split: Left Tree Canvas + Right Lineage Drawer */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Canvas: Branch DAG Forest */}
          <div className="flex-1 overflow-y-auto p-5 bg-[#faf8f5] space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-[#72706b] uppercase tracking-wider">
                Session Lineage Trees ({filteredNodes.length})
              </span>
              <button
                onClick={() => setBranchInputOpen(!branchInputOpen)}
                className="flex items-center gap-1 text-[11px] font-medium text-[#016a71] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Fork Active Branch</span>
              </button>
            </div>

            {/* Quick Fork Box */}
            {branchInputOpen && selectedNode && (
              <div className="p-3 bg-white border border-[#d1d1cd] rounded-[12px] shadow-sm mb-4 animate-in fade-in">
                <span className="text-[11px] font-medium text-[#27251e] block mb-1">
                  Fork new branch from: <strong className="text-[#016a71]">{selectedNode.title}</strong>
                </span>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="New branch title (e.g. Experiment A)..."
                    value={newBranchTitle}
                    onChange={(e) => setNewBranchTitle(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-[11px] bg-[#faf8f5] border border-[#d1d1cd] rounded-[8px] outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => handleForkBranch(selectedNode.id)}
                    className="px-3 py-1.5 text-[11px] bg-[#016a71] text-white rounded-[8px] font-medium hover:bg-[#015257] cursor-pointer"
                  >
                    Create Branch
                  </button>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="py-12 text-center text-[12px] text-[#92918b]">Loading session topology...</div>
            )}

            {!isLoading && rootNodes.length === 0 && (
              <div className="py-12 text-center text-[12px] text-[#92918b]">
                No session branches match your search query.
              </div>
            )}

            {/* Root Nodes and Branches */}
            <div className="space-y-4">
              {rootNodes.map((root) => {
                const isSelected = root.id === selectedId
                const isActive = root.id === activeSessionId
                const children = childNodesMap.get(root.id) || []

                return (
                  <div key={root.id} className="space-y-2">
                    {/* Root Node Card */}
                    <div
                      onClick={() => selectSession(root.id)}
                      className={`p-3.5 rounded-[14px] border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white border-[#016a71] shadow-md ring-1 ring-[#016a71]'
                          : 'bg-[#fdfbfa] border-[#d1d1cd] hover:bg-white hover:border-[#92918b]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 truncate">
                          <MessageSquare className="w-4 h-4 text-[#016a71] shrink-0" />
                          <span className="font-semibold text-[13px] text-[#27251e] truncate">{root.title}</span>
                          {isActive && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#016a71] text-white uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#f5f3ef] text-[#72706b]">
                            {root.model}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenInWorkspace(root.id)
                            }}
                            className="p-1 hover:bg-[#f0eee9] text-[#72706b] hover:text-[#016a71] rounded"
                            title="Open in Workspace"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-[#72706b] font-mono">
                        <span>{root.message_count} messages</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(root.started_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Nested Child Branches */}
                    {children.length > 0 && (
                      <div className="pl-6 border-l-2 border-dashed border-[#d1d1cd] ml-4 space-y-2">
                        {children.map((child) => {
                          const isChildSelected = child.id === selectedId
                          const isChildActive = child.id === activeSessionId
                          const grandChildren = childNodesMap.get(child.id) || []

                          return (
                            <div key={child.id} className="space-y-2">
                              <div
                                onClick={() => selectSession(child.id)}
                                className={`p-3 rounded-[12px] border transition-all cursor-pointer ${
                                  isChildSelected
                                    ? 'bg-white border-[#016a71] shadow-md ring-1 ring-[#016a71]'
                                    : 'bg-[#fdfbfa] border-[#d1d1cd] hover:bg-white'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2 truncate">
                                    <GitFork className="w-3.5 h-3.5 text-[#016a71] shrink-0" />
                                    <span className="font-medium text-[12px] text-[#27251e] truncate">
                                      {child.title}
                                    </span>
                                    {isChildActive && (
                                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#016a71] text-white uppercase">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleOpenInWorkspace(child.id)
                                    }}
                                    className="p-1 hover:bg-[#f0eee9] text-[#72706b] hover:text-[#016a71] rounded"
                                    title="Open in Workspace"
                                  >
                                    <Play className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-[#72706b] font-mono">
                                  <span>{child.message_count} messages</span>
                                  <span>·</span>
                                  <span>forked at turn #{child.branch_point_id || '0'}</span>
                                </div>
                              </div>

                              {/* Grandchildren if any */}
                              {grandChildren.length > 0 && (
                                <div className="pl-5 border-l-2 border-dashed border-[#016a71]/30 ml-3 space-y-1.5">
                                  {grandChildren.map((gc) => (
                                    <div
                                      key={gc.id}
                                      onClick={() => selectSession(gc.id)}
                                      className={`p-2.5 rounded-[10px] border cursor-pointer ${
                                        gc.id === selectedId
                                          ? 'bg-white border-[#016a71] shadow-xs'
                                          : 'bg-[#faf8f5] border-[#e5e5e0] hover:bg-white'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 truncate">
                                          <GitFork className="w-3 h-3 text-[#016a71]" />
                                          <span className="text-[11px] font-medium text-[#27251e] truncate">{gc.title}</span>
                                        </div>
                                        <span className="text-[9px] font-mono text-[#92918b]">#{gc.branch_point_id || '0'}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Inspection Drawer: Lineage Breadcrumbs & Rewindable Turns */}
          <div className="w-[420px] border-l border-[#d1d1cd] bg-[#fdfbfa] flex flex-col shrink-0">
            {selectedNode ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Drawer Header */}
                <div className="p-4 border-b border-[#d1d1cd] bg-[#f5f3ef] shrink-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#72706b]">
                      Lineage Inspector
                    </span>
                    <button
                      onClick={() => handleOpenInWorkspace(selectedNode.id)}
                      className="flex items-center gap-1 text-[11px] font-medium text-[#016a71] hover:underline cursor-pointer"
                    >
                      <span>Switch Workspace Session</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <h3 className="font-semibold text-[14px] text-[#27251e] truncate">{selectedNode.title}</h3>
                  <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-[#72706b]">
                    <span>model: {selectedNode.model}</span>
                    <span>·</span>
                    <span>id: {selectedNode.id.slice(0, 8)}...</span>
                  </div>

                  {/* Ancestry Breadcrumb Trail */}
                  {lineage && lineage.ancestors.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[#e5e5e0] flex items-center gap-1.5 text-[11px] text-[#72706b] overflow-x-auto">
                      <span className="text-[#92918b]">Path:</span>
                      {lineage.ancestors.map((anc) => (
                        <button
                          key={anc.id}
                          onClick={() => selectSession(anc.id)}
                          className="hover:text-[#016a71] underline cursor-pointer truncate max-w-[100px]"
                        >
                          {anc.title}
                        </button>
                      ))}
                      <span>→</span>
                      <span className="font-semibold text-[#016a71] truncate max-w-[120px]">{selectedNode.title}</span>
                    </div>
                  )}
                </div>

                {/* Timeline of Turns & Rewind Affordances */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-[#e5e5e0]">
                    <span className="text-[11px] font-semibold text-[#72706b] uppercase tracking-wider">
                      Turn Timeline ({messages.length})
                    </span>
                    <span className="text-[10px] text-[#92918b]">Click rewind to restore turn</span>
                  </div>

                  {isLoadingLineage && (
                    <div className="py-8 text-center text-[12px] text-[#92918b]">Loading transcript turns...</div>
                  )}

                  {!isLoadingLineage && messages.length === 0 && (
                    <div className="py-8 text-center text-[12px] text-[#92918b]">No messages recorded in this session.</div>
                  )}

                  <div className="space-y-2">
                    {messages.map((m) => {
                      const isUser = m.role === 'user'
                      const isRewinding = rewindingId === m.id

                      return (
                        <div
                          key={m.id}
                          className={`p-2.5 rounded-[10px] border text-[11px] transition-all ${
                            isUser ? 'bg-[#faf8f5] border-[#d1d1cd]' : 'bg-white border-[#e5e5e0]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5 font-medium">
                              {isUser ? (
                                <User className="w-3.5 h-3.5 text-[#016a71]" />
                              ) : (
                                <Bot className="w-3.5 h-3.5 text-[#d97706]" />
                              )}
                              <span className="capitalize text-[#27251e]">{m.role}</span>
                              <span className="text-[#92918b] font-mono text-[10px]">#{m.id}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleForkBranch(selectedNode.id, m.id)}
                                className="px-2 py-0.5 rounded text-[10px] font-medium text-[#016a71] hover:bg-[rgba(1,106,113,0.08)] cursor-pointer"
                                title="Fork branch from this turn"
                              >
                                Fork
                              </button>
                              <button
                                onClick={() => handleRewind(selectedNode.id, m.id)}
                                disabled={isRewinding}
                                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-[#b91c1c] hover:bg-[rgba(185,28,28,0.08)] cursor-pointer disabled:opacity-50"
                                title="Rewind session to this turn"
                              >
                                <RotateCcw className={`w-2.5 h-2.5 ${isRewinding ? 'animate-spin' : ''}`} />
                                <span>Rewind</span>
                              </button>
                            </div>
                          </div>

                          <p className="text-[#52504a] line-clamp-2 leading-relaxed font-sans">
                            {m.content || (m.tool_name ? `Tool: ${m.tool_name}` : 'Empty turn')}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#92918b]">
                <Compass className="w-8 h-8 text-[#d1d1cd] mb-2" />
                <p className="text-[12px] font-medium text-[#72706b]">Select a Session Node</p>
                <p className="text-[11px] mt-1">
                  Click any session branch in the tree to inspect its genealogy and rewind historical turns.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#d1d1cd] bg-[#fdfbfa] flex items-center justify-between shrink-0 text-[12px]">
          <span className="text-[#72706b]">
            Branching creates an isolated conversation fork while preserving historical state.
          </span>
          <button
            onClick={toggleStarmap}
            className="px-4 py-1.5 rounded-[8px] bg-[#016a71] text-white font-medium hover:bg-[#015257] cursor-pointer transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
