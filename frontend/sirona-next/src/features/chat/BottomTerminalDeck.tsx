import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { XIcon } from '../../components/ui/Icons';

const TerminalPanel = lazy(() =>
  import('../workspace/Terminal').then(module => ({ default: module.TerminalPanel }))
);

export interface LogEntry {
  id: string;
  text: string;
  type?: 'ok' | 'er' | 'mut' | '';
  time?: string;
}

export interface BottomTerminalDeckProps {
  projectId?: string;
  isOpen: boolean;
  logs?: LogEntry[];
  onClose: () => void;
  onBusy?: (busy: boolean) => void;
}

export function BottomTerminalDeck({
  projectId,
  isOpen,
  logs = [],
  onClose,
  onBusy = () => {},
}: BottomTerminalDeckProps) {
  const [tab, setTab] = useState<'lg' | 'tm'>('lg');
  const [height, setHeight] = useState(240);
  const [isDragging, setIsDragging] = useState(false);
  const deckRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Handle drag resizing
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const windowHeight = window.innerHeight;
    const newHeight = Math.max(120, Math.min(windowHeight * 0.7, windowHeight - e.clientY));
    setHeight(newHeight);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div
      ref={deckRef}
      className={`dk ${isOpen ? 'open' : ''} ${isDragging ? 'drag' : ''}`}
      id="dk"
      style={{ height: isOpen ? `${height}px` : '0px' }}
      aria-label="Integrated workspace dock"
    >
      {/* Resizable top handle */}
      <div
        className="rz"
        id="rz"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        title="Drag to resize dock"
      />

      {/* Dock header tab bar */}
      <div className="dkt">
        <button
          className={`chip ${tab === 'lg' ? 'sel' : ''}`}
          data-dt="lg"
          onClick={() => setTab('lg')}
        >
          Agent log
        </button>
        <button
          className={`chip ${tab === 'tm' ? 'sel' : ''}`}
          data-dt="tm"
          onClick={() => setTab('tm')}
        >
          Terminal
        </button>
        <span className="sp" />
        <button
          className="ib"
          data-act="dk"
          aria-label="Close dock"
          onClick={onClose}
        >
          <XIcon size={16} />
        </button>
      </div>

      {/* Agent log tab */}
      {tab === 'lg' && (
        <div className="lg" id="lg" ref={logRef} data-r="GET /runs/:id/events (SSE) · read-only">
          {logs.length === 0 ? (
            <div className="mut">No recent run events. Run logs stream here during active turns.</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className={log.type || ''}>
                {log.text}
              </div>
            ))
          )}
        </div>
      )}

      {/* Terminal tab */}
      {tab === 'tm' && (
        <div id="tm" style={{ flex: 1, display: 'flex', flexDirection: 'column' }} data-r="terminal ticket + WS (Docker WSL2)">
          {!projectId ? (
            <div className="lg" id="tl">
              <div className="mut">
                Sandbox status comes from GET /isolation/qualifications. Attach a folder to open a live terminal.
              </div>
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="lg">
                  <div className="mut">Connecting to Docker WSL2 container…</div>
                </div>
              }
            >
              <TerminalPanel projectId={projectId} onBusy={onBusy} />
            </Suspense>
          )}
        </div>
      )}
    </div>
  );
}
