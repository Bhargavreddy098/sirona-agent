import { lazy, Suspense, useCallback, useState } from 'react';
import {
  FolderTree,
  Terminal as TerminalIcon,
  Compass,
  Activity,
  ShieldCheck,
  X,
  Layers,
} from 'lucide-react';
import type { Project } from '../../api/schemas';
import { Runs } from './Runs';
import { Planning } from './Planning';
import { Files } from './Files';
import { Approvals } from './Approvals';
import { Workers } from './Workers';
import { Readiness } from './Readiness';

const TerminalPanel = lazy(() =>
  import('./Terminal').then(module => ({ default: module.TerminalPanel }))
);

export type CompanionTab = 'files' | 'terminal' | 'planning' | 'runs' | 'approvals' | 'workers';

export interface WorkspaceCompanionProps {
  projects: Project[];
  activeProjectId?: string;
  onSelectProject?: (id: string) => void;
  activeTab: CompanionTab;
  onChangeTab: (tab: CompanionTab) => void;
  onClose: () => void;
  onBusy?: (busy: boolean) => void;
  connected: boolean;
}

const TABS: { id: CompanionTab; label: string; icon: typeof FolderTree }[] = [
  { id: 'files', label: 'Files', icon: FolderTree },
  { id: 'terminal', label: 'Terminal', icon: TerminalIcon },
  { id: 'planning', label: 'Plan', icon: Compass },
  { id: 'runs', label: 'Runs', icon: Activity },
  { id: 'approvals', label: 'Approvals', icon: ShieldCheck },
  { id: 'workers', label: 'Workers', icon: Layers },
];

export function WorkspaceCompanion({
  projects,
  activeProjectId,
  onSelectProject,
  activeTab,
  onChangeTab,
  onClose,
  onBusy = () => {},
  connected,
}: WorkspaceCompanionProps) {
  const [busy, setBusy] = useState(false);
  const [preparedRun, setPreparedRun] = useState<string>();

  const working = useCallback(
    (value: boolean) => {
      setBusy(value);
      onBusy(value);
    },
    [onBusy]
  );

  const project = projects.find(item => item.id === activeProjectId);

  return (
    <aside
      className="workspace-companion flex flex-col shrink-0 w-full lg:w-[460px] xl:w-[520px] h-full bg-[var(--bg-canvas)] border-l border-[var(--border-default)] z-10 select-none antialiased"
      aria-label="Workspace companion panel"
    >
      {/* Header with Project Badge, Tab Switcher, and Close Button */}
      <div className="companion-header flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--border-default)] bg-[var(--bg-surface-subtle)]">
        <div className="flex items-center gap-2 min-w-0">
          {projects.length > 1 && onSelectProject ? (
            <select
              className="text-xs font-semibold px-2 py-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--fg-primary)] max-w-[150px] truncate cursor-pointer shadow-xs"
              value={project?.id ?? ''}
              disabled={busy}
              onChange={e => {
                setPreparedRun(undefined);
                onSelectProject(e.target.value);
              }}
            >
              <option value="">Select project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs font-semibold text-[var(--fg-primary)] truncate max-w-[180px] tracking-tight">
              {project ? project.name : 'Workspace Tools'}
            </span>
          )}
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)] transition-all cursor-pointer"
          aria-label="Close companion panel"
          title="Close panel"
          onClick={onClose}
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

      {/* Navigation Tabs */}
      <nav
        className="companion-nav flex items-center gap-1 px-3 py-1.5 border-b border-[var(--border-default)] bg-[var(--bg-canvas)] overflow-x-auto [scrollbar-width:none]"
        aria-label="Companion sections"
      >
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                isActive
                  ? 'bg-[var(--accent-subtle)] text-[var(--accent-text)] font-semibold'
                  : 'text-[var(--fg-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)]'
              }`}
              aria-current={isActive ? 'page' : undefined}
              disabled={busy}
              onClick={() => onChangeTab(tab.id)}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Content Area */}
      <div className="companion-body flex-1 overflow-y-auto p-4 min-h-0 bg-white">
        {!connected ? (
          <div className="py-8 px-4 text-center text-[#9aa0ac]">
            <p className="text-sm font-medium text-[#16181d] mb-1">
              Desktop connection required
            </p>
            <p className="text-xs">
              Connect through the desktop app to interact with workspace tools.
            </p>
          </div>
        ) : !projects.length ? (
          <div className="py-8 px-4 text-center text-[#9aa0ac]">
            <p className="text-sm font-medium text-[#16181d] mb-1">
              No project attached
            </p>
            <p className="text-xs">
              Attach a folder in the chat composer to enable project tools.
            </p>
          </div>
        ) : !project ? (
          <div className="py-8 px-4 text-center text-[#9aa0ac]">
            <p className="text-sm font-medium text-[#16181d] mb-1">
              Choose a project
            </p>
            <p className="text-xs">
              Select an attached project to explore its files, plans, and terminal.
            </p>
          </div>
        ) : (
          <div key={`${project.id}:${activeTab}`} className="h-full flex flex-col">
            <div className="mb-3">
              <Readiness key={project.id} projectId={project.id} />
            </div>

            <div className="flex-1 min-h-0">
              {activeTab === 'files' ? (
                <Files projectId={project.id} />
              ) : activeTab === 'terminal' ? (
                <Suspense
                  fallback={
                    <p className="text-xs text-[#9aa0ac] py-4" role="status">
                      Loading terminal controls…
                    </p>
                  }
                >
                  <TerminalPanel projectId={project.id} onBusy={working} />
                </Suspense>
              ) : activeTab === 'planning' ? (
                <Planning
                  projectId={project.id}
                  onPrepared={id => {
                    setPreparedRun(id);
                    onChangeTab('runs');
                  }}
                />
              ) : activeTab === 'runs' ? (
                <Runs
                  projectId={project.id}
                  initialRunId={preparedRun}
                  onBusy={working}
                />
              ) : activeTab === 'approvals' ? (
                <Approvals projectId={project.id} />
              ) : (
                <Workers projectId={project.id} onBusy={working} />
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
export default WorkspaceCompanion;
