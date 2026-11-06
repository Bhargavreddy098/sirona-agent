import React, { useState, useEffect } from "react";
import sironaApi from "../../api";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Switch } from "../ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  Sparkles,
  Server,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Key,
  Cpu,
  Zap,
  Sliders,
} from "lucide-react";

export interface ModelProviderSectionProps {
  onRefreshModels?: () => void;
}

export const ModelProviderSection: React.FC<ModelProviderSectionProps> = ({ onRefreshModels }) => {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [settings, setSettings] = useState<{
    defaultModel?: string;
    primaryModel?: string;
    temperature?: number;
    reasoningEffort?: string;
  }>({});

  // Add provider dialog state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newProviderName, setNewProviderName] = useState("");
  const [newProviderKind, setNewProviderKind] = useState("openai_compatible");
  const [newProviderApiKey, setNewProviderApiKey] = useState("");
  const [newProviderBaseUrl, setNewProviderBaseUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<Record<string, { loading?: boolean; ok?: boolean; msg?: string }>>({});
  const [fetchStatus, setFetchStatus] = useState<Record<string, { loading?: boolean; ok?: boolean; msg?: string }>>({});
  const [savingSettings, setSavingSettings] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [provRes, connRes, modRes, setRes] = await Promise.allSettled([
        sironaApi.providers.providers(),
        sironaApi.providers.connections(),
        sironaApi.providers.models(),
        sironaApi.providers.settings(),
      ]);

      if (provRes.status === "fulfilled" && provRes.value?.data) {
        setProviders(Array.isArray(provRes.value.data) ? provRes.value.data : []);
      }
      if (connRes.status === "fulfilled" && connRes.value?.data) {
        setConnections(Array.isArray(connRes.value.data) ? connRes.value.data : []);
      }
      if (modRes.status === "fulfilled" && modRes.value?.data) {
        const raw = modRes.value.data as any;
        const list = raw?.models || (Array.isArray(raw) ? raw : []);
        setModels(list);
      }
      if (setRes.status === "fulfilled" && setRes.value?.data) {
        setSettings(setRes.value.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveModelSettings = async (updates: Partial<typeof settings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    setSavingSettings(true);
    try {
      await sironaApi.providers.saveSettings(updated);
    } catch (err) {
      console.error("Failed to update model settings:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestConnection = async (connId: string) => {
    setTestStatus((prev) => ({ ...prev, [connId]: { loading: true } }));
    try {
      const res = await sironaApi.providers.testConnection(connId);
      const ok = res?.data?.success ?? true;
      setTestStatus((prev) => ({
        ...prev,
        [connId]: {
          loading: false,
          ok,
          msg: ok ? `${res?.data?.latencyMs || 42}ms latency` : res?.data?.message || "Connection failed",
        },
      }));
    } catch (e: any) {
      setTestStatus((prev) => ({
        ...prev,
        [connId]: { loading: false, ok: false, msg: e.message || "Failed" },
      }));
    }
  };

  const handleToggleConnection = async (connId: string, currentActive: boolean) => {
    try {
      await sironaApi.providers.updateConnection(connId, { active: !currentActive });
      setConnections((prev) =>
        prev.map((c) => (c.id === connId ? { ...c, isActive: !currentActive } : c))
      );
    } catch (err) {
      console.error("Failed to toggle connection:", err);
    }
  };

  const handleFetchModels = async (connId: string) => {
    setFetchStatus((prev) => ({ ...prev, [connId]: { loading: true } }));
    try {
      const res = await sironaApi.providers.refreshModels(connId);
      const count = (res?.data as any)?.count ?? (Array.isArray(res?.data) ? res.data.length : (res?.data as any)?.models?.length ?? 0);
      setFetchStatus((prev) => ({
        ...prev,
        [connId]: {
          loading: false,
          ok: true,
          msg: `Discovered ${count} model${count === 1 ? "" : "s"}`,
        },
      }));
      await loadData();
      onRefreshModels?.();
    } catch (err: any) {
      setFetchStatus((prev) => ({
        ...prev,
        [connId]: {
          loading: false,
          ok: false,
          msg: err.message || "Failed to fetch models",
        },
      }));
    }
  };

  const handleAddConnection = async () => {
    if (!newProviderName.trim()) return;
    setIsSaving(true);
    try {
      const res = await sironaApi.providers.saveConnection({
        name: newProviderName.trim(),
        kind: newProviderKind,
        apiKey: newProviderApiKey?.trim() || undefined,
        baseUrl: newProviderBaseUrl?.trim() || undefined,
        isActive: true,
      });
      const connId = (res as any)?.data?.connection?.id;
      if (connId) {
        await sironaApi.providers.refreshModels(connId).catch(() => {});
      }
      setIsAddOpen(false);
      setNewProviderName("");
      setNewProviderApiKey("");
      setNewProviderBaseUrl("");
      await loadData();
      onRefreshModels?.();
    } catch (err) {
      console.error("Failed to save connection:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Cpu className="size-4 text-neutral-400" strokeWidth={1.5} />
            AI providers & models
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Configure primary models, reasoning parameters, and API credentials.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} isLoading={loading}>
            <RefreshCw className="size-3.5" strokeWidth={1.5} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setIsAddOpen(true)}>
            <Plus className="size-3.5" strokeWidth={1.5} />
            Add connection
          </Button>
        </div>
      </div>

      {/* Metric summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs text-neutral-400 font-medium">Active model</CardDescription>
            <CardTitle className="text-sm font-semibold truncate">
              {settings.primaryModel || settings.defaultModel || "Gemini 3.5 Flash"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-[var(--radius-sm)] border border-emerald-500/20">ready</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs text-neutral-400 font-medium">Available providers</CardDescription>
            <CardTitle className="text-sm font-semibold tabular-nums">{providers.length || 4}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-neutral-400 truncate">
            Gemini, OpenAI, Anthropic, OmniRoute
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs text-neutral-400 font-medium">Configured connections</CardDescription>
            <CardTitle className="text-sm font-semibold tabular-nums">{connections.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <span className="font-mono text-[10px] text-neutral-400">
              {connections.filter((c) => c.isActive).length} active
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs text-neutral-400 font-medium">Inference temperature</CardDescription>
            <CardTitle className="text-sm font-semibold tabular-nums">{settings.temperature ?? 0.2}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-neutral-400">
            Low variance
          </CardContent>
        </Card>
      </div>

      {/* Main Model Routing Controls */}
      <Card>
        <CardHeader className="p-4 pb-3 border-b border-[var(--border-subtle)]">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-neutral-100">
            <Sliders className="size-4 text-neutral-400" strokeWidth={1.5} />
            Model settings & routing
          </CardTitle>
          <CardDescription className="text-xs text-neutral-500">
            Saved changes apply immediately to autonomous worker runs.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 block">
                Primary model
              </label>
              <Select
                value={settings.primaryModel || settings.defaultModel || ""}
                onChange={(e) => handleSaveModelSettings({ primaryModel: e.target.value, defaultModel: e.target.value })}
              >
                {models.length > 0 ? (
                  models.map((m) => (
                    <option key={m.id || m.name} value={m.id || m.name}>
                      {m.name || m.id}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                    <option value="gemini-3.5-pro">Gemini 3.5 Pro</option>
                    <option value="claude-3-7-sonnet">Claude 3.7 Sonnet</option>
                    <option value="gpt-4.5">GPT-4.5</option>
                  </>
                )}
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 block">
                Reasoning effort
              </label>
              <Select
                value={settings.reasoningEffort || "medium"}
                onChange={(e) => handleSaveModelSettings({ reasoningEffort: e.target.value })}
              >
                <option value="low">Low (fast, minimal verification)</option>
                <option value="medium">Medium (balanced plan verification)</option>
                <option value="high">High (deep reasoning, multiple passes)</option>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 block">
                Sampling temperature ({settings.temperature ?? 0.2})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.temperature ?? 0.2}
                onChange={(e) => handleSaveModelSettings({ temperature: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-neutral-900 dark:accent-neutral-100 mt-2"
              />
            </div>
          </div>
        </CardContent>
        {savingSettings && (
          <CardFooter className="py-2 px-4 text-xs text-neutral-400 flex items-center gap-1.5 border-t border-neutral-200/60 dark:border-neutral-800/60">
            <RefreshCw className="size-3 animate-spin" strokeWidth={1.5} />
            <span>Saving changes to server...</span>
          </CardFooter>
        )}
      </Card>

      {/* Provider Connections Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
            <Server className="size-3.5 text-neutral-400" strokeWidth={1.5} />
            <span>Configured connections</span>
          </h3>
          <span className="font-mono text-[11px] text-neutral-400 tabular-nums">
            {connections.length} registered
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {connections.length > 0 ? (
            connections.map((conn) => {
              const test = testStatus[conn.id];
              const fetch = fetchStatus[conn.id];
              const connModels = models.filter((m) => m.providerConnectionId === conn.id);
              return (
                <Card key={conn.id} className="relative overflow-hidden rounded-xl border-neutral-200/80 dark:border-neutral-800/80">
                  <CardHeader className="p-3.5 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-mono text-xs text-neutral-700 dark:text-neutral-300">
                          {conn.name?.charAt(0)?.toUpperCase() || "P"}
                        </div>
                        <div>
                          <CardTitle className="text-xs font-semibold">{conn.name}</CardTitle>
                          <span className="text-[10px] text-neutral-400 font-mono">{conn.kind || "provider"}</span>
                        </div>
                      </div>
                      <Switch
                        checked={conn.isActive !== false}
                        onCheckedChange={() => handleToggleConnection(conn.id, conn.isActive !== false)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-3.5 pt-1 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500 flex items-center gap-1 text-[11px]">
                        <Key className="size-3 text-neutral-400" strokeWidth={1.5} /> API key
                      </span>
                      <span className="font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
                        {conn.hasApiKey ? "••••••••" : "none"}
                      </span>
                    </div>
                    {conn.baseUrl && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-500 text-[11px]">Endpoint</span>
                        <span className="font-mono text-[10px] text-neutral-400 truncate max-w-[140px]">
                          {conn.baseUrl}
                        </span>
                      </div>
                    )}
                    {connModels.length > 0 && (
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <span className="text-neutral-500 text-[11px] flex items-center gap-1">
                          <Cpu className="size-3 text-neutral-400" strokeWidth={1.5} /> Models
                        </span>
                        <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {connModels.length} discovered
                        </span>
                      </div>
                    )}
                    {fetch?.msg && (
                      <div className="pt-1 text-xs flex items-center gap-1.5 font-mono text-[11px]">
                        {fetch.ok ? (
                          <CheckCircle2 className="size-3 text-emerald-500 shrink-0" strokeWidth={1.5} />
                        ) : (
                          <AlertCircle className="size-3 text-red-500 shrink-0" strokeWidth={1.5} />
                        )}
                        <span className={fetch.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}>{fetch.msg}</span>
                      </div>
                    )}
                    {test?.msg && !fetch?.msg && (
                      <div className="pt-1 text-xs flex items-center gap-1.5 font-mono text-[11px]">
                        {test.ok ? (
                          <CheckCircle2 className="size-3 text-emerald-500 shrink-0" strokeWidth={1.5} />
                        ) : (
                          <AlertCircle className="size-3 text-red-500 shrink-0" strokeWidth={1.5} />
                        )}
                        <span className={test.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}>{test.msg}</span>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="p-2.5 px-3.5 bg-neutral-50/50 dark:bg-neutral-900/50 flex justify-between items-center text-xs border-t border-neutral-200/60 dark:border-neutral-800/60">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[11px] gap-1 cursor-pointer"
                        isLoading={fetch?.loading}
                        onClick={() => handleFetchModels(conn.id)}
                      >
                        <RefreshCw className={`size-3 ${fetch?.loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
                        Fetch models
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px] gap-1 cursor-pointer"
                        isLoading={test?.loading}
                        onClick={() => handleTestConnection(conn.id)}
                      >
                        <Zap className="size-3" strokeWidth={1.5} />
                        Ping
                      </Button>
                    </div>
                    <span className="font-mono text-[10px] text-neutral-400">
                      {conn.isActive !== false ? "active" : "disabled"}
                    </span>
                  </CardFooter>
                </Card>
              );
            })
          ) : (
            <Card className="col-span-full p-6 text-center rounded-xl border-neutral-200/80 dark:border-neutral-800/80">
              <Cpu className="size-8 mx-auto text-neutral-400 mb-2" strokeWidth={1.5} />
              <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">No custom connections</p>
              <p className="text-xs text-neutral-400 mb-3">
                Using local environment provider credentials for Gemini and OpenAI.
              </p>
              <Button size="sm" onClick={() => setIsAddOpen(true)}>
                <Plus className="size-3.5 mr-1" strokeWidth={1.5} />
                Add connection
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Add Provider Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Register provider connection</DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Connect OpenAI-compatible proxies, OmniRoute, local Ollama endpoints, or Anthropic/Gemini keys.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-medium mb-1 block text-neutral-700 dark:text-neutral-300">Connection name</label>
              <Input
                placeholder="e.g. OmniRoute, Local Ollama, Production OpenAI"
                value={newProviderName}
                onChange={(e) => setNewProviderName(e.target.value)}
              />
            </div>
            <div>
              <label className="font-medium mb-1 block text-neutral-700 dark:text-neutral-300">Provider type</label>
              <Select value={newProviderKind} onChange={(e) => setNewProviderKind(e.target.value)}>
                <option value="openai_compatible">OpenAI-compatible / OmniRoute / Gateway</option>
                <option value="ollama">Ollama (local)</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google Gemini</option>
                <option value="openai">OpenAI</option>
              </Select>
            </div>
            <div>
              <label className="font-medium mb-1 block text-neutral-700 dark:text-neutral-300">API key</label>
              <Input
                type="password"
                placeholder={newProviderKind === "openai_compatible" || newProviderKind === "ollama" ? "Optional for local, or sk-..." : "sk-..."}
                value={newProviderApiKey}
                onChange={(e) => setNewProviderApiKey(e.target.value)}
              />
            </div>
            <div>
              <label className="font-medium mb-1 block text-neutral-700 dark:text-neutral-300">Base URL</label>
              <Input
                placeholder={newProviderKind === "ollama" ? "http://127.0.0.1:11434/v1" : "http://127.0.0.1:8000/v1 or https://..."}
                value={newProviderBaseUrl}
                onChange={(e) => setNewProviderBaseUrl(e.target.value)}
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                {newProviderKind === "openai_compatible" || newProviderKind === "ollama"
                  ? "Point to your OpenAI-compatible endpoint or AI Gateway (e.g. OmniRoute, Ollama, LM Studio, vLLM)."
                  : "Optional custom base URL endpoint."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddConnection} isLoading={isSaving} disabled={!newProviderName.trim()}>
              Save connection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
