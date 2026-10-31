import { create } from 'zustand';

export interface OpenFileTab {
  path: string;
  name: string;
  content: string;
  rootRef?: string;
  projectId?: string;
  language: string;
  isReadOnly: boolean;
}

export interface DiffFileEntry {
  path: string;
  kind: 'add' | 'modify' | 'delete';
  original: string;
  modified: string;
  oldSha256?: string;
  newSha256?: string;
}

export interface ActiveDiffReview {
  artifactId: string;
  projectId: string;
  rootRef: string;
  runId: string;
  taskId: string;
  approvalId: string;
  patchDigest: string;
  baseDigest: string;
  files: DiffFileEntry[];
  summary?: string;
  nonce?: string;
}

export interface EditorState {
  // File Tabs & Code Viewer
  openTabs: OpenFileTab[];
  activeTabPath: string | null;
  isEditorVisible: boolean;
  openFile: (tab: OpenFileTab) => void;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  closeEditor: () => void;
  toggleEditorVisibility: () => void;
  setEditorVisible: (visible: boolean) => void;

  // Diff Review
  activeDiff: ActiveDiffReview | null;
  selectedDiffFilePath: string | null;
  isDiffOpen: boolean;
  openDiff: (diff: ActiveDiffReview) => void;
  setSelectedDiffFile: (path: string) => void;
  closeDiff: () => void;
}

export function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'jsx':
      return 'javascript';
    case 'json':
      return 'json';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    case 'md':
      return 'markdown';
    case 'py':
      return 'python';
    case 'sql':
      return 'sql';
    case 'sh':
    case 'bash':
      return 'shell';
    case 'yml':
    case 'yaml':
      return 'yaml';
    case 'xml':
    case 'svg':
      return 'xml';
    case 'rs':
      return 'rust';
    case 'go':
      return 'go';
    case 'c':
    case 'h':
      return 'c';
    case 'cpp':
    case 'hpp':
      return 'cpp';
    default:
      return 'plaintext';
  }
}

export const useEditorStore = create<EditorState>((set, get) => ({
  openTabs: [],
  activeTabPath: null,
  isEditorVisible: false,

  openFile: (tab) => {
    const existing = get().openTabs.find((t) => t.path === tab.path);
    if (!existing) {
      set((state) => ({
        openTabs: [...state.openTabs, tab],
        activeTabPath: tab.path,
        isEditorVisible: true,
      }));
    } else {
      set({
        activeTabPath: tab.path,
        isEditorVisible: true,
      });
    }
  },

  closeTab: (path) => {
    set((state) => {
      const remaining = state.openTabs.filter((t) => t.path !== path);
      let nextActive = state.activeTabPath;
      if (state.activeTabPath === path) {
        nextActive = remaining.length > 0 ? remaining[remaining.length - 1].path : null;
      }
      return {
        openTabs: remaining,
        activeTabPath: nextActive,
        isEditorVisible: remaining.length > 0,
      };
    });
  },

  setActiveTab: (path) => {
    set({ activeTabPath: path, isEditorVisible: true });
  },

  closeEditor: () => {
    set({ isEditorVisible: false });
  },

  toggleEditorVisibility: () => {
    set((state) => ({ isEditorVisible: !state.isEditorVisible }));
  },

  setEditorVisible: (visible) => {
    set({ isEditorVisible: visible });
  },

  activeDiff: null,
  selectedDiffFilePath: null,
  isDiffOpen: false,

  openDiff: (diff) => {
    const initialFile = diff.files[0]?.path || null;
    set({
      activeDiff: diff,
      selectedDiffFilePath: initialFile,
      isDiffOpen: true,
    });
  },

  setSelectedDiffFile: (path) => {
    set({ selectedDiffFilePath: path });
  },

  closeDiff: () => {
    set({
      activeDiff: null,
      selectedDiffFilePath: null,
      isDiffOpen: false,
    });
  },
}));

if (typeof window !== 'undefined') {
  (window as unknown as { __editorStore?: typeof useEditorStore }).__editorStore = useEditorStore;
}
