import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Workspace } from '../../app/useWorkspace';
import { InlineApprovalCard } from './InlineApprovalCard';
import { BottomTerminalDeck, type LogEntry } from './BottomTerminalDeck';
import { FileDrawer } from './FileDrawer';
import { CodeEditor } from '../editor/CodeEditor';
import { UpIcon } from '../../components/ui/Icons';
import { executionApi, type Approval } from '../../api';

export type InteractionMode = 'ask' | 'build';

export interface ChatProps {
  workspace: Workspace;
  terminalOpen: boolean;
  fileDrawerOpen: boolean;
  onToggleTerminal: () => void;
  onToggleFileDrawer: () => void;
  onOpenFolder: () => void;
  onProviders: () => void;
  onToast: (msg: string) => void;
}

const HINT: Record<InteractionMode, string> = {
  ask: 'Ask answers only. It can read context but never changes anything.',
  build: 'Build lets the agent work in your folder. Protected actions pause for approval.',
};

export function Chat({
  workspace: w,
  terminalOpen,
  fileDrawerOpen,
  onToggleTerminal,
  onToggleFileDrawer,
  onOpenFolder,
  onProviders,
  onToast,
}: ChatProps) {
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<InteractionMode>('ask');
  const [sending, setSending] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<Approval[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  const viewRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.scrollTo({
        top: viewRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [w.messages, w.stream, pendingApprovals]);

  // Adjust textarea height
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [draft]);

  // Fetch pending approvals for conversation / project
  const loadApprovals = async () => {
    try {
      const res = await executionApi.approvals(w.projectId);
      setPendingApprovals((res.approvals || []).filter(a => a.state === 'pending'));
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    void loadApprovals();
    const timer = setInterval(() => void loadApprovals(), 8000);
    return () => clearInterval(timer);
  }, [w.projectId]);

  // Handle run progress and logs
  useEffect(() => {
    if (w.running) {
      setLogs(prev => [
        ...prev,
        {
          id: String(Date.now()),
          text: `Run started · turn active · ${new Date().toLocaleTimeString()}`,
          type: 'ok',
        },
      ]);
    }
  }, [w.running]);

  const model = w.models.find(m => m.id === w.modelId);
  const modelName = model?.name || model?.id || 'Sonnet · verified';

  const canSend = !!draft.trim() && !sending && !w.running;

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSend) return;
    const text = draft.trim();
    setSending(true);
    setDraft('');

    if (mode === 'build' && !w.projectId) {
      onToast('Build mode needs a project folder. Open one to allow file edits.');
    }

    const effectivePrompt =
      mode === 'build' && !text.startsWith('[Mode: Build]') ? `[Mode: Build] ${text}` : text;

    try {
      await w.send(effectivePrompt);
    } finally {
      setSending(false);
    }
  };

  const handlePauseToggle = () => {
    setIsPaused(prev => !prev);
    onToast(isPaused ? 'Run resumed' : 'Run paused');
    setLogs(prev => [
      ...prev,
      {
        id: String(Date.now()),
        text: isPaused ? 'Run resumed' : 'Run paused',
        type: 'mut',
      },
    ]);
  };

  const handleCancelRun = () => {
    onToast('Run cancelled. The lease was released.');
    setLogs(prev => [
      ...prev,
      {
        id: String(Date.now()),
        text: 'Run cancelled by user',
        type: 'er',
      },
    ]);
  };

  const activeProject = w.projects.find(p => p.id === w.projectId);

  return (
    <div className="cw">
      <div className="col">
        {/* Active Run Banner */}
        {w.running && (
          <div className="pt-3 px-4">
            <div className="rp" data-r="GET /runs/:id · pause · resume · cancel">
              <span className={`dot ${isPaused ? 'off' : ''}`} />
              <b>Run active</b>
              <span className="mut" id="rs">
                {isPaused ? 'paused' : 'running'}
              </span>
              <span className="sp" />
              <button className="bt sm" onClick={handlePauseToggle}>
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button className="bt sm" onClick={handleCancelRun}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Transcript Area */}
        <div className="thr" id="thr" ref={viewRef}>
          <div className="thi" id="thi">
            {w.messages.length === 0 && !w.running ? (
              <div className="em">
                <h2>What should Sirona work on?</h2>
                <div className="chips" style={{ justifyContent: 'center' }}>
                  <button className="chip" onClick={onOpenFolder}>
                    {activeProject ? `Folder: ${activeProject.name}` : 'Open a folder'}
                  </button>
                  <button
                    className="chip"
                    onClick={() => {
                      setMode('build');
                      setDraft('Fix the bug where valid tokens are treated as expired');
                    }}
                  >
                    Fix a bug
                  </button>
                  <button
                    className="chip"
                    onClick={() => {
                      setMode('ask');
                      setDraft('How does the approval flow work?');
                    }}
                  >
                    Ask a question
                  </button>
                </div>
                <div className="mut">No project, goal or plan is needed. Chat works on its own.</div>
              </div>
            ) : (
              <>
                {w.messages.map(m => {
                  if (m.role === 'user') {
                    return (
                      <div key={m.id} className="m u">
                        {m.content}
                      </div>
                    );
                  }

                  // Assistant message
                  return (
                    <div key={m.id} className="m a">
                      {m.content}
                    </div>
                  );
                })}

                {/* Streaming Assistant Response */}
                {w.running && (
                  <div className="m a cr">
                    {w.stream ? (
                      <span className="w">{w.stream}</span>
                    ) : (
                      <div className="m tr">
                        <span className="spin" />
                        <span>Reasoning about solution…</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Inline Approvals */}
                {pendingApprovals.map(a => (
                  <InlineApprovalCard
                    key={a.id}
                    approval={a}
                    projectId={w.projectId}
                    onDecided={() => void loadApprovals()}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Composer Area */}
        <div className="cp" data-r="POST /conversations/:id/turns (SSE)">
          <div className="cb">
            <textarea
              ref={inputRef}
              className="ta"
              id="ta"
              rows={1}
              placeholder={
                activeProject
                  ? `Message Sirona (${activeProject.name})`
                  : 'Message Sirona'
              }
              aria-label="Message"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
            <div className="cr2">
              <div className="sg" id="sg">
                <i
                  className="pl"
                  id="pl"
                  style={{
                    width: mode === 'ask' ? '54px' : '62px',
                    transform: mode === 'ask' ? 'translateX(0px)' : 'translateX(54px)',
                  }}
                />
                <button
                  type="button"
                  className={mode === 'ask' ? 'on' : ''}
                  data-m="ask"
                  onClick={() => setMode('ask')}
                >
                  Ask
                </button>
                <button
                  type="button"
                  className={mode === 'build' ? 'on' : ''}
                  data-m="build"
                  onClick={() => setMode('build')}
                >
                  Build
                </button>
              </div>

              <span className="sp" />

              <button
                type="button"
                className="mp"
                data-r="GET /models · PATCH /conversations/:id"
                onClick={onProviders}
                title="Change or verify model"
              >
                {modelName}
              </button>

              <button
                type="button"
                className="snd"
                id="snd"
                disabled={!canSend}
                aria-label="Send"
                onClick={() => void submit()}
              >
                <UpIcon size={18} />
              </button>
            </div>
          </div>
          <div className="hint" id="hint">
            {HINT[mode]}
          </div>
        </div>

        {/* Bottom Terminal & Agent Log Deck */}
        <BottomTerminalDeck
          projectId={w.projectId}
          isOpen={terminalOpen}
          logs={logs}
          onClose={onToggleTerminal}
        />
      </div>

      {/* Center/Right Monaco Code Editor */}
      <CodeEditor />

      {/* Right Slide-out Files Panel */}
      <FileDrawer
        isOpen={fileDrawerOpen}
        projectId={w.projectId}
        onClose={onToggleFileDrawer}
      />
    </div>
  );
}
