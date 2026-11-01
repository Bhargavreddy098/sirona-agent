import { SideIcon, FolderIcon, TermIcon } from '../ui/Icons';
import type { AppPage } from './Sidebar';

export interface HeaderProps {
  page: AppPage;
  sidebarVisible: boolean;
  attachedProjectName?: string;
  terminalOpen?: boolean;
  apiMapActive?: boolean;
  onExpandSidebar: () => void;
  onOpenFolder: () => void;
  onToggleTerminal: () => void;
  onToggleApiMap: () => void;
}

const PAGE_TITLES: Record<AppPage, string> = {
  chat: 'Chat',
  files: 'Chat',
  inbox: 'Inbox',
  automations: 'Automations',
  settings: 'Settings',
};

export function Header({
  page,
  sidebarVisible,
  attachedProjectName,
  terminalOpen = false,
  apiMapActive = false,
  onExpandSidebar,
  onOpenFolder,
  onToggleTerminal,
  onToggleApiMap,
}: HeaderProps) {
  return (
    <header className="hd">
      {!sidebarVisible && (
        <button
          className="ib"
          id="exp"
          title="Open sidebar"
          aria-label="Open sidebar"
          onClick={onExpandSidebar}
        >
          <SideIcon size={18} />
        </button>
      )}

      <h1 id="ttl">{PAGE_TITLES[page] || 'Chat'}</h1>

      {page === 'chat' && (
        <button
          className={`fc ${attachedProjectName ? 'on' : ''}`}
          id="fcb"
          data-act="att"
          data-r="native picker → folder binding (NEW)"
          onClick={onOpenFolder}
          title={attachedProjectName ? `Project folder: ${attachedProjectName}` : 'Attach a local project folder'}
        >
          <FolderIcon size={14} />
          <span id="ft">{attachedProjectName || 'Open folder'}</span>
        </button>
      )}

      {page === 'chat' && (
        <button
          className={`ib ${terminalOpen ? 'on' : ''}`}
          id="dkb"
          title="Terminal (Ctrl+`)"
          aria-label="Toggle terminal"
          onClick={onToggleTerminal}
        >
          <TermIcon size={18} />
        </button>
      )}

      <button
        className={`bt sm ${apiMapActive ? 'p' : ''}`}
        id="mapb"
        title="Show which route feeds each element"
        onClick={onToggleApiMap}
      >
        API map
      </button>
    </header>
  );
}
