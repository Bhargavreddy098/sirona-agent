import React, { useState, useRef, useEffect } from "react";
import {
  Terminal,
  ChevronDown,
  ArrowUp,
  GitBranch,
  AlertTriangle,
  Folder,
} from "lucide-react";

export interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

export interface MainCanvasProps {
  selectedModel: string;
  onOpenModelPicker: () => void;
  onSendMessage: (text: string) => Promise<void>;
  messages: MessageItem[];
  isSending: boolean;
  workspacePath?: string;
  projectName?: string;
  branchName?: string;
}

export const MainCanvas: React.FC<MainCanvasProps> = ({
  selectedModel,
  onOpenModelPicker,
  onSendMessage,
  messages,
  isSending,
  workspacePath = "C:\\Users\\bharg\\OneDrive\\Desktop\\personal -agent",
  projectName = "personal-agent",
  branchName = "main",
}) => {
  const [prompt, setPrompt] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || isSending) return;
    setPrompt("");
    await onSendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionClick = (text: string) => {
    setPrompt(text);
    textareaRef.current?.focus();
  };

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const hasMessages = messages.length > 0;

  return (
    <main className="flex-1 min-h-0 min-w-0 flex flex-col bg-[var(--app-bg)] p-2 sm:p-2.5 overflow-hidden select-none">
      {/* Workspace Panel Surface */}
      <div className="relative flex-1 min-h-0 min-w-0 flex flex-col rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--panel-bg)] overflow-hidden shadow-[var(--shadow-panel)]">
        {/* Messages Stream */}
        {hasMessages ? (
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 max-w-3xl w-full mx-auto space-y-4">
            {messages.map((msg) => {
              const isAlert = msg.content.startsWith("⚠️");
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`px-4 py-3 max-w-[85%] text-xs leading-relaxed transition-all ${
                      msg.role === "user"
                        ? "bg-[var(--surface-bg)] text-neutral-100 rounded-[var(--radius-lg)] border border-[var(--border-active)] shadow-xs font-medium"
                        : isAlert
                        ? "bg-amber-500/10 text-amber-200 border border-amber-500/25 rounded-[var(--radius-md)]"
                        : "bg-[var(--surface-bg)]/60 text-neutral-200 border border-[var(--border-subtle)] rounded-[var(--radius-lg)]"
                    }`}
                  >
                    {isAlert ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 font-medium text-amber-400">
                          <AlertTriangle className="size-3.5" strokeWidth={1.5} />
                          <span className="text-[11px] font-semibold tracking-wide uppercase">Inference notice</span>
                        </div>
                        <div className="whitespace-pre-wrap select-text font-mono text-[11px] text-amber-200/90 leading-relaxed">
                          {msg.content.replace(/^⚠️\s*/, "")}
                        </div>
                        <div className="pt-1.5">
                          <button
                            type="button"
                            onClick={onOpenModelPicker}
                            className="px-3 py-1 text-xs font-medium rounded-[var(--radius-sm)] bg-amber-600/90 hover:bg-amber-600 text-white dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-neutral-950 transition-colors cursor-pointer"
                          >
                            Select configured model
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap select-text text-neutral-200 leading-relaxed">{msg.content}</div>
                    )}
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-center gap-2 text-xs text-neutral-500 pt-1">
                <span className="size-1.5 rounded-full bg-neutral-400 animate-pulse" />
                <span className="font-mono text-[11px]">Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          /* Empty State - Tactile Graphite Minimalism */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="size-9 rounded-[var(--radius-md)] bg-[var(--surface-bg)] border border-[var(--border-subtle)] flex items-center justify-center text-neutral-300 mb-3 shadow-xs">
              <Terminal className="size-4" strokeWidth={1.5} />
            </div>
            <h1 className="text-sm font-semibold tracking-tight text-neutral-100 mb-1">
              Sirona Autonomous Workbench
            </h1>
            <p className="text-xs text-neutral-400 max-w-sm mb-6">
              Local-first agent execution with sandbox isolation and governance controls.
            </p>

            {/* Quick Suggestion Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-xl w-full text-left mb-4">
              <button
                type="button"
                onClick={() => handleSuggestionClick("Check connected AI providers and model settings")}
                className="p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:border-[var(--border-active)] bg-[var(--surface-bg)] hover:bg-[var(--surface-hover)] text-xs text-neutral-300 transition-all cursor-pointer group shadow-xs"
              >
                <div className="font-medium text-neutral-200 mb-0.5 group-hover:text-white transition-colors">Model routing</div>
                <div className="text-neutral-500 text-[11px]">Inspect providers and API keys</div>
              </button>

              <button
                type="button"
                onClick={() => handleSuggestionClick("Run environment qualification on worker isolation")}
                className="p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:border-[var(--border-active)] bg-[var(--surface-bg)] hover:bg-[var(--surface-hover)] text-xs text-neutral-300 transition-all cursor-pointer group shadow-xs"
              >
                <div className="font-medium text-neutral-200 mb-0.5 group-hover:text-white transition-colors">Worker sandbox</div>
                <div className="text-neutral-500 text-[11px]">Qualify runtime diagnostics</div>
              </button>

              <button
                type="button"
                onClick={() => handleSuggestionClick("Review active policy and budget limits")}
                className="p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:border-[var(--border-active)] bg-[var(--surface-bg)] hover:bg-[var(--surface-hover)] text-xs text-neutral-300 transition-all cursor-pointer group shadow-xs"
              >
                <div className="font-medium text-neutral-200 mb-0.5 group-hover:text-white transition-colors">Governance</div>
                <div className="text-neutral-500 text-[11px]">Token ceilings and approvals</div>
              </button>
            </div>
          </div>
        )}

        {/* Floating Recessed Chat Input Container */}
        <div className="p-3.5 sm:p-5 bg-transparent shrink-0">
          <div className="max-w-3xl mx-auto space-y-2">
            <form
              onSubmit={handleSubmit}
              className="relative rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-bg)] shadow-[var(--shadow-floating)] focus-within:border-[var(--border-active)] focus-within:bg-[var(--surface-bg)] transition-all duration-200"
            >
              <div className="p-3 pt-3.5">
                <textarea
                  ref={textareaRef}
                  rows={2}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message Sirona or type /"
                  className="block w-full resize-none bg-transparent text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Bottom controls */}
              <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onOpenModelPicker}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-xs font-medium text-neutral-300 hover:text-white hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border-subtle)] transition-all cursor-pointer"
                  >
                    <span className="truncate max-w-[170px] font-mono text-[11px]">{selectedModel}</span>
                    <ChevronDown className="size-3 text-neutral-400" strokeWidth={1.5} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={!prompt.trim() || isSending}
                    aria-label="Send message"
                    className={`size-7 rounded-[var(--radius-sm)] flex items-center justify-center transition-all cursor-pointer ${
                      prompt.trim() && !isSending
                        ? "bg-neutral-100 text-neutral-950 hover:bg-white shadow-xs"
                        : "bg-white/5 text-neutral-600 border border-[var(--border-subtle)] cursor-not-allowed"
                    }`}
                  >
                    <ArrowUp className="size-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </form>

            {/* Context Breadcrumb Bar */}
            <div className="flex items-center justify-between text-[11px] text-neutral-500 px-1 font-mono">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-neutral-400">
                  <Folder className="size-3" strokeWidth={1.5} />
                  <span>{projectName}</span>
                </div>
                <span>/</span>
                <div className="flex items-center gap-1 text-neutral-500">
                  <GitBranch className="size-3" strokeWidth={1.5} />
                  <span>{branchName}</span>
                </div>
              </div>

              <div className="truncate max-w-xs text-neutral-500 select-text">
                {workspacePath}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
