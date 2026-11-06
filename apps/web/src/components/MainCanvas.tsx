import React, { useState, useRef, useEffect } from "react";
import {
  PlusIcon,
  ChevronDownIcon,
  ArrowUpIcon,
  MonitorIcon,
  BranchIcon,
} from "./Icons";

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
  projectName = "personal -agent",
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

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const hasMessages = messages.length > 0;

  return (
    <main
      className="flex-1 min-h-0 min-w-0 overflow-x-hidden flex flex-col items-start contain-content"
      style={{
        paddingTop: "0px",
        paddingBottom: "var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="relative flex size-full min-h-0 min-w-0 flex-col">
        <div className="flex size-full min-h-0 min-w-0 flex-col">
          <div className="relative size-full overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0 flex flex-col gap-2 px-[var(--shell-inline-inset,8px)] pb-[var(--shell-bottom-inset,8px)] pt-[var(--shell-top-inset,8px)]">
              <div className="@container relative flex flex-col min-h-0 h-full flex-1">
                <div
                  data-component="new-session"
                  className="relative isolate flex-1 min-h-0 overflow-y-auto rounded-[10px] bg-v2-background-bg-base shadow-[var(--v2-elevation-raised)] flex flex-col"
                >
                  {/* Messages Conversation Stream if present */}
                  {hasMessages ? (
                    <div className="flex-1 overflow-y-auto p-6 max-w-[880px] w-full mx-auto space-y-6">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            msg.role === "user" ? "items-end" : "items-start"
                          }`}
                        >
                          <div
                            className={`rounded-2xl px-4 py-2.5 max-w-[85%] text-[13px] leading-relaxed shadow-sm ${
                              msg.role === "user"
                                ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 font-medium"
                                : msg.content.startsWith("⚠️")
                                ? "bg-amber-500/10 dark:bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30 dark:border-amber-500/40"
                                : "bg-v2-background-bg-deep text-v2-text-text-base border border-v2-border-border-base"
                            }`}
                          >
                            {msg.content.startsWith("⚠️") ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400">
                                  <span>Inference Alert</span>
                                </div>
                                <div className="whitespace-pre-wrap">{msg.content.replace(/^⚠️\s*/, "")}</div>
                                <div className="pt-1 flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={onOpenModelPicker}
                                    className="px-2.5 py-1 text-[11px] font-medium bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-neutral-950 rounded-md transition-colors cursor-pointer"
                                  >
                                    Select Registered Model
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="whitespace-pre-wrap">{msg.content}</div>
                            )}
                          </div>
                        </div>
                      ))}
                      {isSending && (
                        <div className="flex items-center gap-2 text-v2-text-text-faint text-[13px]">
                          <span className="size-2 rounded-full bg-v2-text-text-accent animate-ping" />
                          <span>Sirona is thinking...</span>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : null}

                  {/* Centered Watermark & Composer when no messages */}
                  <div
                    className={`${
                      hasMessages
                        ? "p-4 border-t border-v2-border-border-base bg-v2-background-bg-base shrink-0"
                        : "absolute inset-x-0 top-[25.375%] flex justify-center px-6"
                    }`}
                  >
                    <div className="w-full max-w-[880px] px-0">
                      {/* Watermark only when empty conversation */}
                      {!hasMessages && (
                        <div
                          data-component="new-session-wordmark"
                          aria-hidden="true"
                          className="pointer-events-none mx-auto w-full max-w-[720px] text-v2-background-bg-inverse select-none"
                        >
                          <div
                            data-slot="wordmark-box"
                            className="relative mx-auto aspect-[234/42] w-4/5 flex items-center justify-center"
                          >
                            <svg
                              viewBox="0 0 234 42"
                              fill="none"
                              className="block size-full overflow-visible pointer-events-none select-none"
                            >
                              <text
                                x="117"
                                y="29"
                                textAnchor="middle"
                                fill="var(--icon-weak-base, currentColor)"
                                className="opacity-[0.18]"
                                style={{
                                  fontFamily:
                                    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif",
                                  fontSize: "28px",
                                  fontWeight: 800,
                                  letterSpacing: "0.32em",
                                }}
                              >
                                SIRONA
                              </text>
                            </svg>
                          </div>
                        </div>
                      )}

                      {/* Composer Container */}
                      <div className={`${!hasMessages ? "mt-8" : ""} flex flex-col gap-3`}>
                        <div data-slot="new-session-composer" className="flex flex-col gap-1">
                          <div className="relative z-10">
                            <form
                              data-component="composer"
                              onSubmit={handleSubmit}
                              className="group/composer relative w-full overflow-clip rounded-xl bg-v2-background-bg-base shadow-[var(--v2-elevation-raised)] border border-v2-border-border-base focus-within:border-v2-border-border-strong transition-colors"
                            >
                              <div data-slot="composer-content" className="min-h-0">
                                <div data-component="composer-scroll" className="relative overflow-y-auto max-h-[180px]">
                                  <textarea
                                    ref={textareaRef}
                                    rows={1}
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask anything, / for commands, @ for context…"
                                    className="block w-full resize-none whitespace-pre-wrap bg-transparent ps-4 pe-4 pt-3.5 pb-2 text-[13px] font-[440] leading-5 text-v2-text-text-base placeholder:text-v2-text-text-faint focus:outline-none"
                                    style={{ minHeight: "44px" }}
                                  />
                                </div>
                              </div>

                              {/* Controls Bar */}
                              <div className="flex h-11 shrink-0 items-center px-2">
                                <div className="flex shrink-0 items-center">
                                  <button
                                    type="button"
                                    aria-label="Add images and files"
                                    className="p-1.5 rounded hover:bg-v2-overlay-simple-overlay-hover text-v2-text-text-faint hover:text-v2-text-text-base cursor-pointer"
                                  >
                                    <PlusIcon size={16} />
                                  </button>
                                </div>

                                <div data-slot="composer-controls" className="ms-1 me-3 h-full min-w-0 flex-1 flex items-center">
                                  <button
                                    type="button"
                                    onClick={onOpenModelPicker}
                                    className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-v2-overlay-simple-overlay-hover text-v2-text-text-base text-[13px] font-[440] cursor-pointer"
                                    style={{ height: "28px" }}
                                  >
                                    <span className="min-w-0 truncate">{selectedModel}</span>
                                    <ChevronDownIcon size={14} className="text-v2-text-text-faint -ml-0.5" />
                                  </button>
                                </div>

                                <div data-slot="composer-actions" className="flex shrink-0 items-center">
                                  <button
                                    type="submit"
                                    disabled={!prompt.trim() || isSending}
                                    aria-label="Send"
                                    className={`size-7 rounded-md p-[6px] flex items-center justify-center transition-colors cursor-pointer ${
                                      prompt.trim() && !isSending
                                        ? "bg-v2-background-bg-inverse text-v2-text-text-inverse hover:opacity-90"
                                        : "bg-v2-overlay-simple-overlay-disabled text-v2-text-text-faint cursor-not-allowed opacity-50"
                                    }`}
                                  >
                                    <ArrowUpIcon size={16} />
                                  </button>
                                </div>
                              </div>
                            </form>
                          </div>
                        </div>

                        {/* Breadcrumb Information Bar */}
                        <div className="relative flex min-h-9 min-w-0 items-center gap-3 ps-2 pe-1.5 text-[13px] font-[440] tracking-[-0.04px]">
                          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-1 gap-y-1 py-1.5">
                            {/* Project Badge */}
                            <button
                              type="button"
                              className="flex h-7 items-center gap-1.5 rounded-sm text-start ps-1.5 pe-2 text-v2-text-text-muted hover:bg-v2-overlay-simple-overlay-hover hover:text-v2-text-text-base cursor-pointer"
                            >
                              <div className="size-4 rounded-sm bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[10px] font-bold text-neutral-600 dark:text-neutral-300 uppercase shrink-0">
                                {projectName.charAt(0)}
                              </div>
                              <span className="min-w-0 truncate">{projectName}</span>
                            </button>

                            <span className="text-v2-text-text-faint" aria-hidden="true">
                              /
                            </span>

                            {/* Worktree */}
                            <button
                              type="button"
                              className="flex h-7 items-center gap-1.5 rounded-sm text-start ps-1.5 pe-2 text-v2-text-text-muted hover:bg-v2-overlay-simple-overlay-hover hover:text-v2-text-text-base cursor-pointer"
                            >
                              <MonitorIcon size={14} className="text-v2-icon-icon-muted shrink-0" />
                              <span className="min-w-0 truncate">Local</span>
                              <span
                                data-slot="workspace-onboarding-dot"
                                aria-hidden="true"
                                className="size-1.5 shrink-0 rounded-full bg-v2-text-text-accent"
                              />
                            </button>

                            {/* Branch */}
                            <div className="flex h-7 min-w-0 items-center gap-1.5 ps-1.5 pe-2 text-v2-text-text-faint">
                              <BranchIcon size={14} className="text-v2-icon-icon-muted shrink-0" />
                              <span className="min-w-0 truncate">{branchName}</span>
                            </div>
                          </div>

                          {/* File Path */}
                          <div className="flex min-w-0 flex-1 justify-end pe-1.5">
                            <span className="min-w-0 truncate text-v2-text-text-faint text-end select-text">
                              <bdi dir="ltr">{workspacePath}</bdi>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
