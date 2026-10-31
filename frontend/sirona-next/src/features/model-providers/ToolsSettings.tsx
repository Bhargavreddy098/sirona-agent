import { useEffect, useState, useCallback } from 'react';
import { Wrench, Terminal, RefreshCw, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { toolsApi, type toolDefinitionSchema, type developerConnectionSchema } from '../../api';
import type { z } from 'zod';

type Tool = z.infer<typeof toolDefinitionSchema>;
type DevConn = z.infer<typeof developerConnectionSchema>;

export function ToolsSettings() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [connections, setConnections] = useState<DevConn[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // New Connection Form
  const [showNewModal, setShowNewModal] = useState(false);
  const [connName, setConnName] = useState('');
  const [connKind, setConnKind] = useState('claude_code');
  const [connEndpoint, setConnEndpoint] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, cRes] = await Promise.all([
        toolsApi.tools(),
        toolsApi.connections(),
      ]);
      setTools(tRes.catalog || tRes.tools || []);
      setConnections(cRes.connections || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tools and connections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleQualify = async (id: string) => {
    setBusy(`qualify:${id}`);
    try {
      const res = await toolsApi.qualifyConnection(id);
      setNotice(res.qualified ? 'Connection qualified successfully!' : 'Connection qualification returned false');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Qualification failed');
    } finally {
      setBusy(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    setBusy(`disc:${id}`);
    try {
      await toolsApi.disconnectConnection(id);
      setNotice('Connection disconnected');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed');
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(`del:${id}`);
    try {
      await toolsApi.deleteConnection(id);
      setNotice('Connection removed');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connName.trim()) return;
    try {
      await toolsApi.createConnection(connName.trim(), connKind, connEndpoint.trim() || undefined);
      setShowNewModal(false);
      setConnName('');
      setConnEndpoint('');
      setNotice('Developer tool connection created');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register connection');
    }
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div className="flex items-center gap-2 p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-lg">
          <CheckCircle2 size={15} />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-lg">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Developer CLI Connections Section */}
      <section className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--fg-primary)] flex items-center gap-2">
              <Terminal size={15} />
              <span>Developer Adapters & CLI Connections</span>
            </h2>
            <p className="text-xs text-[var(--fg-secondary)] mt-0.5">
              Connect external coding tools (Codex CLI, Claude Code, custom MCP workers).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="p-1.5 rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-[var(--fg-secondary)] transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)] transition-colors shadow-xs cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Connect Tool</span>
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {connections.length === 0 && !loading ? (
            <div className="p-6 text-center border border-dashed border-[var(--border-default)] rounded-xl text-xs text-[var(--fg-secondary)]">
              No developer CLI connections registered.
            </div>
          ) : (
            connections.map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-subtle)] text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="font-semibold text-[var(--fg-primary)]">{c.name}</strong>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50">
                      {c.kind}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        c.status === 'connected'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  {c.endpoint && (
                    <code className="text-[11px] text-[var(--fg-muted)] block mt-1 font-mono">
                      {c.endpoint}
                    </code>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={!!busy}
                    onClick={() => handleQualify(c.id)}
                    className="px-2.5 py-1 rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {busy === `qualify:${c.id}` ? 'Qualifying…' : 'Qualify'}
                  </button>
                  {c.status === 'connected' && (
                    <button
                      disabled={!!busy}
                      onClick={() => handleDisconnect(c.id)}
                      className="px-2.5 py-1 rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  )}
                  <button
                    disabled={!!busy}
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer disabled:opacity-50"
                    title="Remove connection"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Tool Catalog Section */}
      <section className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-xs">
        <h2 className="text-sm font-semibold text-[var(--fg-primary)] flex items-center gap-2 mb-1">
          <Wrench size={15} />
          <span>Registered Tool Catalog ({tools.length})</span>
        </h2>
        <p className="text-xs text-[var(--fg-secondary)] mb-4">
          Sandboxed capabilities available for autonomous agent execution.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tools.map(t => (
            <div
              key={t.id}
              className="p-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-subtle)] text-xs"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold text-[var(--fg-primary)] truncate">{t.name}</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    t.riskLevel === 'read_only'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : t.riskLevel === 'high_impact'
                        ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                        : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                  }`}
                >
                  {t.riskLevel || 'guarded'}
                </span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 text-[11px] line-clamp-2">
                {t.description || 'No description provided.'}
              </p>
              <span className="text-[10px] text-zinc-400 mt-2 block font-mono">
                id: {t.id}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* New Connection Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl w-full max-w-md p-5 text-xs text-zinc-900 dark:text-zinc-100">
            <h2 className="text-sm font-semibold mb-3">Connect Developer CLI Tool</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                  Connection Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Local Codex Adapter"
                  value={connName}
                  onChange={e => setConnName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                  Tool Kind / Protocol
                </label>
                <select
                  value={connKind}
                  onChange={e => setConnKind(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="claude_code">Claude Code CLI</option>
                  <option value="codex">Codex CLI</option>
                  <option value="mcp_server">MCP Protocol Server</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                  Endpoint / Command
                </label>
                <input
                  type="text"
                  placeholder="e.g. stdio or http://127.0.0.1:4000"
                  value={connEndpoint}
                  onChange={e => setConnEndpoint(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-xs"
                >
                  Register Connection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
