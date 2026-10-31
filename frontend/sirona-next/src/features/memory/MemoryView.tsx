import { useEffect, useState, useCallback } from 'react';
import {
  Brain,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Share2,
  Database,
  AlertCircle,
} from 'lucide-react';
import {
  memoryApi,
  type memoryRecordSchema,
  type knowledgeNodeSchema,
  type knowledgeEdgeSchema,
} from '../../api';
import type { z } from 'zod';

type Memory = z.infer<typeof memoryRecordSchema>;
type Node = z.infer<typeof knowledgeNodeSchema>;
type Edge = z.infer<typeof knowledgeEdgeSchema>;

export function MemoryView({
  projectId,
  onBack,
}: {
  projectId?: string;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<'memories' | 'graph'>('memories');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Create Memory Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newKind, setNewKind] = useState('decision');

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      if (tab === 'memories') {
        const res = await memoryApi.memories(projectId);
        setMemories(res.memories || res.items || []);
      } else {
        const [nodeRes, edgeRes] = await Promise.all([
          memoryApi.knowledgeNodes(projectId),
          memoryApi.knowledgeEdges(projectId),
        ]);
        setNodes(nodeRes.nodes || []);
        setEdges(edgeRes.edges || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memory data');
    } finally {
      setLoading(false);
    }
  }, [tab, projectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !searchQuery.trim()) {
      await loadData();
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const res = await memoryApi.searchMemories(projectId, searchQuery.trim());
      setMemories(res.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Memory search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !newContent.trim()) return;
    try {
      await memoryApi.createMemory(projectId, newContent.trim(), newKind);
      setShowCreateModal(false);
      setNewContent('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record memory');
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    try {
      await memoryApi.deleteMemory(memoryId);
      setMemories(prev => prev.filter(m => m.id !== memoryId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete memory');
    }
  };

  const handleTriggerIndex = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      await memoryApi.indexKnowledge(projectId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Knowledge indexing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            ← Back
          </button>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
          <h1 className="text-base font-semibold tracking-tight">Project Memory & Knowledge Graph</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {tab === 'memories' && projectId && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Record Memory</span>
            </button>
          )}

          {tab === 'graph' && projectId && (
            <button
              onClick={handleTriggerIndex}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-xs font-medium transition-colors"
            >
              <Database size={14} />
              <span>Re-index Graph</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 pt-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-900/20">
        <button
          onClick={() => setTab('memories')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            tab === 'memories'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Brain size={14} />
          <span>Semantic Memories</span>
        </button>

        <button
          onClick={() => setTab('graph')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            tab === 'graph'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Share2 size={14} />
          <span>Knowledge Graph ({nodes.length} nodes)</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-lg">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {!projectId ? (
          <div className="p-8 text-center text-zinc-500 text-xs">
            Select an active project to explore long-term memories and knowledge nodes.
          </div>
        ) : tab === 'memories' ? (
          <div className="space-y-4">
            {/* Search Input */}
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Semantic search memories (e.g. 'auth decisions', 'database schema choice')..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="px-3.5 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {searching ? 'Searching…' : 'Search'}
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    void loadData();
                  }}
                  className="px-2.5 py-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  Clear
                </button>
              )}
            </form>

            {/* Memories Feed */}
            {memories.length === 0 && !loading ? (
              <div className="p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 text-xs">
                No memories found matching your criteria.
              </div>
            ) : (
              <div className="grid gap-3">
                {memories.map(m => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/30 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200/50 dark:border-blue-900/50">
                          {m.memoryKind || 'general'}
                        </span>
                        {m.relevanceScore !== undefined && (
                          <span className="text-[11px] text-zinc-400">
                            Score: {(m.relevanceScore * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteMemory(m.id)}
                        className="text-zinc-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
                        title="Delete memory"
                        aria-label="Delete memory"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans whitespace-pre-wrap">
                      {m.content}
                    </p>

                    {m.createdAt && (
                      <span className="text-[10px] text-zinc-400 mt-2 block font-mono">
                        Recorded {new Date(m.createdAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Knowledge Graph Tab */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nodes Column */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/20 dark:bg-zinc-900/20">
                <h2 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
                  <Database size={14} />
                  <span>Knowledge Entities & AST Nodes ({nodes.length})</span>
                </h2>
                {nodes.length === 0 ? (
                  <p className="text-xs text-zinc-400">No indexed nodes found. Click Re-index Graph above.</p>
                ) : (
                  <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1">
                    {nodes.map(n => (
                      <div
                        key={n.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs"
                      >
                        <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate max-w-[200px]">
                          {n.label}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                          {n.kind || 'symbol'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Edges Column */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/20 dark:bg-zinc-900/20">
                <h2 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
                  <Share2 size={14} />
                  <span>Relationships & Dependencies ({edges.length})</span>
                </h2>
                {edges.length === 0 ? (
                  <p className="text-xs text-zinc-400">No indexed relationships found.</p>
                ) : (
                  <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1">
                    {edges.map(e => (
                      <div
                        key={e.id}
                        className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300"
                      >
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="text-blue-500 font-semibold">{e.source}</span>
                          <span className="text-zinc-400">→</span>
                          <span className="text-emerald-500 font-semibold">{e.target}</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 block mt-0.5">
                          rel: {e.relationship}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Record Memory Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl w-full max-w-md p-5 text-xs">
            <h2 className="text-sm font-semibold mb-3">Record Project Memory</h2>
            <form onSubmit={handleCreateMemory} className="space-y-3">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                  Category / Kind
                </label>
                <select
                  value={newKind}
                  onChange={e => setNewKind(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="decision">Architectural Decision</option>
                  <option value="convention">Code Convention</option>
                  <option value="constraint">Security / System Constraint</option>
                  <option value="context">Project Context</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                  Memory Content
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Record an architectural constraint or requirement for agents to remember..."
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-xs"
                >
                  Save Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
