import { lazy, Suspense } from 'react';
import { Terminal as TerminalIcon, X, Maximize2, Minimize2 } from 'lucide-react';

const TerminalPanel = lazy(() =>
  import('../workspace/Terminal').then(module => ({ default: module.TerminalPanel }))
);

export interface BottomTerminalDeckProps {
  projectId?: string;
  isOpen: boolean;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  onClose: () => void;
  onBusy?: (busy: boolean) => void;
}

export function BottomTerminalDeck({
  projectId,
  isOpen,
  isMaximized,
  onToggleMaximize,
  onClose,
  onBusy = () => {},
}: BottomTerminalDeckProps) {
  if (!isOpen) return null;

  return (
    <section
      className={`bottom-terminal-deck flex flex-col shrink-0 border-t border-[var(--border-default)] bg-[var(--bg-canvas)] z-20 select-none transition-all duration-150 ${
        isMaximized ? 'h-[65vh]' : 'h-64 sm:h-72'
      }`}
      aria-label="Integrated workspace terminal"
    >
      {/* Terminal Deck Header */}
      <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-[var(--border-default)] bg-[var(--bg-surface-subtle)] text-xs">
        <div className="flex items-center gap-2">
          <TerminalIcon size={14} className="text-[var(--accent-primary)]" />
          <span className="font-semibold text-[var(--fg-primary)] tracking-tight">
            Terminal
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
            Docker WSL2 Container
          </span>
          <span className="hidden sm:inline text-[11px] text-zinc-400">
            (toggle with <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800">Ctrl+`</kbd>)
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleMaximize}
            className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title={isMaximized ? 'Restore height' : 'Maximize terminal'}
            aria-label={isMaximized ? 'Restore height' : 'Maximize terminal'}
          >
            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close terminal"
            aria-label="Close terminal"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Terminal Screen Container */}
      <div className="flex-1 min-h-0 relative bg-black">
        {!projectId ? (
          <div className="p-8 text-center text-zinc-400 text-xs">
            Open or attach a project folder to connect the sandboxed terminal.
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full text-zinc-400 text-xs">
                <span>Initializing sandboxed PTY session…</span>
              </div>
            }
          >
            <TerminalPanel projectId={projectId} onBusy={onBusy} />
          </Suspense>
        )}
      </div>
    </section>
  );
}
