import React from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore } from './editorState';
import { XIcon, FileIcon } from '../../components/ui/Icons';
import { Eye, FileCode } from 'lucide-react';

loader.config({ monaco });

export function CodeEditor() {
  const {
    openTabs,
    activeTabPath,
    isEditorVisible,
    closeTab,
    setActiveTab,
    setEditorVisible,
  } = useEditorStore(
    useShallow((state) => ({
      openTabs: state.openTabs,
      activeTabPath: state.activeTabPath,
      isEditorVisible: state.isEditorVisible,
      closeTab: state.closeTab,
      setActiveTab: state.setActiveTab,
      setEditorVisible: state.setEditorVisible,
    }))
  );

  if (!isEditorVisible) return null;

  const activeTab = openTabs.find((t) => t.path === activeTabPath);

  return (
    <div
      className="flex flex-col h-full bg-[var(--bg-app)] border-l border-[var(--border-subtle)] text-[var(--fg-primary)] overflow-hidden transition-all duration-200 select-none"
      style={{ minWidth: '340px' }}
    >
      {/* Tab bar header */}
      <div className="flex items-center justify-between bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] px-2 pt-1 h-10 select-none">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[calc(100%-80px)]">
          {openTabs.map((tab) => {
            const isActive = tab.path === activeTabPath;
            return (
              <div
                key={tab.path}
                onClick={() => setActiveTab(tab.path)}
                className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-md cursor-pointer border-t-2 transition-all ${
                  isActive
                    ? 'bg-[var(--bg-app)] border-[var(--accent,#4f46e5)] text-[var(--fg-primary)] font-medium shadow-sm'
                    : 'border-transparent text-[var(--fg-muted)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-app)]/50'
                }`}
                title={tab.path}
              >
                <FileIcon size={14} className={isActive ? 'text-[var(--accent,#4f46e5)]' : 'text-[var(--fg-muted)]'} />
                <span className="truncate max-w-[130px] font-mono">{tab.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.path);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[var(--bg-surface-hover,#2a2a2a)] rounded text-[var(--fg-muted)] hover:text-[var(--fg-primary)] transition-opacity"
                  title="Close tab"
                >
                  <XIcon size={12} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Right header controls */}
        <div className="flex items-center gap-2 pl-2">
          {activeTab && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] uppercase font-mono rounded bg-[var(--bg-surface-hover,#222)] text-[var(--fg-muted)] border border-[var(--border-subtle)]">
              <Eye size={10} />
              Read-only
            </span>
          )}
          <button
            onClick={() => setEditorVisible(false)}
            className="p-1 text-[var(--fg-muted)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-surface-hover,#2a2a2a)] rounded transition-colors"
            title="Collapse code editor"
          >
            <XIcon size={16} />
          </button>
        </div>
      </div>

      {/* Breadcrumb path bar */}
      {activeTab && (
        <div className="flex items-center justify-between px-3 py-1 bg-[var(--bg-app)]/80 border-b border-[var(--border-subtle)]/50 text-[11px] text-[var(--fg-muted)] font-mono">
          <span className="truncate">{activeTab.path}</span>
          <span className="text-[10px] text-[var(--fg-muted)] uppercase">{activeTab.language}</span>
        </div>
      )}

      {/* Editor Content Area */}
      <div className="flex-1 w-full h-full min-h-0 relative">
        {activeTab ? (
          <Editor
            height="100%"
            language={activeTab.language}
            value={activeTab.content}
            theme="vs-dark"
            loading={
              <div className="flex items-center justify-center h-full text-xs text-[var(--fg-muted)] font-mono">
                Loading code viewer…
              </div>
            }
            options={{
              readOnly: true,
              minimap: { enabled: true, maxColumn: 80 },
              fontFamily: 'var(--font-mono), "IBM Plex Mono", Consolas, monospace',
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
              renderWhitespace: 'selection',
              padding: { top: 12, bottom: 12 },
              cursorBlinking: 'smooth',
              folding: true,
              bracketPairColorization: { enabled: true },
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-[var(--fg-muted)]">
            <FileCode size={36} className="text-[var(--fg-muted)]/40 mb-3" />
            <p className="text-sm font-medium text-[var(--fg-secondary)]">No file open</p>
            <p className="text-xs text-[var(--fg-muted)] mt-1 max-w-[240px]">
              Select a file from the explorer drawer or open a code diff review.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
