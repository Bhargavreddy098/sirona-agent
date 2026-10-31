import React, { useState } from 'react';
import { DiffEditor, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore, detectLanguage } from './editorState';
import { workspaceApi, executionApi } from '../../api';
import { XIcon, CheckIcon, ShieldIcon } from '../../components/ui/Icons';
import { AlertTriangle, CheckCircle2, RefreshCw, FileDiff } from 'lucide-react';

loader.config({ monaco });

export function DiffReviewModal() {
  const {
    activeDiff,
    selectedDiffFilePath,
    isDiffOpen,
    setSelectedDiffFile,
    closeDiff,
  } = useEditorStore(
    useShallow((state) => ({
      activeDiff: state.activeDiff,
      selectedDiffFilePath: state.selectedDiffFilePath,
      isDiffOpen: state.isDiffOpen,
      setSelectedDiffFile: state.setSelectedDiffFile,
      closeDiff: state.closeDiff,
    }))
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<'applied' | 'rejected' | null>(null);
  const [_outcomeReceipt, setOutcomeReceipt] = useState<unknown | null>(null);

  if (!isDiffOpen || !activeDiff) return null;

  const files = activeDiff.files || [];
  const selectedFile =
    files.find((f) => f.path === selectedDiffFilePath) || files[0];

  const handleAccept = async () => {
    if (busy || outcome) return;
    setBusy(true);
    setError(null);

    const opKey = crypto.randomUUID();
    const nonce = activeDiff.nonce || '0'.repeat(64);

    try {
      // 1. Submit approval decision to governance authority
      await executionApi.decide(
        {
          id: activeDiff.approvalId,
          input_digest: activeDiff.patchDigest,
          kind: 'effect',
          state: 'pending',
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          cost_ceiling_micro_usd: '0',
        },
        'approve',
        nonce,
        opKey
      );

      // 2. Invoke atomic host patch application
      const receipt = await workspaceApi.applyPatch(
        activeDiff.projectId,
        activeDiff.artifactId,
        {
          runId: activeDiff.runId,
          taskId: activeDiff.taskId,
          rootRef: activeDiff.rootRef,
          approvalId: activeDiff.approvalId,
          fence: { holder: 'desktop-user', runEpoch: '1', leaseEpoch: '1' },
        },
        opKey
      );

      setOutcome('applied');
      setOutcomeReceipt(receipt);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Patch application failed';
      if (msg.includes('BASE_SNAPSHOT_MISMATCH') || msg.includes('Host changed')) {
        setError('Base snapshot mismatch: Workspace files changed on disk after this diff was generated. Re-scan or re-run required.');
      } else if (msg.includes('WORKSPACE_BUSY')) {
        setError('Workspace busy: Another patch operation is currently acquiring advisory lock. Please retry.');
      } else if (msg.includes('APPROVAL_REQUIRED')) {
        setError('Approval required: The approval proof was not accepted by the host policy.');
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (busy || outcome) return;
    setBusy(true);
    setError(null);

    const opKey = crypto.randomUUID();
    const nonce = activeDiff.nonce || '0'.repeat(64);

    try {
      // Record authoritative rejection in database - ZERO filesystem writes
      await executionApi.decide(
        {
          id: activeDiff.approvalId,
          input_digest: activeDiff.patchDigest,
          kind: 'effect',
          state: 'pending',
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          cost_ceiling_micro_usd: '0',
        },
        'reject',
        nonce,
        opKey
      );

      setOutcome('rejected');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Rejection recording failed');
    } finally {
      setBusy(false);
    }
  };

  const fileLang = selectedFile ? detectLanguage(selectedFile.path) : 'plaintext';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        className="flex flex-col bg-[var(--bg-app,#18181b)] border border-[var(--border-subtle,#27272a)] rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden text-[var(--fg-primary,#fafafa)]"
        role="dialog"
        aria-labelledby="diff-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[var(--bg-surface,#202023)] border-b border-[var(--border-subtle,#27272a)]">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-[var(--amber,#f59e0b)]/10 text-[var(--amber,#f59e0b)]">
              <FileDiff size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="diff-dialog-title" className="text-sm font-semibold tracking-tight text-[var(--fg-primary)]">
                  Side-by-Side Diff Review
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[var(--bg-surface-hover,#2a2a2e)] text-[var(--fg-muted)] border border-[var(--border-subtle)]">
                  {files.length} {files.length === 1 ? 'file' : 'files'} touched
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[var(--bg-surface-hover,#2a2a2e)] text-[var(--fg-muted)] border border-[var(--border-subtle)]">
                  SHA: {activeDiff.patchDigest.slice(0, 10)}…
                </span>
              </div>
              <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                {activeDiff.summary || 'Review proposed modifications before approving host file modifications.'}
              </p>
            </div>
          </div>

          <button
            onClick={closeDiff}
            className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-surface-hover,#2a2a2e)] transition-colors"
            title="Close review"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Status / Error Banners */}
        {error && (
          <div className="flex items-start gap-2.5 px-5 py-3 bg-[var(--red,#ef4444)]/10 border-b border-[var(--red,#ef4444)]/20 text-[var(--red,#ef4444)] text-xs font-mono">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Operation halted: </span>
              {error}
            </div>
          </div>
        )}

        {outcome === 'applied' && (
          <div className="flex items-center gap-2.5 px-5 py-3 bg-[var(--green,#22c55e)]/10 border-b border-[var(--green,#22c55e)]/20 text-[var(--green,#22c55e)] text-xs font-medium">
            <CheckCircle2 size={16} />
            <span>Patch successfully applied to workspace. Host filesystem has been verified.</span>
          </div>
        )}

        {outcome === 'rejected' && (
          <div className="flex items-center gap-2.5 px-5 py-3 bg-[var(--fg-muted,#71717a)]/10 border-b border-[var(--border-subtle)] text-[var(--fg-muted)] text-xs font-medium">
            <XIcon size={16} />
            <span>Changes were rejected. Zero host files were modified.</span>
          </div>
        )}

        {/* Main Body: File Selector + Diff Editor */}
        <div className="flex flex-1 min-h-0 w-full overflow-hidden">
          {/* File Selector Sidebar (if > 1 file or to show file status) */}
          <div className="w-64 border-r border-[var(--border-subtle,#27272a)] bg-[var(--bg-surface,#202023)]/50 flex flex-col shrink-0">
            <div className="px-3 py-2 border-b border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
              Modified Files
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {files.map((file) => {
                const isSelected = file.path === selectedFile?.path;
                const kindBadge =
                  file.kind === 'add' ? (
                    <span className="text-[10px] text-[var(--green,#22c55e)] font-mono font-bold">+A</span>
                  ) : file.kind === 'delete' ? (
                    <span className="text-[10px] text-[var(--red,#ef4444)] font-mono font-bold">-D</span>
                  ) : (
                    <span className="text-[10px] text-[var(--amber,#f59e0b)] font-mono font-bold">~M</span>
                  );

                return (
                  <button
                    key={file.path}
                    onClick={() => setSelectedDiffFile(file.path)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-[var(--bg-app)] border border-[var(--border-subtle)] text-[var(--fg-primary)] shadow-sm'
                        : 'text-[var(--fg-muted)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-surface-hover,#2a2a2e)]'
                    }`}
                  >
                    <span className="truncate mr-2" title={file.path}>
                      {file.path}
                    </span>
                    {kindBadge}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Diff Editor Pane */}
          <div className="flex-1 flex flex-col min-w-0 h-full relative">
            {selectedFile ? (
              <>
                <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-surface,#202023)]/30 border-b border-[var(--border-subtle)] text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--fg-primary)] font-medium">{selectedFile.path}</span>
                    <span className="text-[10px] text-[var(--fg-muted)] uppercase">({fileLang})</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-[var(--fg-muted)]">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-red-500/20 border border-red-500/40 inline-block"></span>
                      Original (Current)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-green-500/20 border border-green-500/40 inline-block"></span>
                      Proposed (Patch)
                    </span>
                  </div>
                </div>

                <div className="flex-1 w-full h-full min-h-0">
                  <DiffEditor
                    height="100%"
                    language={fileLang}
                    original={selectedFile.original}
                    modified={selectedFile.modified}
                    theme="vs-dark"
                    loading={
                      <div className="flex items-center justify-center h-full text-xs text-[var(--fg-muted)] font-mono">
                        Loading Diff comparison…
                      </div>
                    }
                    options={{
                      readOnly: true,
                      renderSideBySide: true,
                      fontFamily: 'var(--font-mono), "IBM Plex Mono", Consolas, monospace',
                      fontSize: 13,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: 'on',
                      renderWhitespace: 'selection',
                      diffWordWrap: 'on',
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-xs text-[var(--fg-muted)] font-mono">
                No file selected
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[var(--bg-surface,#202023)] border-t border-[var(--border-subtle,#27272a)]">
          <div className="flex items-center gap-2 text-xs text-[var(--fg-muted)]">
            <ShieldIcon size={14} className="text-[var(--amber,#f59e0b)]" />
            <span>
              Advisory locked execution. Rejection leaves host filesystem 100% untouched.
            </span>
          </div>

          <div className="flex items-center gap-3">
            {outcome ? (
              <button
                onClick={closeDiff}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--bg-surface-hover,#2a2a2e)] text-[var(--fg-primary)] hover:bg-[var(--bg-surface-hover,#333)] border border-[var(--border-subtle)] transition-colors"
              >
                Close
              </button>
            ) : (
              <>
                <button
                  disabled={busy}
                  onClick={handleReject}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--red,#ef4444)]/10 text-[var(--red,#ef4444)] hover:bg-[var(--red,#ef4444)]/20 border border-[var(--red,#ef4444)]/30 disabled:opacity-50 transition-colors"
                >
                  {busy ? 'Processing…' : 'Reject Changes'}
                </button>
                <button
                  disabled={busy}
                  onClick={handleAccept}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[var(--green,#22c55e)] text-black hover:bg-[var(--green,#22c55e)]/90 font-semibold disabled:opacity-50 transition-colors shadow-sm"
                >
                  {busy ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      Applying Patch…
                    </>
                  ) : (
                    <>
                      <CheckIcon size={14} />
                      Accept & Apply Patch
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
