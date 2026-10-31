import { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { executionApi, governanceApi, type Approval } from '../../api';

export interface InlineApprovalCardProps {
  approval: Approval;
  nonce?: string;
  projectId?: string;
  onDecided?: (approvalId: string, decision: 'approve' | 'reject') => void;
}

export function InlineApprovalCard({
  approval,
  nonce: initialNonce,
  projectId,
  onDecided,
}: InlineApprovalCardProps) {
  const [busy, setBusy] = useState(false);
  const [decided, setDecided] = useState<'approved' | 'rejected' | null>(
    approval.state === 'approved' ? 'approved' : approval.state === 'rejected' ? 'rejected' : null
  );
  const [error, setError] = useState<string | null>(null);

  // Parse action details from scope_summary or kind
  const isCommand =
    approval.kind === 'terminal' ||
    approval.kind === 'command' ||
    approval.scope_summary?.toLowerCase().includes('terminal') ||
    approval.scope_summary?.toLowerCase().includes('command');

  const actionTarget = approval.scope_summary || approval.kind || 'Requested operation';
  const description =
    approval.consequences ||
    (isCommand
      ? 'Executes inside the sandboxed Docker WSL2 project container. Review before allowing.'
      : 'Modifies workspace files under project governance.');

  const handleDecision = async (decision: 'approve' | 'reject', rememberGrant = false) => {
    if (busy || decided) return;
    setBusy(true);
    setError(null);

    const nonce = initialNonce || (approval as unknown as { nonce?: string }).nonce || '0'.repeat(64);
    const opKey = crypto.randomUUID();

    try {
      if (rememberGrant && projectId) {
        // "Always Allow" creates a 24-hour scoped grant for this capability
        const capability = isCommand ? 'terminal.execute' : 'file.patch';
        await governanceApi.createGrant(
          projectId,
          capability,
          { scope: actionTarget },
          86400,
          opKey
        );
      }

      await executionApi.decide(approval, decision, nonce, opKey);
      setDecided(decision === 'approve' ? 'approved' : 'rejected');
      onDecided?.(approval.id, decision);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decision submission failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inline-approval-card my-3 p-4 rounded-xl border border-amber-300 dark:border-amber-850/80 bg-amber-50/40 dark:bg-amber-950/20 text-zinc-900 dark:text-zinc-100 shadow-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400">
            <ShieldAlert size={16} strokeWidth={2.2} />
          </div>
          <span className="text-xs font-semibold tracking-tight text-amber-900 dark:text-amber-200">
            Sirona needs your approval
          </span>
        </div>

        {decided ? (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              decided === 'approved'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
            }`}
          >
            {decided === 'approved' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
            <span>{decided === 'approved' ? 'Approved' : 'Rejected'}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
            <Clock size={12} />
            <span>Pending review</span>
          </span>
        )}
      </div>

      {/* Action Prompt */}
      <p className="text-xs text-zinc-700 dark:text-zinc-300 mb-2">
        The agent wants to execute:
      </p>

      {/* Target Monospace Chip */}
      <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-mono text-xs text-zinc-800 dark:text-zinc-200 mb-2 overflow-x-auto">
        <code>{actionTarget}</code>
      </div>

      <p className="text-[11.5px] text-zinc-600 dark:text-zinc-400 mb-3 leading-relaxed">
        {description}
      </p>

      {error && (
        <div className="mb-3 p-2 rounded-md bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      {!decided && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDecision('approve')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {busy ? (
              <Sparkles size={13} className="animate-spin" />
            ) : (
              <ShieldCheck size={14} strokeWidth={2.2} />
            )}
            <span>Approve</span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDecision('reject')}
            className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            Reject
          </button>

          {projectId && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDecision('approve', true)}
              className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800/80 bg-amber-100/50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ml-auto"
              title="Approve and remember permission for similar actions for 24 hours"
            >
              Always Allow
            </button>
          )}
        </div>
      )}
    </div>
  );
}
