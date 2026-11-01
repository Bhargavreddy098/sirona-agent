import { useEffect, useState, useCallback } from 'react';
import { ShieldAlert, DollarSign, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { governanceApi, type policyRuleSchema, type usageRecordSchema, type budgetSchema } from '../../api';
import type { z } from 'zod';

type Rule = z.infer<typeof policyRuleSchema>;
type Usage = z.infer<typeof usageRecordSchema>;
type Budget = z.infer<typeof budgetSchema>;

export function GovernanceSettings({ projectId }: { projectId?: string }) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [policyVersion, setPolicyVersion] = useState<number>(1);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Budget form state
  const [newBudgetLimit, setNewBudgetLimit] = useState('50000000'); // $50 in micro-usd

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, uRes] = await Promise.all([
        governanceApi.currentPolicy(),
        governanceApi.usage(projectId),
      ]);
      setRules(pRes.policy?.rules || []);
      setPolicyVersion(pRes.policy?.version || 1);
      setUsage(uRes.usage || null);

      if (projectId) {
        const bRes = await governanceApi.budgets(projectId);
        setBudget(bRes.budget || null);
        if (bRes.budget?.limitMicroUsd) {
          setNewBudgetLimit(bRes.budget.limitMicroUsd);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load governance information');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    try {
      await governanceApi.setBudget(projectId, newBudgetLimit);
      setNotice('Project token budget ceiling updated');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update budget');
    }
  };

  const formatCost = (microUsd?: string) => {
    if (!microUsd) return '$0.00';
    const val = Number(microUsd) / 1_000_000;
    return `$${val.toFixed(4)}`;
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

      {/* Usage & Cost Metrics */}
      <section className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--fg-primary)] flex items-center gap-2">
              <DollarSign size={15} />
              <span>Token Usage & Cost Governance</span>
            </h2>
            <p className="text-xs text-[var(--fg-secondary)] mt-0.5">
              Cumulative model inference tokens and micro-USD accounting.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="p-1.5 rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-[var(--fg-secondary)] transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-subtle)]">
            <span className="text-[11px] text-[var(--fg-muted)] block">Prompt Tokens</span>
            <strong className="text-sm font-semibold text-[var(--fg-primary)] font-mono mt-1 block">
              {(usage?.totalPromptTokens || 0).toLocaleString()}
            </strong>
          </div>

          <div className="p-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-subtle)]">
            <span className="text-[11px] text-[var(--fg-muted)] block">Completion Tokens</span>
            <strong className="text-sm font-semibold text-[var(--fg-primary)] font-mono mt-1 block">
              {(usage?.totalCompletionTokens || 0).toLocaleString()}
            </strong>
          </div>

          <div className="p-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-subtle)]">
            <span className="text-[11px] text-[var(--fg-muted)] block">Total Model Calls</span>
            <strong className="text-sm font-semibold text-[var(--fg-primary)] font-mono mt-1 block">
              {(usage?.callsCount || 0).toLocaleString()}
            </strong>
          </div>

          <div className="p-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-subtle)]">
            <span className="text-[11px] text-[var(--fg-muted)] block">Total Cost</span>
            <strong className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
              {formatCost(usage?.totalCostMicroUsd)}
            </strong>
          </div>
        </div>

        {projectId && (
          <form onSubmit={handleUpdateBudget} className="mt-4 pt-4 border-t border-[var(--border-default)] flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-[var(--fg-secondary)]">
                  Project Cost Ceiling (micro-USD: 1,000,000 = $1.00)
                </label>
                {budget?.limitMicroUsd && (
                  <span className="text-[11px] font-mono text-[var(--fg-muted)]">
                    Current: {formatCost(budget.limitMicroUsd)}
                  </span>
                )}
              </div>
              <input
                type="number"
                value={newBudgetLimit}
                onChange={e => setNewBudgetLimit(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] text-xs font-mono"
              />
            </div>
            <button
              type="submit"
              className="mt-5 px-3.5 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)] transition-colors shadow-xs cursor-pointer"
            >
              Update Ceiling
            </button>
          </form>
        )}
      </section>

      {/* Security Policy Rules */}
      <section className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-xs">
        <h2 className="text-sm font-semibold text-[var(--fg-primary)] flex items-center gap-2 mb-1">
          <ShieldAlert size={15} />
          <span>Active Governance Policy (Revision v{policyVersion})</span>
        </h2>
        <p className="text-xs text-[var(--fg-secondary)] mb-4">
          Deterministic rules governing tool side-effects, file access, and agent execution boundaries.
        </p>

        <div className="space-y-2">
          {rules.length === 0 && !loading ? (
            <div className="p-6 text-center border border-dashed border-[var(--border-default)] rounded-xl text-xs text-[var(--fg-secondary)]">
              Default safe policy active. All destructive operations require human confirmation.
            </div>
          ) : (
            rules.map((rule, idx) => (
              <div
                key={rule.id || idx}
                className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface-subtle)] text-xs"
              >
                <div>
                  <strong className="text-[var(--fg-primary)] font-medium">{rule.name || rule.action || 'Policy Rule'}</strong>
                  {rule.description && (
                    <p className="text-[11px] text-[var(--fg-secondary)] mt-0.5">{rule.description}</p>
                  )}
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase ${
                    rule.effect === 'allow'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : rule.effect === 'deny'
                        ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                        : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                  }`}
                >
                  {rule.effect || 'require_approval'}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
