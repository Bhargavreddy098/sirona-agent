import React, { useState, useEffect, useRef } from "react";
import sironaApi from "../api";
import { Search, Check, Plus, X, ChevronRight, RefreshCw } from "lucide-react";

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  badge?: string;
  isDefault?: boolean;
  hasConfiguredApiKey?: boolean;
  contextWindow?: number;
}

export interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onSelectModel: (modelName: string, modelId?: string) => void;
  availableModels?: ModelOption[];
  onOpenProviderSettings?: () => void;
  onRefreshModels?: () => void;
}

const formatProviderLabel = (raw: string) => {
  const p = (raw || "").toLowerCase();
  if (p === "google") return "Google Gemini";
  if (p === "anthropic") return "Anthropic";
  if (p === "openai") return "OpenAI";
  if (p === "openai_compatible") return "OpenAI-compatible / local";
  return raw || "Custom";
};

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
  availableModels,
  onOpenProviderSettings,
  onRefreshModels,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [modelsList, setModelsList] = useState<ModelOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchLiveModels = async () => {
    setIsLoading(true);
    try {
      const res = await sironaApi.providers.models();
      const raw = res?.data?.models || (Array.isArray(res?.data) ? res.data : []);
      if (Array.isArray(raw) && raw.length > 0) {
        const clean = raw
          .filter((m: any) => m.name !== "Beam Free" && m.id !== "beam-free")
          .map((m: any) => {
            const hasKey = m.hasConfiguredApiKey !== undefined ? !!m.hasConfiguredApiKey : !!m.hasApiKey;
            return {
              id: m.id || m.name,
              name: m.name,
              provider: formatProviderLabel(m.provider || m.provider_kind),
              badge: hasKey ? "Ready" : "Key required",
              hasConfiguredApiKey: hasKey,
              isDefault: m.isDefault || false,
              contextWindow: m.contextWindow || m.context_window,
            };
          });
        setModelsList(clean);
      }
      onRefreshModels?.();
    } catch {
      setModelsList([
        { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite", provider: "Google Gemini", hasConfiguredApiKey: true, badge: "Ready", isDefault: true },
        { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", provider: "Google Gemini", hasConfiguredApiKey: true, badge: "Ready" },
        { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "Anthropic", hasConfiguredApiKey: false, badge: "Key required" },
        { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", hasConfiguredApiKey: false, badge: "Key required" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      return;
    }

    setTimeout(() => inputRef.current?.focus(), 50);

    if (availableModels && availableModels.length > 0) {
      setModelsList(
        availableModels
          .filter((m) => m.name !== "Beam Free" && m.id !== "beam-free")
          .map((m: any) => {
            const hasKey = m.hasConfiguredApiKey !== undefined ? !!m.hasConfiguredApiKey : !!m.hasApiKey;
            return {
              ...m,
              hasConfiguredApiKey: hasKey,
              badge: hasKey ? "Ready" : "Key required",
              provider: formatProviderLabel(m.provider || m.provider_kind),
            };
          })
      );
    } else {
      fetchLiveModels();
    }
  }, [isOpen, availableModels]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredModels = modelsList.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedProviders = Array.from(new Set(filteredModels.map((m) => m.provider)));
  const totalReady = modelsList.filter((m) => m.hasConfiguredApiKey).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        tabIndex={-1}
        className="relative w-full max-w-lg overflow-hidden rounded-[var(--radius-xl)] bg-[var(--surface-bg)] shadow-[var(--shadow-floating)] border border-[var(--border-subtle)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "80vh" }}
      >
        {/* Search Bar */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-3.5 py-2.5">
          <Search className="size-3.5 text-neutral-500 shrink-0" strokeWidth={1.5} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search models or providers"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
          />
          <div className="flex items-center gap-1.5 text-neutral-400">
            {onOpenProviderSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenProviderSettings();
                }}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-[var(--radius-sm)] bg-[var(--surface-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-active)] text-neutral-300 transition-colors cursor-pointer"
              >
                <Plus className="size-3" strokeWidth={1.5} />
                <span>API keys</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
            >
              <X className="size-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Telemetry Sub-header */}
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-[var(--app-bg)]/80 text-[11px] border-b border-[var(--border-subtle)] text-neutral-400 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span className="tabular-nums">{totalReady} ready for inference</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="tabular-nums text-neutral-500">{modelsList.length} registered</span>
            <button
              type="button"
              onClick={fetchLiveModels}
              disabled={isLoading}
              title="Refresh models from providers"
              className="p-0.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
            >
              <RefreshCw className={`size-3 ${isLoading ? "animate-spin" : ""}`} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Models List */}
        <div className="overflow-y-auto p-2.5 space-y-3 flex-1 min-h-0">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-neutral-500 font-mono">
              Loading models...
            </div>
          ) : groupedProviders.length === 0 ? (
            <div className="p-6 text-center space-y-2">
              <p className="text-xs text-neutral-500">
                {searchQuery ? `No models match "${searchQuery}"` : "No models found"}
              </p>
              {onOpenProviderSettings && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenProviderSettings();
                  }}
                  className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium bg-neutral-100 text-neutral-950 hover:bg-white cursor-pointer"
                >
                  Configure providers
                </button>
              )}
            </div>
          ) : (
            groupedProviders.map((provider) => {
              const models = filteredModels.filter((m) => m.provider === provider);
              return (
                <div key={provider} className="space-y-1">
                  <div className="px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    {provider}
                  </div>
                  {models.map((model) => {
                    const isSelected = selectedModel === model.name || selectedModel === model.id;
                    const isReady = !!model.hasConfiguredApiKey;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          onSelectModel(model.name, model.id);
                          onClose();
                        }}
                        className={`flex w-full items-center justify-between rounded-[var(--radius-md)] px-2.5 py-2 text-xs text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[var(--surface-hover)] text-white border border-[var(--border-active)] font-medium shadow-xs"
                            : "hover:bg-[var(--surface-hover)] text-neutral-300 border border-transparent hover:border-[var(--border-subtle)]"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="flex size-4 shrink-0 items-center justify-center">
                            {isSelected && <Check className="size-3.5 text-neutral-100" strokeWidth={2} />}
                          </span>
                          <span className="truncate">{model.name}</span>
                          <span className="text-[10px] text-neutral-500 font-mono truncate">
                            {model.id}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isReady ? (
                            <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                              ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20">
                              key needed
                            </span>
                          )}
                          {model.isDefault && (
                            <span className="text-[10px] font-mono text-neutral-500">
                              default
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
