import React, { useState, useEffect, useRef } from "react";
import {
  SearchIcon,
  PlusIcon,
  OutlineSlidersIcon,
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
}

export interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onSelectModel: (modelName: string) => void;
  availableModels?: ModelOption[];
  onOpenProviderSettings?: () => void;
}

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
  const inputRef = useRef<HTMLInputElement>(null);

  // Load available models from props or server
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      return;
    }

    setTimeout(() => inputRef.current?.focus(), 50);

    if (availableModels && availableModels.length > 0) {
      setModelsList(availableModels.filter((m) => m.name !== "Beam Free" && m.id !== "beam-free"));
    } else {
      fetch("/api/model")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.data && Array.isArray(data.data)) {
            const clean = data.data
              .filter((m: any) => m.name !== "Beam Free" && m.id !== "beam-free")
              .map((m: any) => ({
                id: m.id || m.modelID || m.name,
                name: m.name,
                provider: m.provider || (m.providerID === "google" ? "Google Gemini" : m.providerID === "anthropic" ? "Anthropic" : "Custom"),
                badge: m.badge || "Pro",
                isDefault: m.isDefault || false,
              }));
            setModelsList(clean);
          }
        })
        .catch(() => {
          // Fallback only to real providers (no Beam Free)
          setModelsList([
            { id: "anthropic:claude-3-5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", badge: "Pro", isDefault: true },
            { id: "google:gemini-2-5-pro", name: "Gemini 2.5 Pro", provider: "Google Gemini", badge: "Pro" },
          ]);
        });
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
      m.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedProviders = Array.from(new Set(filteredModels.map((m) => m.provider)));

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
        className="relative w-full max-w-[500px] overflow-hidden rounded-2xl bg-v2-background-bg-base shadow-2xl border border-v2-border-border-base select-none ring-1 ring-black/5 dark:ring-white/10"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "80vh" }}
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
            placeholder="Search available models..."
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
                title="Add custom provider"
                className="flex items-center gap-1 px-2 py-1 text-[11px] rounded bg-v2-background-bg-deep border border-v2-border-border-base hover:bg-v2-overlay-simple-overlay-hover hover:text-v2-text-text-base cursor-pointer"
              >
                <PlusIcon size={12} />
                <span>Add Provider</span>
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

        {/* Models List */}
        <div className="overflow-y-auto max-h-[380px] p-2 space-y-3">
          {groupedProviders.length === 0 ? (
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
                  Configure Custom Provider
                </button>
              )}
            </div>
          ) : (
            groupedProviders.map((provider) => {
              const models = filteredModels.filter((m) => m.provider === provider);
              return (
                <div key={provider} className="space-y-0.5">
                  <div className="px-2.5 py-1 text-[11px] font-bold text-v2-text-text-faint uppercase tracking-wider">
                    {provider}
                  </div>
                  {models.map((model) => {
                    const isSelected = selectedModel === model.name;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          onSelectModel(model.name);
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
                        <span className="flex-1 min-w-0 truncate flex items-center gap-1.5">
                          <span>{model.name}</span>
                          {model.badge && (
                            <span className="rounded bg-v2-background-bg-deep px-1.5 py-0.5 text-[10px] text-v2-text-text-muted border border-v2-border-border-base font-medium">
                              {model.badge}
                            </span>
                          )}
                        </span>
                        {model.isDefault && (
                          <span className="flex items-center gap-1 text-[11px] text-v2-text-text-faint">
                            <span>Default</span>
                            <ChevronRightIcon size={12} />
                          </span>
                        )}
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
