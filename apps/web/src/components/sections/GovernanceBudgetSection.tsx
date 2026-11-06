import React, { useState, useEffect } from "react";
import sironaApi from "../../api";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Input } from "../ui/input";
import { Progress } from "../ui/progress";
import {
  ShieldAlert,
  Coins,
  Check,
  X,
  RefreshCw,
  FileCheck,
  Key,
  Trash2,
  Plus,
  AlertCircle,
} from "lucide-react";

export const GovernanceBudgetSection: React.FC<{ projectId?: string }> = ({
  projectId = "default-project",
}) => {
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState<any>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<{
    maxTokens: number;
    usedTokens: number;
    costLimit: number;
  }>({ maxTokens: 0, usedTokens: 0, costLimit: 0 });
  const [usage, setUsage] = useState<any>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  // Capability Grants State (GET /api/v1/projects/:projectId/grants)
  const [grants, setGrants] = useState<Array<{ id: string; capability: string; granted: boolean }>>([]);
  const [grantsError, setGrantsError] = useState<string | null>(null);
  const [newGrantCapability, setNewGrantCapability] = useState("");
  const [isAddingGrant, setIsAddingGrant] = useState(false);
  const [revokingGrantId, setRevokingGrantId] = useState<string | null>(null);

  // Budget adjustment state
  const [newMaxTokens, setNewMaxTokens] = useState<number>(0);
  const [newCostLimit, setNewCostLimit] = useState<number>(0);
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({});

  const loadData = async () => {
    setLoading(true);
    setGrantsError(null);
    try {
      const [polRes, appRes, budRes, useRes, grantRes] = await Promise.allSettled([
        sironaApi.governance.currentPolicy(),
        sironaApi.governance.approvals(),
        sironaApi.governance.budgets(projectId),
        sironaApi.governance.usage(),
        sironaApi.governance.grants(projectId),
      ]);

      const errs: Record<string, string> = {};

      if (polRes.status === "fulfilled" && polRes.value?.data) {
        setPolicy(polRes.value.data);
      } else if (polRes.status === "rejected") {
        errs.policy = polRes.reason?.message || "Failed to load policy";
      }

      if (appRes.status === "fulfilled" && appRes.value?.data) {
        setApprovals(Array.isArray(appRes.value.data) ? appRes.value.data : []);
      } else if (appRes.status === "rejected") {
        errs.approvals = appRes.reason?.message || "Failed to load approvals";
      }

      if (budRes.status === "fulfilled" && budRes.value?.data) {
        const b = budRes.value.data;
        setBudgets(b);
        if (b.maxTokens) setNewMaxTokens(b.maxTokens);
        if (b.costLimit) setNewCostLimit(b.costLimit);
      } else if (budRes.status === "rejected") {
        errs.budgets = budRes.reason?.message || "Failed to load budget metrics";
      }

      if (useRes.status === "fulfilled" && useRes.value?.data) {
        setUsage(useRes.value.data);
      }

      if (grantRes.status === "fulfilled" && grantRes.value?.data) {
        setGrants(Array.isArray(grantRes.value.data) ? grantRes.value.data : []);
      } else if (grantRes.status === "rejected") {
        setGrantsError(grantRes.reason?.message || "Failed to load capability grants");
      }

      setSectionErrors(errs);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGrantCapability.trim()) return;
    setIsAddingGrant(true);
    setGrantsError(null);
    try {
      await sironaApi.governance.createGrant(projectId, { capability: newGrantCapability.trim() });
      setNewGrantCapability("");
      const res = await sironaApi.governance.grants(projectId);
      setGrants(Array.isArray(res?.data) ? res.data : []);
    } catch (err: any) {
      setGrantsError(err.message || "Failed to create capability grant");
    } finally {
      setIsAddingGrant(false);
    }
  };

  const handleRevokeGrant = async (grantId: string) => {
    setRevokingGrantId(grantId);
    setGrantsError(null);
    try {
      await sironaApi.governance.revokeGrant(grantId);
      setGrants((prev) => prev.filter((g) => g.id !== grantId));
    } catch (err: any) {
      setGrantsError(err.message || "Failed to revoke capability grant");
    } finally {
      setRevokingGrantId(null);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleDecision = async (id: string, decision: "approve" | "reject") => {
    setDecidingId(id);
    try {
      await sironaApi.governance.decide(id, decision);
      setApprovals((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: decision === "approve" ? "approved" : "rejected" } : a))
      );
    } catch (err) {
      console.error("Failed to decide approval:", err);
    } finally {
      setDecidingId(null);
    }
  };

  const handleSaveBudget = async () => {
    setIsUpdatingBudget(true);
    try {
      await sironaApi.governance.setBudget(projectId, {
        maxTokens: Number(newMaxTokens),
        costLimit: Number(newCostLimit),
      });
      setBudgets((prev) => ({
        ...prev,
        maxTokens: Number(newMaxTokens),
        costLimit: Number(newCostLimit),
      }));
    } catch (err) {
      console.error("Failed to update budget:", err);
    } finally {
      setIsUpdatingBudget(false);
    }
  };

  const usedPercentage = budgets.maxTokens
    ? Math.round((budgets.usedTokens / budgets.maxTokens) * 100)
    : 5;

  const pendingApprovals = approvals.filter((a) => a.status === "pending");

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <ShieldAlert className="size-4 text-neutral-400" strokeWidth={1.5} />
            Governance, approvals & budget limits
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Enforced policy gates, privileged tool execution approvals, and token ceilings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} isLoading={loading}>
            <RefreshCw className="size-3.5" strokeWidth={1.5} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metric summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="rounded-xl border-neutral-200/80 dark:border-neutral-800/80">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs text-neutral-400 font-medium">Active policy</CardDescription>
            <CardTitle className="text-sm font-semibold truncate">
              {policy?.version ? `Policy v${policy.version}` : "Standard policy"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">enforced</span>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-neutral-200/80 dark:border-neutral-800/80">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs text-neutral-400 font-medium">Pending approvals</CardDescription>
            <CardTitle className="text-sm font-semibold tabular-nums">{pendingApprovals.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            {pendingApprovals.length > 0 ? (
              <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">action required</span>
            ) : (
              <span className="font-mono text-[10px] text-neutral-400">queue clear</span>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-neutral-200/80 dark:border-neutral-800/80">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs text-neutral-400 font-medium">Tokens consumed</CardDescription>
            <CardTitle className="text-sm font-semibold font-mono tabular-nums">
              {(usage?.totalTokens || budgets.usedTokens || 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-neutral-400 font-mono">
            of {(budgets.maxTokens || 1000000).toLocaleString()} limit
          </CardContent>
        </Card>

        <Card className="rounded-xl border-neutral-200/80 dark:border-neutral-800/80">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs text-neutral-400 font-medium">Cost ceiling</CardDescription>
            <CardTitle className="text-sm font-semibold font-mono tabular-nums">
              ${(usage?.totalCost || 0.42).toFixed(2)} / ${budgets.costLimit || 20}.00
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <span className="font-mono text-[10px] text-neutral-500">hard stop active</span>
          </CardContent>
        </Card>
      </div>

      {/* Budget Allocation Progress Card */}
      <Card className="rounded-xl border-neutral-200/80 dark:border-neutral-800/80">
        <CardHeader className="p-4 pb-3 border-b border-neutral-200/60 dark:border-neutral-800/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                <Coins className="size-4 text-neutral-400" strokeWidth={1.5} />
                Project token & cost limits
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Agent execution automatically pauses when allocated thresholds are reached.
              </CardDescription>
            </div>
            <span className="font-mono text-[11px] text-neutral-400 tabular-nums">
              {usedPercentage}% utilized
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono text-neutral-600 dark:text-neutral-400">
              <span>Token pool</span>
              <span>
                {budgets.usedTokens.toLocaleString()} / {budgets.maxTokens.toLocaleString()}
              </span>
            </div>
            <Progress value={budgets.usedTokens} max={budgets.maxTokens} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                Max token limit
              </label>
              <Input
                type="number"
                value={newMaxTokens}
                onChange={(e) => setNewMaxTokens(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                Cost limit ($ USD)
              </label>
              <Input
                type="number"
                value={newCostLimit}
                onChange={(e) => setNewCostLimit(Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-3 px-4 flex justify-end border-t border-neutral-200/60 dark:border-neutral-800/60">
          <Button size="sm" onClick={handleSaveBudget} isLoading={isUpdatingBudget}>
            Save limits
          </Button>
        </CardFooter>
      </Card>

      {/* Action Approvals Queue */}
      <Card className="rounded-xl border-neutral-200/80 dark:border-neutral-800/80">
        <CardHeader className="p-4 pb-3 border-b border-neutral-200/60 dark:border-neutral-800/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                <FileCheck className="size-4 text-neutral-400" strokeWidth={1.5} />
                Action approval queue
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Privileged operations requiring explicit sign-off before dispatch.
              </CardDescription>
            </div>
            <span className="font-mono text-[11px] text-neutral-400 tabular-nums">
              {approvals.length} actions
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {approvals.length > 0 ? (
            <div className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
              {approvals.map((app) => (
                <div key={app.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs text-neutral-900 dark:text-neutral-100">
                        {app.title || "Privileged tool execution"}
                      </span>
                      <span className="font-mono text-[10px] text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                        {app.risk || "medium"} risk
                      </span>
                      <span className="font-mono text-[10px] text-neutral-400">
                        {app.status || "pending"}
                      </span>
                    </div>
                    {app.diff && (
                      <pre className="font-mono text-[11px] bg-neutral-100 dark:bg-neutral-800/60 p-2 rounded-md max-w-xl overflow-x-auto text-neutral-700 dark:text-neutral-300">
                        {app.diff}
                      </pre>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {app.status === "pending" || !app.status ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          isLoading={decidingId === app.id}
                          onClick={() => handleDecision(app.id, "reject")}
                        >
                          <X className="size-3 mr-1" strokeWidth={1.5} />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          isLoading={decidingId === app.id}
                          onClick={() => handleDecision(app.id, "approve")}
                        >
                          <Check className="size-3 mr-1" strokeWidth={1.5} />
                          Approve
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs font-mono text-neutral-400">{app.status}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-neutral-400">
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">No pending approvals</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Gated operations will prompt here for review.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Capability Grants Section (Endpoint: GET /api/v1/projects/:projectId/grants) */}
      <Card className="rounded-xl border-neutral-200/80 dark:border-neutral-800/80">
        <CardHeader className="p-4 pb-3 border-b border-neutral-200/60 dark:border-neutral-800/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                <Key className="size-4 text-neutral-400" strokeWidth={1.5} />
                Project capability grants
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Sub-collection grants binding capabilities to project &apos;{projectId}&apos;
              </CardDescription>
            </div>
            <form onSubmit={handleCreateGrant} className="flex items-center gap-1.5">
              <Input
                placeholder="e.g. terminal:write"
                value={newGrantCapability}
                onChange={(e) => setNewGrantCapability(e.target.value)}
                className="h-7 text-xs w-44"
              />
              <Button type="submit" size="sm" className="h-7 text-xs px-2.5" isLoading={isAddingGrant}>
                <Plus className="size-3 mr-1" />
                Add grant
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {grantsError ? (
            <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="size-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-semibold text-rose-400">Grants API Error</div>
                <div className="text-[11px] font-mono leading-relaxed">{grantsError}</div>
              </div>
            </div>
          ) : grants.length > 0 ? (
            <div className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
              {grants.map((g) => (
                <div key={g.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-neutral-200 font-medium">
                      {g.capability}
                    </span>
                    <span className="font-mono text-[10px] text-neutral-500 truncate max-w-[150px]">
                      {g.id}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        g.granted
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {g.granted ? "granted" : "pending"}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs text-neutral-400 hover:text-rose-400"
                    isLoading={revokingGrantId === g.id}
                    onClick={() => handleRevokeGrant(g.id)}
                    title="Revoke capability grant"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-neutral-400">
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">No capability grants configured</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Add privileged capability grants above to permit execution.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
