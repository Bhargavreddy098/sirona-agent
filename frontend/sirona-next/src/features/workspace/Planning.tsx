import { useCallback, useEffect, useRef, useState } from 'react';
import { Compass, RefreshCw, Layers, ShieldCheck } from 'lucide-react';
import { executionApi, type Goal, type Plan, type Contract } from '../../api/execution';
import { messageOf } from './useRun';
import { RunPreparation } from './RunPreparation';

export function Planning({
  projectId,
  onPrepared,
}: {
  projectId: string;
  onPrepared: (runId: string) => void;
}) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selected, setSelected] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [contract, setContract] = useState<Contract>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [more, setMore] = useState(false);
  const [morePlans, setMorePlans] = useState(false);

  const request = useRef<AbortController | null>(null);
  const details = useRef<AbortController | null>(null);

  const refresh = useCallback(
    async (offset = 0) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setLoading(true);
      setError('');
      try {
        const result = await executionApi.goals(projectId, offset, controller.signal);
        if (!controller.signal.aborted) {
          setGoals(previous => (offset ? [...previous, ...result] : result));
          setMore(result.length === 50);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(messageOf(cause));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    void refresh();
    return () => request.current?.abort();
  }, [refresh]);

  useEffect(() => {
    details.current?.abort();
    const controller = new AbortController();
    details.current = controller;
    setPlans([]);
    setContract(undefined);
    setMorePlans(false);
    if (!selected) return () => controller.abort();
    const goal = goals.find(item => item.id === selected);
    if (!goal) return () => controller.abort();

    setLoading(true);
    setError('');
    void Promise.allSettled([
      executionApi.plans(goal.id, 0, controller.signal),
      goal.activeContractRevisionId
        ? executionApi.contract(goal.activeContractRevisionId, controller.signal)
        : Promise.resolve(undefined),
    ]).then(([planResult, contractResult]) => {
      if (controller.signal.aborted) return;
      const errors: string[] = [];
      if (planResult.status === 'fulfilled') {
        setPlans(planResult.value);
        setMorePlans(planResult.value.length === 50);
      } else {
        errors.push(messageOf(planResult.reason));
      }
      if (contractResult.status === 'fulfilled') {
        if (contractResult.value && contractResult.value.goalId !== goal.id) {
          errors.push('The returned contract belongs to another goal.');
        } else {
          setContract(contractResult.value);
        }
      } else {
        errors.push(messageOf(contractResult.reason));
      }
      setError(errors.join(' · '));
      setLoading(false);
    });
    return () => controller.abort();
  }, [selected, goals]);

  const loadMore = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const next = await executionApi.plans(selected, plans.length, details.current?.signal);
      if (!details.current?.signal.aborted) {
        setPlans(previous => [...previous, ...next]);
        setMorePlans(next.length === 50);
      }
    } catch (cause) {
      if (!details.current?.signal.aborted) setError(messageOf(cause));
    } finally {
      if (!details.current?.signal.aborted) setLoading(false);
    }
  };

  const goal = goals.find(item => item.id === selected);

  return (
    <section aria-label="Project planning" className="space-y-4">
      <div className="workspace-toolbar flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <h2 className="text-base font-semibold text-[var(--fg-primary)] tracking-tight">Planning</h2>
          <p className="muted text-xs text-[var(--fg-muted)] mt-0.5">
            Inspect saved goals, layered plans, and immutable contract revisions.
          </p>
        </div>
        <button
          className="secondary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-surface-hover)] text-xs font-medium text-[var(--fg-secondary)] transition-all cursor-pointer disabled:opacity-50"
          disabled={loading}
          onClick={() => void refresh()}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh planning</span>
        </button>
      </div>

      {error && (
        <p className="notice error p-3 rounded-lg bg-[var(--danger-bg)] text-[var(--danger)] text-xs border border-[var(--danger)]/20" role="alert">
          {error}
        </p>
      )}

      {loading && <p className="muted text-xs text-[var(--fg-muted)]" role="status">Loading planning records…</p>}

      {!goals.length && !loading && !error && (
        <div className="workspace-empty p-8 rounded-xl border border-dashed border-[var(--border-default)] text-center flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-surface)] flex items-center justify-center text-[var(--fg-muted)] border border-[var(--border-default)]">
            <Compass className="w-5 h-5 text-[var(--accent-primary)]" />
          </div>
          <h3 className="text-sm font-medium text-[var(--fg-primary)]">No saved goals</h3>
          <p className="text-xs text-[var(--fg-muted)] max-w-md">
            This project has no planning records. Chat messages are not treated as approved execution contracts.
          </p>
        </div>
      )}

      {goals.length > 0 && (
        <label className="workspace-field block text-xs font-medium text-[var(--fg-secondary)] mb-3">
          <span className="block mb-1.5">Goal</span>
          <select
            aria-label="Goal"
            value={selected}
            onChange={event => setSelected(event.target.value)}
            className="w-full max-w-xl px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-xs text-[var(--fg-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
          >
            <option value="">Choose a saved goal</option>
            {goals.map(item => (
              <option key={item.id} value={item.id}>
                {item.intent.slice(0, 100)}
              </option>
            ))}
          </select>
        </label>
      )}

      {more && (
        <button
          className="secondary px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-xs text-[var(--fg-secondary)] hover:bg-[var(--bg-surface-hover)]"
          disabled={loading}
          onClick={() => void refresh(goals.length)}
        >
          Load more goals
        </button>
      )}

      {goal && (
        <div className="space-y-4 pt-2">
          <div className="workspace-section p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
            <h3 className="text-sm font-semibold text-[var(--fg-primary)]">{goal.intent}</h3>
            <p className="muted text-xs text-[var(--fg-muted)] mt-1 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--fg-secondary)] uppercase text-[10px] font-medium tracking-wide">
                {goal.status}
              </span>
              <span>Autonomy mode: {goal.autonomyMode}</span>
            </p>
          </div>

          {plans.map(plan => (
            <details
              className="workspace-section p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-canvas)] group"
              key={plan.id}
            >
              <summary className="cursor-pointer font-medium text-xs text-[var(--fg-primary)] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span>Plan revision {plan.revision}{plan.reason ? ` · ${plan.reason}` : ''}</span>
                </span>
                <code className="digest text-[10px] font-mono text-[var(--fg-muted)]">{plan.digest.slice(0, 16)}…</code>
              </summary>
              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-3">
                <code className="digest block text-[10px] font-mono text-[var(--fg-muted)] bg-[var(--bg-surface)] p-2 rounded break-all">
                  {plan.digest}
                </code>
                <div>
                  <h4 className="text-xs font-semibold text-[var(--fg-secondary)] mb-1">Layers</h4>
                  <pre tabIndex={0} className="p-3 bg-[var(--bg-surface)] rounded-lg text-xs font-mono text-[var(--fg-primary)] border border-[var(--border-subtle)] overflow-auto max-h-60 leading-relaxed whitespace-pre-wrap select-text">
                    {JSON.stringify(plan.layers, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[var(--fg-secondary)] mb-1">Steps</h4>
                  <pre tabIndex={0} className="p-3 bg-[var(--bg-surface)] rounded-lg text-xs font-mono text-[var(--fg-primary)] border border-[var(--border-subtle)] overflow-auto max-h-60 leading-relaxed whitespace-pre-wrap select-text">
                    {JSON.stringify(plan.steps, null, 2)}
                  </pre>
                </div>
              </div>
            </details>
          ))}

          {!loading && !plans.length && (
            <p className="muted text-xs text-[var(--fg-muted)]">No plan revisions exist for this goal.</p>
          )}

          {morePlans && (
            <button
              className="secondary px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-xs text-[var(--fg-secondary)] hover:bg-[var(--bg-surface-hover)]"
              disabled={loading}
              onClick={() => void loadMore()}
            >
              Load more plan revisions
            </button>
          )}

          {contract ? (
            <details className="workspace-section p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-canvas)]">
              <summary className="cursor-pointer font-medium text-xs text-[var(--fg-primary)] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[var(--success)]" />
                  <span>Active contract revision {contract.revision}</span>
                </span>
                <code className="digest text-[10px] font-mono text-[var(--fg-muted)]">{contract.digest.slice(0, 16)}…</code>
              </summary>
              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-3">
                <code className="digest block text-[10px] font-mono text-[var(--fg-muted)] bg-[var(--bg-surface)] p-2 rounded break-all">
                  {contract.digest}
                </code>
                <pre tabIndex={0} className="p-3 bg-[var(--bg-surface)] rounded-lg text-xs font-mono text-[var(--fg-primary)] border border-[var(--border-subtle)] overflow-auto max-h-60 leading-relaxed whitespace-pre-wrap select-text">
                  {JSON.stringify(contract.document, null, 2)}
                </pre>
              </div>
            </details>
          ) : (
            !loading && (
              <p className="muted text-xs text-[var(--fg-muted)]">
                No active contract revision is recorded for this goal. Nothing is approved or started by selecting it.
              </p>
            )
          )}

          {contract && (
            <RunPreparation
              key={contract.id}
              projectId={projectId}
              goal={goal}
              contract={contract}
              onPrepared={onPrepared}
            />
          )}
        </div>
      )}
    </section>
  );
}
