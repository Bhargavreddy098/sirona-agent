import {
  PanelLeftOpen,
  PanelRightOpen,
  PanelRightClose,
  MoreHorizontal,
  Trash2,
  Sun,
  Moon,
  FolderGit2,
} from 'lucide-react';

export interface HeaderProps {
  page: 'chat' | 'settings' | 'workspace' | 'automation' | 'memory';
  sidebarVisible: boolean;
  activeTitle?: string;
  locked: boolean;
  onExpandSidebar: () => void;
  onOpenActions: () => void;
  onDeleteChat?: () => void;
  companionOpen?: boolean;
  onToggleCompanion?: () => void;
  attachedProjectName?: string;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export function Header({
  page,
  sidebarVisible,
  activeTitle,
  locked,
  onExpandSidebar,
  onOpenActions,
  onDeleteChat,
  companionOpen = false,
  onToggleCompanion,
  attachedProjectName,
  theme = 'light',
  onToggleTheme,
}: HeaderProps) {
  const sectionName =
    page === 'settings' ? 'Settings' : page === 'workspace' ? 'Workspace' : 'Chat';
  const detailName =
    page === 'chat'
      ? activeTitle ?? 'New conversation'
      : page === 'settings'
      ? 'Model providers'
      : 'Project workspace';

  return (
    <header className="workspace-header flex items-center gap-3 px-5 h-[52px] min-h-[52px] border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-[13.5px] text-zinc-800 dark:text-zinc-200 select-none transition-colors duration-150">
      {!sidebarVisible && (
        <button
          className="icon-button inline-flex items-center justify-center w-8 h-8 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer"
          aria-label="Expand sidebar"
          title="Expand sidebar"
          onClick={onExpandSidebar}
        >
          <PanelLeftOpen className="w-[18px] h-[18px]" strokeWidth={2} />
        </button>
      )}

      <span className="text-zinc-500 dark:text-zinc-400 font-medium text-[13px]">{sectionName}</span>
      <span className="breadcrumb-slash text-zinc-300 dark:text-zinc-700 text-xs">/</span>
      <strong className="text-zinc-900 dark:text-zinc-100 font-semibold truncate max-w-[280px] text-[13.5px] tracking-tight">
        {detailName}
      </strong>

      {attachedProjectName && (
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-750">
          <FolderGit2 className="w-3 h-3 text-blue-600 dark:text-blue-400" strokeWidth={2} />
          <span>{attachedProjectName}</span>
        </span>
      )}

      <div className="header-chat-actions ml-auto flex items-center gap-1.5">
        {onToggleTheme && (
          <button
            type="button"
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={onToggleTheme}
          >
            {theme === 'dark' ? (
              <Sun className="w-[17px] h-[17px]" strokeWidth={2} />
            ) : (
              <Moon className="w-[17px] h-[17px]" strokeWidth={2} />
            )}
          </button>
        )}

        {page === 'chat' && onToggleCompanion && (
          <button
            type="button"
            className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-all cursor-pointer ${
              companionOpen
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
            aria-label={companionOpen ? 'Close workspace companion' : 'Open workspace companion'}
            title={companionOpen ? 'Close workspace companion' : 'Open workspace companion'}
            onClick={onToggleCompanion}
          >
            {companionOpen ? (
              <PanelRightClose className="w-[18px] h-[18px]" strokeWidth={2} />
            ) : (
              <PanelRightOpen className="w-[18px] h-[18px]" strokeWidth={2} />
            )}
          </button>
        )}

        {page === 'chat' && (
          <>
            <button
              className="icon-button inline-flex items-center justify-center w-8 h-8 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Conversation actions"
              title="Conversation actions"
              disabled={locked}
              onClick={onOpenActions}
            >
              <MoreHorizontal className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
            {onDeleteChat && (
              <button
                className="icon-button inline-flex items-center justify-center w-8 h-8 rounded-md text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Delete this conversation"
                title="Delete this conversation"
                disabled={locked}
                onClick={onDeleteChat}
              >
                <Trash2 className="w-[17px] h-[17px]" strokeWidth={2} />
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
}
