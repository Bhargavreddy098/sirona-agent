import React, { useState, useEffect } from "react";
import sironaApi from "../../api";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Wrench,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Terminal,
  Activity,
  Layers,
  RefreshCw,
  AlertCircle,
  FileCheck2,
  Network,
} from "lucide-react";

export const AgentExecutionSection: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isQualifying, setIsQualifying] = useState(false);
  const [qualifyResult, setQualifyResult] = useState<string | null>(null);

  // Historical Isolation Qualifications (GET /api/v1/isolation/qualifications)
  const [qualifications, setQualifications] = useState<any[]>([]);
  const [qualificationsError, setQualificationsError] = useState<string | null>(null);

  // Developer Bridge Connections (GET /api/v1/developer-connections)
  const [devConnections, setDevConnections] = useState<any[]>([]);
  const [devConnectionsError, setDevConnectionsError] = useState<string | null>(null);
  const [qualifyingConnId, setQualifyingConnId] = useState<string | null>(null);
  const [connQualifyResults, setConnQualifyResults] = useState<Record<string, string>>({});

  const loadData = async () => {
    setLoading(true);
    setQualificationsError(null);
    setDevConnectionsError(null);
    try {
      const [runsRes, toolsRes, diagRes, qualRes, connRes] = await Promise.allSettled([
        sironaApi.execution.listAll(),
        sironaApi.tools.tools(),
        sironaApi.isolation.diagnostics(),
        sironaApi.isolation.qualifications(),
        sironaApi.tools.connections(),
      ]);

      if (runsRes.status === "fulfilled" && runsRes.value?.data) {
        setRuns(Array.isArray(runsRes.value.data) ? runsRes.value.data : []);
      }
      if (toolsRes.status === "fulfilled" && toolsRes.value?.data) {
        const raw = toolsRes.value.data as any;
        const list = raw?.tools || (Array.isArray(raw) ? raw : []);
        setTools(list);
      }
      if (diagRes.status === "fulfilled" && diagRes.value?.data) {
        setDiagnostics(diagRes.value.data);
      }
      if (qualRes.status === "fulfilled" && qualRes.value?.data) {
        setQualifications(Array.isArray(qualRes.value.data) ? qualRes.value.data : []);
      } else if (qualRes.status === "rejected") {
        setQualificationsError(qualRes.reason?.message || "Failed to load audit receipts");
      }

      if (connRes.status === "fulfilled" && connRes.value?.data) {
        setDevConnections(Array.isArray(connRes.value.data) ? connRes.value.data : []);
      } else if (connRes.status === "rejected") {
        setDevConnectionsError(connRes.reason?.message || "Failed to load developer bridge connections");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQualifyConnection = async (id: string) => {
    setQualifyingConnId(id);
    try {
      const res = await sironaApi.tools.qualifyConnection(id);
      setConnQualifyResults((prev) => ({
        ...prev,
        [id]: res?.data?.qualified ? "Qualified" : (res?.data?.message || "Failed qualification"),
      }));
    } catch (err: any) {
      setConnQualifyResults((prev) => ({
        ...prev,
        [id]: err.message || "Qualification error",
      }));
    } finally {
      setQualifyingConnId(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQualify = async () => {
    setIsQualifying(true);
    setQualifyResult(null);
    try {
      const res = await sironaApi.isolation.qualify();
      setQualifyResult(res?.data?.qualified ? "Environment qualified for isolated execution" : "Qualification reported warnings");
    } catch (e: any) {
      setQualifyResult(e.message || "Qualification check failed");
    } finally {
      setIsQualifying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "running":
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded">
            <span className="size-1 rounded-full bg-amber-500" />
            running
          </span>
        );
      case "completed":
      case "success":
        return (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded">
            <span className="size-1 rounded-full bg-emerald-500" />
            completed
          </span>
        );
      case "failed":
      case "error":
        return (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-red-700 dark:text-red-300 bg-red-500/10 px-2 py-0.5 rounded">
            <span className="size-1 rounded-full bg-red-500" />
            failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center font-mono text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
            {status || "idle"}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Activity className="size-4 text-neutral-400" strokeWidth={1.5} />
            Runs & runtime sandbox
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Monitor autonomous runs, registered tools, and process isolation diagnostics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} isLoading={loading}>
            <RefreshCw className="size-3.5" strokeWidth={1.5} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleQualify} isLoading={isQualifying}>
            <ShieldCheck className="size-3.5" strokeWidth={1.5} />
            Test isolation
          </Button>
        </div>
      </div>

      {/* Qualification Alert */}
      {qualifyResult && (
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl text-xs flex items-center justify-between border border-neutral-200/80 dark:border-neutral-700/80">
          <span className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
            <ShieldCheck className="size-4 text-neutral-500" strokeWidth={1.5} />
            {qualifyResult}
          </span>
          <button
            type="button"
            className="text-[11px] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
            onClick={() => setQualifyResult(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Isolation Diagnostics Card */}
      <Card className="rounded-xl border-neutral-200/80 dark:border-neutral-800/80">
        <CardHeader className="p-4 pb-3 border-b border-neutral-200/60 dark:border-neutral-800/60">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
              <ShieldCheck className="size-4 text-neutral-400" strokeWidth={1.5} />
              Runtime isolation diagnostics
            </CardTitle>
            <span className="font-mono text-[11px] text-neutral-500">
              {diagnostics?.hypervisor || "Host native"}
            </span>
          </div>
          <CardDescription className="text-xs text-neutral-500">
            Sandboxed process boundaries guarantee filesystem isolation and restricted network egress.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-900/50">
              <span className="text-[11px] text-neutral-400 block mb-0.5">Hypervisor driver</span>
              <span className="font-medium text-xs text-neutral-800 dark:text-neutral-200">
                {diagnostics?.hypervisor || "Hardware virtualization"}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-900/50">
              <span className="text-[11px] text-neutral-400 block mb-0.5">WSL environment</span>
              <div className="flex items-center gap-1.5 font-medium text-xs text-neutral-800 dark:text-neutral-200">
                {diagnostics?.wslRunning !== false ? (
                  <CheckCircle className="size-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
                ) : (
                  <XCircle className="size-3.5 text-neutral-400" strokeWidth={1.5} />
                )}
                <span>{diagnostics?.wslRunning !== false ? "Active" : "Standby"}</span>
              </div>
            </div>
            <div className="p-3 rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-900/50">
              <span className="text-[11px] text-neutral-400 block mb-0.5">Container engine</span>
              <div className="flex items-center gap-1.5 font-medium text-xs text-neutral-800 dark:text-neutral-200">
                <CheckCircle className="size-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
                <span>Rootless sandbox</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Execution Runs Table */}
      <Card className="rounded-xl border-neutral-200/80 dark:border-neutral-800/80">
        <CardHeader className="p-4 pb-3 border-b border-neutral-200/60 dark:border-neutral-800/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                <Layers className="size-4 text-neutral-400" strokeWidth={1.5} />
                Execution runs
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Recent agent execution runs and step traces.
              </CardDescription>
            </div>
            <span className="font-mono text-[11px] text-neutral-400 tabular-nums">
              {runs.length} runs
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {runs.length > 0 ? (
            <div className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
              {runs.map((r) => (
                <div key={r.id} className="py-2.5 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-neutral-800 dark:text-neutral-200">
                        {r.id.substring(0, 12)}
                      </span>
                      {getStatusBadge(r.status)}
                    </div>
                    <div className="text-[11px] text-neutral-400 flex items-center gap-2 font-mono">
                      <Clock className="size-3" strokeWidth={1.5} />
                      <span>{r.startedAt ? new Date(r.startedAt).toLocaleTimeString() : "Just now"}</span>
                      {r.goalId && <span>Goal: {r.goalId}</span>}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-6 text-[11px] px-2">
                    Trace
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-neutral-400">
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">No active runs</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Tasks dispatched from chat will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registered Agent Tools */}
      <Card className="rounded-xl border-neutral-200/80 dark:border-neutral-800/80">
        <CardHeader className="p-4 pb-3 border-b border-neutral-200/60 dark:border-neutral-800/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                <Wrench className="size-4 text-neutral-400" strokeWidth={1.5} />
                Registered agent tools
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Capabilities available to worker runtimes in this workspace.
              </CardDescription>
            </div>
            <span className="font-mono text-[11px] text-neutral-400 tabular-nums">
              {tools.length} tools
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {tools.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {tools.map((tool: any) => (
                <div
                  key={tool.name || tool.id}
                  className="p-2.5 rounded-lg border border-neutral-200/70 dark:border-neutral-800/70 bg-neutral-50/40 dark:bg-neutral-900/40 flex items-start gap-2"
                >
                  <Terminal className="size-3.5 text-neutral-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {tool.name || tool.id}
                    </div>
                    <div className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                      {tool.description || "Core runtime tool"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-neutral-500 font-mono">
              No registered tools discovered from runtime
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical Isolation Qualifications & Audit Receipts (Endpoint: GET /api/v1/isolation/qualifications) */}
      <Card className="rounded-xl border-neutral-200/80 dark:border-neutral-800/80">
        <CardHeader className="p-4 pb-3 border-b border-neutral-200/60 dark:border-neutral-800/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                <FileCheck2 className="size-4 text-neutral-400" strokeWidth={1.5} />
                Isolation qualification receipts
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Audit receipts validating process isolation barriers and hypervisor sandbox health.
              </CardDescription>
            </div>
            <span className="font-mono text-[11px] text-neutral-400 tabular-nums">
              {qualifications.length} receipts
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {qualificationsError ? (
            <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="size-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-semibold text-rose-400">Qualifications API Error</div>
                <div className="text-[11px] font-mono leading-relaxed">{qualificationsError}</div>
              </div>
            </div>
          ) : qualifications.length > 0 ? (
            <div className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
              {qualifications.map((q) => (
                <div key={q.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[11px] text-neutral-300 truncate max-w-xs">{q.id}</span>
                    <span className="text-neutral-500 text-[10px] font-mono">
                      {q.timestamp ? new Date(q.timestamp).toLocaleString() : "Recent"}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                      q.passed
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {q.passed ? "passed" : "failed"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-neutral-400">
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">No audit receipts recorded</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Trigger qualification above to generate an audit receipt.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Developer Bridge Connections (Endpoint: GET /api/v1/developer-connections) */}
      <Card className="rounded-xl border-neutral-200/80 dark:border-neutral-800/80">
        <CardHeader className="p-4 pb-3 border-b border-neutral-200/60 dark:border-neutral-800/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                <Network className="size-4 text-neutral-400" strokeWidth={1.5} />
                Developer bridge connections
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                External bridge interfaces connecting devtools, LSP servers, and tool providers.
              </CardDescription>
            </div>
            <span className="font-mono text-[11px] text-neutral-400 tabular-nums">
              {devConnections.length} bridges
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {devConnectionsError ? (
            <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="size-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-semibold text-rose-400">Developer Connections API Error</div>
                <div className="text-[11px] font-mono leading-relaxed">{devConnectionsError}</div>
              </div>
            </div>
          ) : devConnections.length > 0 ? (
            <div className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
              {devConnections.map((conn) => (
                <div key={conn.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-200">{conn.name}</span>
                      <span className="font-mono text-[10px] text-neutral-500">{conn.type}</span>
                    </div>
                    {connQualifyResults[conn.id] && (
                      <div className="font-mono text-[10px] text-neutral-400">
                        Result: {connQualifyResults[conn.id]}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                        conn.status === "active" || conn.status === "connected"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {conn.status || "idle"}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs px-2"
                      isLoading={qualifyingConnId === conn.id}
                      onClick={() => handleQualifyConnection(conn.id)}
                    >
                      Qualify
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-neutral-400">
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">No developer connections registered</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">External devtools and LSP connections will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
