import React, { useState, useEffect, useRef } from "react";
import sironaApi from "../api";
import {
  SearchIcon,
  PlusIcon,
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
} from "./Icons";

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
}

const formatProviderLabel = (raw: string) => {
  const p = (raw || "").toLowerCase();
  if (p === "google") return "Google Gemini";
  if (p === "anthropic") return "Anthropic";
  if (p === "openai") return "OpenAI";
  if (p === "openai_compatible") return "OpenAI Compatible / Local";
  return raw || "Custom";
};

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
  availableModels,
  onOpenProviderSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [modelsList, setModelsList] = useState<ModelOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load available models from props or server
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
          .map((m) => ({
            ...m,
            provider: formatProviderLabel(m.provider),
          }))
      );
    } else {
      setIsLoading(true);
      sironaApi.providers
        .models()
        .then((res) => {
          const raw = res?.data?.models || (Array.isArray(res?.data) ? res.data : []);
          if (Array.isArray(raw) && raw.length > 0) {
            const clean = raw
              .filter((m: any) => m.name !== "Beam Free" && m.id !== "beam-free")
              .map((m: any) => ({
                id: m.id || m.name,
                name: m.name,
                provider: formatProviderLabel(m.provider || m.provider_kind),
                badge: m.hasConfiguredApiKey ? "Ready" : "Key Required",
                hasConfiguredApiKey: !!m.hasConfiguredApiKey,
                isDefault: m.isDefault || false,
                contextWindow: m.contextWindow || m.context_window,
              }));
            setModelsList(clean);
          }
        })
        .catch(() => {
          setModelsList([
            { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite", provider: "Google Gemini", hasConfiguredApiKey: true, badge: "Ready", isDefault: true },
            { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", provider: "Google Gemini", hasConfiguredApiKey: true, badge: "Ready" },
            { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "Anthropic", hasConfiguredApiKey: false, badge: "Key Required" },
            { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", hasConfiguredApiKey: false, badge: "Key Required" },
          ]);
        })
        .finally(() => setIsLoading(false));
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn select-none"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        tabIndex={-1}
        className="relative w-full max-w-[540px] overflow-hidden rounded-2xl bg-v2-background-bg-base shadow-2xl border border-v2-border-border-base select-none ring-1 ring-black/5 dark:ring-white/10"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "82vh" }}
      >
        <div className="sr-only">
          <h2>Select model</h2>
        </div>

        {/* Search Input Bar */}
        <div className="flex items-center border-b border-v2-border-border-base px-3.5 py-2.5">
          <SearchIcon className="text-v2-icon-icon-muted me-2" size={16} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search models by name or id..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-[13px] text-v2-text-text-base placeholder:text-v2-text-text-faint focus:outline-none"
          />
          <div className="flex items-center gap-1 text-v2-text-text-faint">
            {onOpenProviderSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenProviderSettings();
                }}
                title="Configure Providers and API Keys"
                className="flex items-center gap-1 px-2 py-1 text-[11px] rounded bg-v2-background-bg-deep border border-v2-border-border-base hover:bg-v2-overlay-simple-overlay-hover hover:text-v2-text-text-base cursor-pointer"
              >
                <PlusIcon size={12} />
                <span>API Keys</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:bg-v2-overlay-simple-overlay-hover hover:text-v2-text-text-base cursor-pointer ms-1"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        </div>

        {/* Working Status Indicator Bar */}
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-v2-background-bg-deep text-[11px] border-b border-v2-border-border-base text-v2-text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>{totalReady} model{totalReady !== 1 ? "s" : ""} ready for inference</span>
          </span>
          <span className="text-v2-text-text-faint">
            {modelsList.length} total registered
          </span>
        </div>

        {/* Models List */}
        <div className="overflow-y-auto max-h-[400px] p-2 space-y-3">
          {isLoading ? (
            <div className="p-8 text-center text-v2-text-text-faint text-[13px]">
              Loading registered models...
            </div>
          ) : groupedProviders.length === 0 ? (
            <div className="p-6 text-center space-y-2">
              <p className="text-v2-text-text-faint text-[13px]">
                {searchQuery ? `No models match "${searchQuery}"` : "No AI models available."}
              </p>
              {onOpenProviderSettings && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenProviderSettings();
                  }}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 cursor-pointer"
                >
                  Configure Model Providers
                </button>
              )}
            </div>
          ) : (
            groupedProviders.map((provider) => {
              const models = filteredModels.filter((m) => m.provider === provider);
              return (
                <div key={provider} className="space-y-0.5">
                  <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-bold text-v2-text-text-faint uppercase tracking-wider">
                    <span>{provider}</span>
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
                        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-start transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-v2-overlay-simple-overlay-selected text-v2-text-text-base font-semibold"
                            : "hover:bg-v2-overlay-simple-overlay-hover text-v2-text-text-base"
                        }`}
                      >
                        <span className="flex size-4 shrink-0 items-center justify-center">
                          {isSelected && <CheckIcon size={14} className="text-v2-text-text-base" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={isReady ? "font-medium" : "text-v2-text-text-muted"}>
                              {model.name}
                            </span>
                            <span className="text-[11px] text-v2-text-text-faint font-mono">
                              ({model.id})
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isReady ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <span className="size-1.5 rounded-full bg-emerald-500" />
                              Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 dark:bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              Needs Key
                            </span>
                          )}
                          {model.isDefault && (
                            <span className="flex items-center gap-0.5 text-[11px] text-v2-text-text-faint">
                              <span>Default</span>
                              <ChevronRightIcon size={12} />
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
