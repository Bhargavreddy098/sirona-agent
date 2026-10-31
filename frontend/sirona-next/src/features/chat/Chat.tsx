import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Sparkles,
  ArrowDown,
  Send,
  Square,
  Folder,
  FolderPlus,
  FolderTree,
  Terminal as TerminalIcon,
  Compass,
  X,
  HelpCircle,
  Hammer,
} from 'lucide-react';
import type { Workspace } from '../../app/useWorkspace';
import type { CompanionTab } from '../workspace/WorkspaceCompanion';
import { ModelPicker } from '../../components/ModelPicker';
import { Message } from './Message';
import { InlineApprovalCard } from './InlineApprovalCard';
import { BottomTerminalDeck } from './BottomTerminalDeck';
import { executionApi, type Approval } from '../../api';

export type InteractionMode = 'ask' | 'plan' | 'build';

export interface ChatProps {
  workspace: Workspace;
  onProviders: () => void;
  onOpenCompanion?: (tab?: CompanionTab) => void;
  isCompanionOpen?: boolean;
  activeCompanionTab?: CompanionTab;
}

export function Chat({
  workspace: w,
  onProviders,
  onOpenCompanion,
}: ChatProps) {
  const [draft, setDraft] = useState('');
  const [away, setAway] = useState(false);
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<InteractionMode>('ask');
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalMaximized, setTerminalMaximized] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<Approval[]>([]);

  const loadApprovals = async () => {
    if (!w.projectId) {
      setPendingApprovals([]);
      return;
    }
    try {
      const res = await executionApi.approvals(w.projectId);
      setPendingApprovals((res.approvals || []).filter(a => a.state === 'pending'));
    } catch {
      // approvals endpoint gracefully handles absence
    }
  };

  useEffect(() => {
    void loadApprovals();
    const timer = setInterval(() => void loadApprovals(), 8000);
    return () => clearInterval(timer);
  }, [w.projectId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === '`' || e.key === '~')) {
        e.preventDefault();
        setTerminalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const view = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const follow = useRef(true);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft('');
    follow.current = true;
  }, [w.active?.id]);

  useEffect(() => {
    if (follow.current) {
      view.current?.scrollTo({ top: view.current.scrollHeight, behavior: 'instant' });
    }
  }, [w.messages, w.stream, w.pendingPrompt]);

  useEffect(() => {
    if (input.current) {
      input.current.style.height = 'auto';
      input.current.style.height = `${Math.min(input.current.scrollHeight, 180)}px`;
    }
  }, [draft]);

  const model = w.models.find(m => m.id === w.modelId);
  const usable =
    !!model?.hasConfiguredApiKey &&
    w.connected &&
    !w.modelSaving &&
    !w.messages.some(m => ['pending', 'streaming'].includes(m.status));

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!draft.trim() || sending || w.running) return;
    const text = draft.trim();
    setSending(true);
    setDraft('');
    follow.current = true;

    // Prefix instruction cues if Plan or Build mode is explicitly active
    const effectivePrompt =
      mode === 'plan' && !text.startsWith('[Mode: Plan]')
        ? `[Mode: Plan] ${text}`
        : mode === 'build' && !text.startsWith('[Mode: Build]')
        ? `[Mode: Build] ${text}`
        : text;

    try {
      await w.send(effectivePrompt);
    } finally {
      setSending(false);
    }
  };

  const last = w.messages.at(-1);
  const retryable =
    last && last.role === 'assistant' && ['failed', 'cancelled'].includes(last.status);
  const priorUser = w.messages.findLast(m => m.role === 'user');
  const attachedProject = w.projects.find(p => p.id === w.projectId);

  const handleAttachClick = async () => {
    if (window.sirona?.pickFolder) {
      try {
        const chosen = await window.sirona.pickFolder();
        if (chosen) {
          const name = chosen.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || chosen;
          await w.createProject(name, chosen);
        }
      } catch (err) {
        w.setError(err instanceof Error ? err.message : 'Folder selection failed');
      }
      return;
    }
    if (typeof window.showDirectoryPicker === 'function') {
      try {
        const dirHandle = await window.showDirectoryPicker();
        if (dirHandle) {
          await w.createProject(dirHandle.name);
        }
        return;
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    folderInputRef.current?.click();
  };

  const placeholder = attachedProject
    ? mode === 'plan'
      ? `Plan architecture or a new feature in ${attachedProject.name}…`
      : mode === 'build'
      ? `Build changes, fix issues, or edit files in ${attachedProject.name}…`
      : `Ask about files, logic, or structure in ${attachedProject.name}…`
    : mode === 'plan'
    ? 'Plan a new application, architecture, or workflow…'
    : mode === 'build'
    ? 'Build an implementation task or script…'
    : 'Message the selected model…';

  return (
    <div className="chat-workspace flex-1 flex flex-col min-h-0 bg-[var(--color-canvas)]">
      {/* Transcript Area */}
      <div
        className="transcript flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0"
        ref={view}
        onScroll={() => {
          const node = view.current!;
          follow.current = node.scrollHeight - node.scrollTop - node.clientHeight < 100;
          setAway(!follow.current);
        }}
      >
        {w.messages.length || w.running ? (
          <div className="conversation-column max-w-3xl mx-auto flex flex-col gap-4">
            <div className="date-divider flex items-center gap-3 my-2 text-[var(--text-xs)] text-[var(--color-text-tertiary)]">
              <span className="date-rule flex-1 h-px bg-[var(--color-border)]" />
              <time>
                {new Date((w.messages[0]?.timestamp ?? Date.now() / 1000) * 1000).toDateString() ===
                new Date().toDateString()
                  ? 'Today'
                  : new Date(
                      (w.messages[0]?.timestamp ?? Date.now() / 1000) * 1000
                    ).toLocaleDateString('en-CA')}
              </time>
              <span className="date-rule flex-1 h-px bg-[var(--color-border)]" />
            </div>

            {w.messages
              .filter(m => m.role === 'user' || m.role === 'assistant')
              .map(m => (
                <Message key={m.id} message={m} />
              ))}

            {w.running && (
              <>
                {!w.messages.some(
                  m => m.content === w.pendingPrompt && m.role === 'user'
                ) && (
                  <Message
                    message={{
                      id: 'pending-user',
                      role: 'user',
                      content: w.pendingPrompt,
                      status: 'completed',
                    }}
                  />
                )}
                {w.stream ? (
                  <Message
                    message={{
                      id: 'stream',
                      role: 'assistant',
                      content: w.stream,
                      status: 'streaming',
                    }}
                  />
                ) : (
                  <div className="thinking flex items-center gap-2 text-[var(--text-base)] text-[var(--color-text-secondary)] py-3 px-4 rounded-[var(--radius-2xl)] bg-[var(--color-surface)] border border-[var(--color-border)]" role="status">
                    <Sparkles className="w-4 h-4 text-[var(--color-primary)] animate-spin" />
                    <span>
                      The selected model is thinking<span className="thinking-dots">…</span>
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Inline Permission / Approval Cards */}
            {pendingApprovals.map(approval => (
              <InlineApprovalCard
                key={approval.id}
                approval={approval}
                projectId={w.projectId}
                onDecided={() => void loadApprovals()}
              />
            ))}

            {!w.running && retryable && priorUser && (
              <div className="flex justify-center mt-2">
                <button
                  type="button"
                  className="secondary retry px-4 py-2 text-[var(--text-xs)] font-[var(--font-semibold)] rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-text-primary)] hover:bg-[var(--color-hover)] transition-colors cursor-pointer"
                  onClick={() => void w.send(priorUser.content, last.id)}
                >
                  Retry turn
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state max-w-xl mx-auto py-12 px-4 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)] mb-4 shadow-xs">
              <Sparkles className="w-6 h-6" strokeWidth={2} />
            </div>
            <h1 className="text-xl font-[var(--font-semibold)] text-[var(--color-text-primary)] mb-1">
              {attachedProject ? `Workspace ready: ${attachedProject.name}` : 'What would you like to build?'}
            </h1>
            <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)] mb-6">
              {attachedProject
                ? 'Ask questions about your code, produce structured implementation plans, or execute changes.'
                : 'Chat freely with registered AI models, or attach a local project to enable workspace tools.'}
            </p>

            {/* Quick Action Suggestion Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left mb-6">
              {attachedProject ? (
                <>
                  <button
                    type="button"
                    className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)] transition-all text-xs cursor-pointer"
                    onClick={() => {
                      setMode('ask');
                      setDraft('Explain the architecture, entry points, and directory structure of this project.');
                    }}
                  >
                    <span className="font-[var(--font-semibold)] text-[var(--color-text-primary)] block mb-0.5">Explore codebase</span>
                    <span className="text-[var(--color-text-tertiary)] text-[11px] block">Understand structure, dependencies & scripts</span>
                  </button>
                  <button
                    type="button"
                    className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)] transition-all text-xs cursor-pointer"
                    onClick={() => {
                      setMode('plan');
                      setDraft('Create a step-by-step implementation plan for: ');
                    }}
                  >
                    <span className="font-[var(--font-semibold)] text-[var(--color-text-primary)] block mb-0.5">Create feature plan</span>
                    <span className="text-[var(--color-text-tertiary)] text-[11px] block">Design requirements before writing code</span>
                  </button>
                  <button
                    type="button"
                    className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)] transition-all text-xs cursor-pointer"
                    onClick={() => {
                      if (onOpenCompanion) onOpenCompanion('files');
                    }}
                  >
                    <span className="font-[var(--font-semibold)] text-[var(--color-text-primary)] block mb-0.5">Inspect project files</span>
                    <span className="text-[var(--color-text-tertiary)] text-[11px] block">Browse directory tree & file contents</span>
                  </button>
                  <button
                    type="button"
                    className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)] transition-all text-xs cursor-pointer"
                    onClick={() => {
                      setTerminalOpen(true);
                    }}
                  >
                    <span className="font-[var(--font-semibold)] text-[var(--color-text-primary)] block mb-0.5">Open terminal session</span>
                    <span className="text-[var(--color-text-tertiary)] text-[11px] block">Run authorized commands in project workspace</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)] transition-all text-xs cursor-pointer"
                    onClick={() => void handleAttachClick()}
                  >
                    <span className="font-[var(--font-semibold)] text-[var(--color-text-primary)] block mb-0.5">Attach local project</span>
                    <span className="text-[var(--color-text-tertiary)] text-[11px] block">Pick a local folder from your computer</span>
                  </button>
                  <button
                    type="button"
                    className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)] transition-all text-xs cursor-pointer"
                    onClick={() => {
                      setDraft('Help me design an architecture for a new web application.');
                    }}
                  >
                    <span className="font-[var(--font-semibold)] text-[var(--color-text-primary)] block mb-0.5">Brainstorm architecture</span>
                    <span className="text-[var(--color-text-tertiary)] text-[11px] block">Discuss system design and best practices</span>
                  </button>
                </>
              )}
            </div>

            {!usable && (
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-[var(--font-semibold)] rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors cursor-pointer"
                onClick={onProviders}
              >
                Connect a model provider
              </button>
            )}
          </div>
        )}
      </div>

      {/* Collapsible Bottom Terminal Deck (VS Code / Cursor style) */}
      <BottomTerminalDeck
        projectId={w.projectId}
        isOpen={terminalOpen}
        isMaximized={terminalMaximized}
        onToggleMaximize={() => setTerminalMaximized(prev => !prev)}
        onClose={() => setTerminalOpen(false)}
      />

      {/* Composer Area */}
      <div className="composer-area px-4 sm:px-6 pb-4 pt-1 max-w-3xl w-full mx-auto">
        {away && (
          <div className="flex justify-center mb-2">
            <button
              type="button"
              className="scroll-bottom inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-[#e7e8ec] shadow-sm text-[#5d6470] hover:text-[#16181d] hover:bg-[#f3f4f6] transition-colors cursor-pointer"
              aria-label="Scroll to latest message"
              onClick={() => {
                follow.current = true;
                view.current?.scrollTo({
                  top: view.current.scrollHeight,
                  behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
                    ? 'instant'
                    : 'smooth',
                });
                setAway(false);
              }}
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>
        )}

        {!w.running &&
          w.failedPrompt &&
          !w.messages.some(m => m.role === 'user' && m.content === w.failedPrompt) && (
            <div className="flex justify-center mb-2">
              <button
                type="button"
                className="secondary retry text-xs px-3 py-1.5 rounded-lg border border-[#e7e8ec] bg-white text-[#d92d20] hover:bg-[#fdebe9] transition-colors cursor-pointer"
                onClick={() => void w.send(w.failedPrompt)}
              >
                Retry unsaved message
              </button>
            </div>
          )}

        {/* Attached Project / Attach Button Bar */}
        <div className="composer-project-bar mb-2">
          {attachedProject ? (
            <div
              className="attached-project-pill flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-default)] text-xs transition-colors"
              title={attachedProject.primary_path ?? attachedProject.name}
            >
              <Folder className="w-4 h-4 text-[var(--accent-primary)] shrink-0" strokeWidth={2} />
              <strong className="font-semibold text-[var(--fg-primary)] truncate max-w-[140px] tracking-tight">
                {attachedProject.name}
              </strong>
              {attachedProject.primary_path && (
                <span
                  className="text-[var(--fg-subtle)] truncate max-w-[180px] hidden sm:inline text-[11px] font-mono"
                  title={attachedProject.primary_path}
                >
                  {attachedProject.primary_path}
                </span>
              )}

              <div className="flex items-center gap-1 ml-auto">
                {onOpenCompanion && (
                  <>
                    <button
                      type="button"
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-[var(--fg-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)] transition-all cursor-pointer"
                      onClick={() => onOpenCompanion('files')}
                      title="Inspect project files"
                    >
                      <FolderTree className="w-3 h-3" />
                      <span>Files</span>
                    </button>
                    <button
                      type="button"
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                        terminalOpen
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-900/50'
                          : 'text-[var(--fg-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)]'
                      }`}
                      onClick={() => setTerminalOpen(prev => !prev)}
                      title="Toggle bottom terminal deck (Ctrl+`)"
                    >
                      <TerminalIcon className="w-3 h-3" />
                      <span>Terminal</span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-[var(--fg-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)] transition-all cursor-pointer"
                      onClick={() => onOpenCompanion('planning')}
                      title="View plans"
                    >
                      <Compass className="w-3 h-3" />
                      <span>Plan</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[var(--fg-subtle)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-all cursor-pointer ml-1"
                  aria-label={`Remove ${attachedProject.name} project from chat`}
                  title="Remove project from chat"
                  onClick={() => w.detachProject()}
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="attach-project-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface-subtle)] text-[var(--fg-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)] transition-all cursor-pointer"
                title="Open native folder picker"
                onClick={() => void handleAttachClick()}
              >
                <FolderPlus className="w-3.5 h-3.5 text-[var(--fg-muted)]" />
                <span>Attach folder</span>
              </button>
              <input
                ref={folderInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={async event => {
                  const files = event.target.files;
                  if (!files || !files.length) return;
                  const first = files[0];
                  const nativePath = (first as unknown as { path?: string }).path
                    ? (first as unknown as { path: string }).path.replace(/[\\/][^\\/]+$/, '')
                    : undefined;
                  const folderName = first.webkitRelativePath
                    ? first.webkitRelativePath.split('/')[0]
                    : first.name;
                  try {
                    await w.createProject(folderName, nativePath);
                  } catch (err) {
                    w.setError(err instanceof Error ? err.message : 'Could not attach folder');
                  }
                  event.target.value = '';
                }}
              />
            </div>
          )}
        </div>

        {/* Input Card Container */}
        <form
          className="composer border border-[var(--border-default)] rounded-2xl bg-[var(--bg-surface)] shadow-md focus-within:border-[var(--accent-primary)] focus-within:ring-2 focus-within:ring-[var(--accent-subtle)] transition-all p-3"
          onSubmit={e => void submit(e)}
        >
          <label htmlFor="message" className="visually-hidden">
            Message the selected model
          </label>
          <textarea
            ref={input}
            id="message"
            name="message"
            maxLength={100000}
            placeholder={placeholder}
            rows={2}
            value={draft}
            disabled={!usable}
            className="w-full bg-transparent border-0 resize-none outline-none text-[13.5px] text-[var(--fg-primary)] placeholder:text-[var(--fg-subtle)] leading-relaxed p-1"
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void submit();
              }
            }}
          />

          <div className="composer-footer flex items-center justify-between pt-2 mt-1 border-t border-[var(--border-subtle)]">
            {/* Left: Mode Switcher */}
            <div className="flex items-center gap-1 p-0.5 bg-[var(--bg-surface-subtle)] rounded-lg text-xs border border-[var(--border-subtle)]">
              <button
                type="button"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  mode === 'ask'
                    ? 'bg-[var(--bg-surface)] text-[var(--fg-primary)] font-semibold shadow-xs'
                    : 'text-[var(--fg-secondary)] hover:text-[var(--fg-primary)]'
                }`}
                onClick={() => setMode('ask')}
                title="Ask: Code understanding & safe explanations"
              >
                <HelpCircle className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Ask</span>
              </button>
              <button
                type="button"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  mode === 'plan'
                    ? 'bg-[var(--bg-surface)] text-[var(--fg-primary)] font-semibold shadow-xs'
                    : 'text-[var(--fg-secondary)] hover:text-[var(--fg-primary)]'
                }`}
                onClick={() => setMode('plan')}
                title="Plan: Structure implementation tasks before building"
              >
                <Compass className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Plan</span>
              </button>
              <button
                type="button"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  mode === 'build'
                    ? 'bg-[var(--bg-surface)] text-[var(--fg-primary)] font-semibold shadow-xs'
                    : 'text-[var(--fg-secondary)] hover:text-[var(--fg-primary)]'
                }`}
                onClick={() => setMode('build')}
                title="Build: Execute changes with approved tool runtimes"
              >
                <Hammer className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Build</span>
              </button>
            </div>

            {/* Right: Model Picker & Send Button */}
            <div className="flex items-center gap-2">
              <ModelPicker
                models={w.models}
                value={w.modelId}
                onChange={w.setModelId}
                disabled={w.running || w.modelSaving}
              />
              <span className="connection-label text-[11px] text-[var(--fg-subtle)] hidden md:inline">
                {model?.connectionName ?? model?.provider ?? 'No connection'}
              </span>

              {w.running ? (
                <button
                  type="button"
                  className="send inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--danger)] text-white hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs"
                  aria-label="Stop generation"
                  onClick={w.stop}
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="send inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                  aria-label="Send message"
                  disabled={!usable || !draft.trim() || sending}
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </form>

        {!usable && (
          <p className="composer-hint text-xs text-[var(--fg-subtle)] text-center mt-2">
            Connect a model provider to start chatting.
          </p>
        )}
      </div>
    </div>
  );
}

export default Chat;
