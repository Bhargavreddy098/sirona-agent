import { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { executionApi, type Approval } from '../../api/execution';
import { Dialog } from '../../components/ui/Dialog';
import { messageOf } from './useRun';

export function ApprovalDecision({
  approval,
  onClose,
  onSaved,
  initialNonce = '',
}: {
  approval: Approval;
  onClose: () => void;
  onSaved: (state: 'approved' | 'rejected') => void;
  initialNonce?: string;
}) {
  const [nonce, setNonce] = useState(initialNonce);
  const [choice, setChoice] = useState<'approve' | 'reject'>('reject');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  return (
    <Dialog
      open
      dismissible={!busy}
      onClose={() => {
        if (!lock.current) {
          setNonce('');
          onClose();
        }
      }}
      title="Review approval"
    >
      <form
        className="provider-form space-y-4"
        autoComplete="off"
        onSubmit={event => {
          event.preventDefault();
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          setError('');
          void executionApi
            .decide(approval, choice, nonce, crypto.randomUUID())
            .then(result => {
              setNonce('');
              onSaved(result.approval.state);
              onClose();
            })
            .catch(cause => {
              setNonce('');
              setError(`${messageOf(cause)} Refresh the approval before submitting again.`);
            })
            .finally(() => {
              lock.current = false;
              setBusy(false);
            });
        }}
      >
        <div>
          <p className="text-sm font-medium text-[var(--fg-primary)]">
            {approval.scope_summary || `${approval.kind} approval`}
          </p>
          {approval.consequences && (
            <p className="muted text-xs text-[var(--fg-muted)] mt-1">{approval.consequences}</p>
          )}
        </div>

        <dl className="workspace-facts grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-subtle)] text-xs">
          <div>
            <dt className="text-[11px] text-[var(--fg-muted)] font-medium">Input digest</dt>
            <dd className="digest font-mono text-[10px] text-[var(--fg-secondary)] break-all mt-0.5">
              {approval.input_digest.slice(0, 16)}…
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-[var(--fg-muted)] font-medium">Max cost</dt>
            <dd className="font-medium text-[var(--fg-primary)] mt-0.5 tabular-nums">
              {approval.cost_ceiling_micro_usd} µUSD
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-[var(--fg-muted)] font-medium">Expires</dt>
            <dd className="text-[var(--fg-secondary)] mt-0.5 tabular-nums">
              {new Date(approval.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </dd>
          </div>
        </dl>

        {!initialNonce && (
          <div>
            <label htmlFor="approval-proof" className="block text-xs font-medium text-[var(--fg-secondary)] mb-1">
              One-time approval proof
            </label>
            <input
              id="approval-proof"
              type="password"
              autoComplete="off"
              required
              minLength={64}
              maxLength={64}
              pattern="[a-f0-9]{64}"
              value={nonce}
              disabled={busy}
              onChange={event => setNonce(event.target.value)}
              aria-describedby="approval-proof-help"
              className="w-full px-3 py-1.5 bg-[var(--bg-canvas)] border border-[var(--border-default)] rounded-lg text-xs font-mono text-[var(--fg-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            />
            <p id="approval-proof-help" className="muted text-[11px] text-[var(--fg-muted)] mt-1">
              Use the nonce issued when this request was created. It is cleared after submission.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="approval-choice" className="block text-xs font-medium text-[var(--fg-secondary)] mb-1">
            Your decision
          </label>
          <select
            id="approval-choice"
            value={choice}
            disabled={busy}
            onChange={event => setChoice(event.target.value as typeof choice)}
            className="w-full px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-xs text-[var(--fg-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
          >
            <option value="reject">Reject this exact request</option>
            <option value="approve">Approve this exact request</option>
          </select>
        </div>

        {error && (
          <p className="notice error text-xs text-[var(--danger)] bg-[var(--danger-bg)] p-2.5 rounded-lg border border-[var(--danger)]/20" role="alert">
            {error}
          </p>
        )}

        <div className="dialog-actions flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            className="secondary px-3 py-1.5 rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-surface-hover)] text-xs font-medium cursor-pointer"
            disabled={busy}
            onClick={() => {
              setNonce('');
              onClose();
            }}
          >
            Go back
          </button>
          <button
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer shadow-xs disabled:opacity-50 ${
              choice === 'approve'
                ? 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)]'
                : 'bg-[var(--danger)] text-white hover:opacity-90'
            }`}
            disabled={busy || !nonce}
          >
            {busy
              ? 'Recording decision…'
              : choice === 'approve'
              ? 'Approve exact request'
              : 'Reject request'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function Approvals({ projectId }: { projectId: string }) {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Approval>();
  const controller = useRef<AbortController | null>(null);

  const refresh = useCallback(
    async (offset = 0) => {
      controller.current?.abort();
      const request = new AbortController();
      controller.current = request;
      setLoading(true);
      setError('');
      try {
        const result = await executionApi.approvals(projectId, offset, request.signal);
        if (!request.signal.aborted) {
          setApprovals(previous => (offset ? [...previous, ...result.approvals] : result.approvals));
          setTotal(result.total);
        }
      } catch (cause) {
        if (!request.signal.aborted) setError(messageOf(cause));
      } finally {
        if (!request.signal.aborted) setLoading(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    void refresh();
    return () => controller.current?.abort();
  }, [refresh]);

  return (
    <section aria-label="Project approvals" className="space-y-4">
      <div className="workspace-toolbar flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <h2 className="text-base font-semibold text-[var(--fg-primary)] tracking-tight">Approvals</h2>
          <p className="muted text-xs text-[var(--fg-muted)] mt-0.5">
            Decisions bind an exact digest and expire. Approving a contract does not approve every tool action.
          </p>
        </div>
        <button
          className="secondary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-surface-hover)] text-xs font-medium text-[var(--fg-secondary)] transition-all cursor-pointer disabled:opacity-50"
          disabled={loading}
          onClick={() => void refresh()}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh approvals</span>
        </button>
      </div>

      {error && (
        <p className="notice error p-3 rounded-lg bg-[var(--danger-bg)] text-[var(--danger)] text-xs border border-[var(--danger)]/20" role="alert">
          {error}
        </p>
      )}

      {loading && <p className="muted text-xs text-[var(--fg-muted)]" role="status">Loading approvals…</p>}

      {!loading && !approvals.length && !error && (
        <div className="workspace-empty p-8 rounded-xl border border-dashed border-[var(--border-default)] text-center flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-surface)] flex items-center justify-center text-[var(--fg-muted)] border border-[var(--border-default)]">
            <ShieldCheck className="w-5 h-5 text-[var(--accent-primary)]" />
          </div>
          <h3 className="text-sm font-medium text-[var(--fg-primary)]">No approval requests</h3>
          <p className="text-xs text-[var(--fg-muted)] max-w-md">
            Requests appear here when an existing service creates them. Pending graph actions are also shown in the run’s activity feed.
          </p>
        </div>
      )}

      <ul className="workspace-records space-y-2.5">
        {approvals.map(approval => {
          const isPending =
            approval.state === 'pending' &&
            !approval.consumed_at &&
            Date.parse(approval.expires_at) > Date.now();

          return (
            <li
              key={approval.id}
              className="p-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-canvas)] flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <strong className="text-xs font-semibold text-[var(--fg-primary)]">
                    {approval.scope_summary || `${approval.kind} approval`}
                  </strong>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      approval.state === 'approved'
                        ? 'bg-[var(--success)]/10 text-[var(--success)]'
                        : approval.state === 'rejected'
                        ? 'bg-[var(--danger)]/10 text-[var(--danger)]'
                        : 'bg-[var(--warning)]/10 text-[var(--warning)]'
                    }`}
                  >
                    {approval.state}
                  </span>
                </div>
                <p className="muted text-[11px] text-[var(--fg-muted)] mt-1 flex items-center gap-2">
                  <span>{approval.kind}</span>
                  {approval.consumed_at && <span>· consumed</span>}
                  <span>· Expires {new Date(approval.expires_at).toLocaleString()}</span>
                </p>
                <code className="digest block text-[10px] font-mono text-[var(--fg-muted)] mt-1 truncate">
                  {approval.input_digest}
                </code>
              </div>
              <button
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
                  isPending
                    ? 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] shadow-xs'
                    : 'border border-[var(--border-default)] text-[var(--fg-muted)] hover:bg-[var(--bg-surface-hover)]'
                }`}
                disabled={!isPending}
                onClick={() => setSelected(approval)}
              >
                Review request
              </button>
            </li>
          );
        })}
      </ul>

      {approvals.length < total && (
        <button
          className="secondary px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-xs text-[var(--fg-secondary)] hover:bg-[var(--bg-surface-hover)]"
          disabled={loading}
          onClick={() => void refresh(approvals.length)}
        >
          Load more approvals
        </button>
      )}

      {selected && (
        <ApprovalDecision
          key={selected.id}
          approval={selected}
          onClose={() => setSelected(undefined)}
          onSaved={() => void refresh()}
        />
      )}
    </section>
  );
}
