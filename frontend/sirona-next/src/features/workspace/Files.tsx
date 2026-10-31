import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, RefreshCw, FolderPlus, Key } from 'lucide-react';
import { executionApi, type Grant } from '../../api/execution';
import { workspaceApi } from '../../api/workspace';
import { Dialog } from '../../components/ui/Dialog';
import { messageOf } from './useRun';

type FileEntry = { path: string; bytes: number; digest: string };
type FilePreview = { path: string; content: string; digest: string; bytes: number };

export function Files({ projectId }: { projectId: string }) {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [root, setRoot] = useState('');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [preview, setPreview] = useState<FilePreview>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [filter, setFilter] = useState('');

  const alive = useRef(true);
  const fileVersion = useRef(0);
  const operation = useRef(false);
  const registrationKey = useRef(crypto.randomUUID());

  const roots = grants.filter(grant => grant.capability === 'workspace_root');

  const load = useCallback(
    async (rootRef: string, offset = 0) => {
      setBusy('files');
      setError('');
      try {
        const result = await workspaceApi.files(projectId, rootRef, offset);
        if (alive.current) {
          setFiles(previous =>
            offset
              ? [...previous, ...result.files.filter(file => !previous.some(old => old.path === file.path))]
              : result.files
          );
          setNext(result.nextOffset);
          setTotal(result.total);
        }
      } catch (cause) {
        if (alive.current) setError(messageOf(cause));
      } finally {
        if (alive.current) setBusy('');
      }
    },
    [projectId]
  );

  const refresh = useCallback(async () => {
    setBusy('grants');
    setError('');
    try {
      const result = await executionApi.grants(projectId);
      if (alive.current) {
        setGrants(result);
        setRoot(previous =>
          result.some(grant => grant.id === previous && grant.capability === 'workspace_root')
            ? previous
            : result.find(grant => grant.capability === 'workspace_root')?.id ?? ''
        );
      }
    } catch (cause) {
      if (alive.current) setError(messageOf(cause));
    } finally {
      if (alive.current) setBusy('');
    }
  }, [projectId]);

  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => {
      alive.current = false;
      ++fileVersion.current;
    };
  }, [refresh]);

  useEffect(() => {
    setFiles([]);
    setPreview(undefined);
    setNext(null);
    ++fileVersion.current;
    if (root) void load(root);
  }, [root, load]);

  const open = async (path: string) => {
    const version = ++fileVersion.current;
    setBusy('preview');
    setError('');
    setPreview(undefined);
    try {
      const result = await workspaceApi.file(projectId, root, path);
      if (alive.current && version === fileVersion.current) setPreview(result);
    } catch (cause) {
      if (alive.current && version === fileVersion.current) setError(messageOf(cause));
    } finally {
      if (alive.current && version === fileVersion.current) setBusy('');
    }
  };

  const register = async () => {
    if (operation.current) return;
    operation.current = true;
    setBusy('register');
    setError('');
    try {
      const result = await workspaceApi.registerRoot(projectId, registrationKey.current);
      if (alive.current) {
        registrationKey.current = crypto.randomUUID();
        setConfirm(false);
        await refresh();
        setRoot(result.rootRef);
      }
    } catch (cause) {
      if (alive.current) setError(messageOf(cause));
    } finally {
      operation.current = false;
      if (alive.current) setBusy('');
    }
  };

  return (
    <section aria-label="Project files" className="space-y-4">
      <div className="workspace-toolbar flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <h2 className="text-base font-semibold text-[var(--fg-primary)] tracking-tight">Files</h2>
          <p className="muted text-xs text-[var(--fg-muted)] mt-0.5">
            Browse the registered project directory. Reading files requires an active file-access grant.
          </p>
        </div>
        <button
          className="secondary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-surface-hover)] text-xs font-medium text-[var(--fg-secondary)] transition-all cursor-pointer disabled:opacity-50"
          disabled={!!busy}
          onClick={() => void refresh()}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
          <span>Refresh access</span>
        </button>
      </div>

      {error && (
        <p className="notice error p-3 rounded-lg bg-[var(--danger-bg)] text-[var(--danger)] text-xs border border-[var(--danger)]/20" role="alert">
          {error}
        </p>
      )}

      {busy === 'grants' && <p role="status" className="muted text-xs text-[var(--fg-muted)]">Checking project access…</p>}

      {!roots.length && busy !== 'grants' && (
        <div className="workspace-empty p-8 rounded-xl border border-dashed border-[var(--border-default)] text-center flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-surface)] flex items-center justify-center text-[var(--fg-muted)] border border-[var(--border-default)]">
            <FolderPlus className="w-5 h-5 text-[var(--accent-primary)]" />
          </div>
          <h3 className="text-sm font-medium text-[var(--fg-primary)]">Connect this project’s files</h3>
          <p className="text-xs text-[var(--fg-muted)] max-w-md">
            Registering the project directory creates an approved workspace boundary. Shell access or changes still require explicit approvals.
          </p>
          <button
            className="secondary inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] text-xs font-medium transition-all shadow-xs cursor-pointer disabled:opacity-50 mt-1"
            disabled={!!busy}
            onClick={() => setConfirm(true)}
          >
            Register project directory
          </button>
        </div>
      )}

      {roots.length > 0 && (
        <>
          <label className="workspace-field block text-xs font-medium text-[var(--fg-secondary)] mb-3">
            <span className="block mb-1.5">Registered directory</span>
            <select
              aria-label="Registered directory"
              value={root}
              onChange={event => setRoot(event.target.value)}
              disabled={!!busy}
              className="w-full max-w-md px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-xs text-[var(--fg-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            >
              {roots.map(grant => (
                <option key={grant.id} value={grant.id}>
                  {typeof grant.resource_scope.workspaceRoot === 'string'
                    ? grant.resource_scope.workspaceRoot
                    : grant.id}
                </option>
              ))}
            </select>
          </label>

          <div className="file-workspace grid grid-cols-1 md:grid-cols-[280px_1fr] border border-[var(--border-default)] rounded-xl overflow-hidden min-h-[420px] bg-[var(--bg-canvas)]">
            <div className="file-list p-3 border-r border-[var(--border-default)] flex flex-col gap-2 bg-[var(--bg-surface)]">
              <label className="visually-hidden sr-only" htmlFor="file-filter">
                Filter loaded files
              </label>
              <input
                id="file-filter"
                placeholder="Filter files..."
                value={filter}
                onChange={event => setFilter(event.target.value)}
                className="w-full px-2.5 py-1.5 bg-[var(--bg-canvas)] border border-[var(--border-default)] rounded-md text-xs text-[var(--fg-primary)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
              <p className="muted text-[11px] text-[var(--fg-muted)] px-1 tabular-nums">
                {files.length} of {total} files
              </p>
              <div className="flex-1 overflow-y-auto space-y-0.5 max-h-[360px] pr-1">
                {files
                  .filter(file => file.path.toLocaleLowerCase().includes(filter.toLocaleLowerCase()))
                  .map(file => {
                    const isSelected = preview?.path === file.path;
                    return (
                      <button
                        key={file.path}
                        className={`file-row w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-all duration-100 cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--accent-subtle)] text-[var(--accent-text)] font-medium'
                            : 'hover:bg-[var(--bg-surface-hover)] text-[var(--fg-primary)]'
                        }`}
                        aria-current={isSelected ? 'page' : undefined}
                        onClick={() => void open(file.path)}
                      >
                        <span className="flex items-center gap-1.5 truncate min-w-0">
                          <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[var(--accent-primary)]' : 'text-[var(--fg-muted)]'}`} />
                          <span className="truncate">{file.path}</span>
                        </span>
                        <small className="text-[10px] text-[var(--fg-muted)] font-mono shrink-0 tabular-nums">
                          {file.bytes.toLocaleString()} B
                        </small>
                      </button>
                    );
                  })}
              </div>
              {!files.length && !busy && (
                <p className="muted text-xs text-[var(--fg-muted)] text-center py-4">
                  No files returned for this directory.
                </p>
              )}
              {next !== null && (
                <button
                  className="secondary w-full py-1.5 text-xs text-center border border-[var(--border-default)] rounded-md hover:bg-[var(--bg-surface-hover)] text-[var(--fg-secondary)]"
                  disabled={!!busy}
                  onClick={() => void load(root, next)}
                >
                  Load more files
                </button>
              )}
            </div>

            <div className="file-preview p-4 flex flex-col min-w-0 bg-[var(--bg-canvas)]">
              {busy === 'preview' ? (
                <div className="flex items-center justify-center h-full text-xs text-[var(--fg-muted)]">
                  Loading file…
                </div>
              ) : preview ? (
                <div className="flex flex-col h-full min-w-0">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--border-subtle)]">
                    <div>
                      <h3 className="text-xs font-semibold text-[var(--fg-primary)] font-mono truncate">{preview.path}</h3>
                      <p className="muted text-[11px] text-[var(--fg-muted)]">
                        Read-only preview · {preview.bytes.toLocaleString()} bytes
                      </p>
                    </div>
                  </div>
                  <pre
                    tabIndex={0}
                    aria-label={`Contents of ${preview.path}`}
                    className="flex-1 p-3.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] text-xs font-mono text-[var(--fg-primary)] overflow-auto max-h-[460px] leading-relaxed whitespace-pre-wrap select-text"
                  >
                    <code>{preview.content}</code>
                  </pre>
                  <details className="mt-3 text-[11px] text-[var(--fg-muted)]">
                    <summary className="cursor-pointer hover:text-[var(--fg-primary)]">Content digest</summary>
                    <code className="digest block mt-1 p-1.5 bg-[var(--bg-surface)] rounded text-[10px] font-mono break-all text-[var(--fg-secondary)]">
                      {preview.digest}
                    </code>
                  </details>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-[var(--fg-muted)]">
                  <FileText className="w-8 h-8 stroke-[1.25] mb-2 opacity-50" />
                  <p className="text-xs max-w-sm">
                    Select a file to inspect its content. Changes reach the host only through approved patch workflows.
                  </p>
                </div>
              )}
            </div>
          </div>
          {busy === 'files' && <p className="muted text-xs text-[var(--fg-muted)]" role="status">Loading files…</p>}
        </>
      )}

      <details className="workspace-permissions pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--fg-secondary)]">
        <summary className="cursor-pointer font-medium hover:text-[var(--fg-primary)] inline-flex items-center gap-1.5">
          <Key className="w-3.5 h-3.5 text-[var(--fg-muted)]" />
          <span>Active project permissions ({grants.length})</span>
        </summary>
        {grants.length ? (
          <ul className="mt-2 space-y-1.5 pl-5">
            {grants.map(grant => (
              <li key={grant.id} className="text-xs">
                <strong className="text-[var(--fg-primary)]">{grant.capability}</strong>
                <span className="text-[var(--fg-muted)] block text-[11px]">
                  Expires {new Date(grant.expires_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted text-xs text-[var(--fg-muted)] mt-1.5 pl-5">No active permissions returned.</p>
        )}
      </details>

      <Dialog
        open={confirm}
        onClose={() => {
          if (!operation.current) setConfirm(false);
        }}
        title="Register this project directory?"
      >
        <p className="text-xs text-[var(--fg-secondary)] leading-relaxed mb-4">
          This creates a scoped, eight-hour directory registration for the current project. File reads still require an existing grant. It does not enable host execution or grant write access.
        </p>
        {error && (
          <p className="notice error text-xs text-[var(--danger)] bg-[var(--danger-bg)] p-2.5 rounded-lg mb-3" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <button
            className="secondary px-3 py-1.5 rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-surface-hover)] text-xs font-medium cursor-pointer"
            disabled={!!busy}
            onClick={() => setConfirm(false)}
          >
            Keep disconnected
          </button>
          <button
            className="primary px-3.5 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] text-xs font-medium cursor-pointer shadow-xs disabled:opacity-50"
            disabled={!!busy}
            onClick={() => void register()}
          >
            {busy === 'register' ? 'Registering…' : 'Register directory'}
          </button>
        </div>
      </Dialog>
    </section>
  );
}
