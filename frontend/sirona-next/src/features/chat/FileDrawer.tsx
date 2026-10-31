import { useEffect, useState } from 'react';
import { XIcon, FileIcon, FolderIcon } from '../../components/ui/Icons';
import { workspaceApi } from '../../api/workspace';
import { projectsApi, type artifactSchema, type snapshotSchema } from '../../api/projects';
import { useEditorStore, detectLanguage } from '../editor/editorState';
import type { z } from 'zod';

type Artifact = z.infer<typeof artifactSchema>;
type Snapshot = z.infer<typeof snapshotSchema>;

export interface FileDrawerProps {
  isOpen: boolean;
  projectId?: string;
  onClose: () => void;
}

interface DisplayNode {
  path: string;
  name: string;
  isDir: boolean;
  indent: number;
  changed?: boolean;
}

export function FileDrawer({ isOpen, projectId, onClose }: FileDrawerProps) {
  const [tab, setTab] = useState<'files' | 'artifacts' | 'snapshots'>('files');
  const [nodes, setNodes] = useState<DisplayNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileContent, setFileContent] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [changedCount, setChangedCount] = useState(0);
  const [currentRootRef, setCurrentRootRef] = useState<string>('');

  // Artifacts & Snapshots state
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedArtifactContent, setSelectedArtifactContent] = useState<string>('');

  // Load project files when drawer opens
  useEffect(() => {
    if (!isOpen || !projectId) {
      if (!projectId) {
        setNodes([
          { path: 'src', name: 'src', isDir: true, indent: 0 },
          { path: 'src/auth.ts', name: 'auth.ts', isDir: false, indent: 1, changed: true },
          { path: 'src/tax.ts', name: 'tax.ts', isDir: false, indent: 1 },
          { path: 'tests', name: 'tests', isDir: true, indent: 0 },
          { path: 'tests/auth.test.ts', name: 'auth.test.ts', isDir: false, indent: 1 },
          { path: 'package.json', name: 'package.json', isDir: false, indent: 0 },
        ]);
        setChangedCount(1);
        setSelectedFile('src/auth.ts');
        setFileContent([
          "import { decode } from './jwt';",
          '',
          'export function verify(token: string) {',
          '  const p = decode(token);',
          '  if (p.exp * 1000 < Date.now()) return null;',
          '  return p;',
          '}',
        ]);
      }
      return;
    }

    let active = true;
    setLoading(true);

    const fetchFiles = async () => {
      try {
        const readiness = await workspaceApi.readiness(projectId);
        if (!active) return;
        const root = readiness.files.roots[0];
        if (!root) {
          setNodes([]);
          return;
        }
        setCurrentRootRef(root.id);
        const res = await workspaceApi.files(projectId, root.id, 0);
        if (!active) return;
        const entries = res.files || [];
        const display: DisplayNode[] = entries.map(e => ({
          path: e.path,
          name: e.path.split(/[\\/]/).pop() || e.path,
          isDir: e.path.endsWith('/') || !e.path.includes('.'),
          indent: Math.max(0, e.path.split(/[\\/]/).length - 1),
          changed: false,
        }));
        setNodes(display);
        if (display.length > 0 && !selectedFile) {
          const firstFile = display.find(n => !n.isDir) || display[0];
          setSelectedFile(firstFile.path);
          void loadContent(root.id, firstFile.path);
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchFiles();
    return () => {
      active = false;
    };
  }, [isOpen, projectId]);

  // Load Artifacts and Snapshots when tab changes
  useEffect(() => {
    if (!isOpen || !projectId) return;
    if (tab === 'artifacts') {
      void projectsApi.artifacts(projectId).then(res => setArtifacts(res.artifacts || [])).catch(() => {});
    } else if (tab === 'snapshots') {
      void projectsApi.snapshots(projectId).then(res => setSnapshots(res.snapshots || [])).catch(() => {});
    }
  }, [isOpen, projectId, tab]);

  const loadContent = async (rootRef: string, filePath: string) => {
    setSelectedFile(filePath);
    if (!projectId || !rootRef) {
      return;
    }
    try {
      const res = await workspaceApi.file(projectId, rootRef, filePath);
      const content = res.content || '';
      const lines = content.split('\n');
      setFileContent(lines);
      useEditorStore.getState().openFile({
        path: filePath,
        name: filePath.split('/').pop() || filePath,
        content,
        rootRef,
        projectId,
        language: detectLanguage(filePath),
        isReadOnly: true,
      });
    } catch {
      setFileContent(['// File content preview unavailable']);
    }
  };

  const handleCreateSnapshot = async () => {
    if (!projectId) return;
    try {
      await projectsApi.createSnapshot(projectId, `Checkpoint ${new Date().toLocaleTimeString()}`);
      const res = await projectsApi.snapshots(projectId);
      setSnapshots(res.snapshots || []);
    } catch {
      // Handled
    }
  };

  const handleSelectArtifact = async (id: string) => {
    try {
      const res = await projectsApi.artifactContent(id);
      setSelectedArtifactContent(res.content || '');
    } catch {
      setSelectedArtifactContent('Artifact content preview unavailable');
    }
  };

  return (
    <aside className={`fp ${isOpen ? 'open' : ''}`} id="fp" aria-label="Project files">
      <div className="fpi">
        {/* Drawer Header */}
        <div className="fh">
          <b>Workspace</b>
          {changedCount > 0 && tab === 'files' && (
            <span className="rk n y" id="chg">
              {changedCount} changed
            </span>
          )}
          <button
            className="ib"
            data-act="fp"
            aria-label="Close files"
            onClick={onClose}
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Sub-tabs for Files / Artifacts / Snapshots */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--b1)] bg-[var(--s3)] text-xs">
          <button
            className={`px-2.5 py-1 rounded-md transition-all ${tab === 'files' ? 'bg-[var(--canvas)] font-semibold shadow-xs' : 'text-[var(--t2)]'}`}
            onClick={() => setTab('files')}
          >
            Files
          </button>
          <button
            className={`px-2.5 py-1 rounded-md transition-all ${tab === 'artifacts' ? 'bg-[var(--canvas)] font-semibold shadow-xs' : 'text-[var(--t2)]'}`}
            onClick={() => setTab('artifacts')}
          >
            Artifacts
          </button>
          <button
            className={`px-2.5 py-1 rounded-md transition-all ${tab === 'snapshots' ? 'bg-[var(--canvas)] font-semibold shadow-xs' : 'text-[var(--t2)]'}`}
            onClick={() => setTab('snapshots')}
          >
            Snapshots
          </button>
        </div>

        {/* Tab 1: Files Tree & Viewer */}
        {tab === 'files' && (
          <>
            <div className="tree" id="tree" data-r="GET /workspace/files">
              {loading ? (
                <div className="p-3 text-xs text-[var(--t3)]">Scanning folder…</div>
              ) : nodes.length === 0 ? (
                <div className="p-3 text-xs text-[var(--t3)]">No files in current project</div>
              ) : (
                nodes.map((n, i) => (
                  <button
                    key={n.path}
                    className={`tn ${n.indent > 0 ? 'in' : ''} ${selectedFile === n.path ? 'on' : ''}`}
                    style={{ animationDelay: `${i * 30}ms` }}
                    onClick={() => {
                      if (!n.isDir) {
                        void loadContent(currentRootRef, n.path);
                      }
                    }}
                  >
                    {n.isDir ? <FolderIcon size={14} /> : <FileIcon size={14} />}
                    <span>{n.name}</span>
                    {n.changed && <i />}
                  </button>
                ))
              )}
            </div>

            <div className="vw" id="vw">
              {fileContent.length === 0 ? (
                <div className="p-3 text-xs text-[var(--t3)]">Select a file to inspect</div>
              ) : (
                fileContent.map((line, idx) => {
                  const isChanged = selectedFile === 'src/auth.ts' && idx === 4;
                  return (
                    <div key={idx} className={isChanged ? 'ch' : ''}>
                      <small>{idx + 1}</small>
                      {line}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Tab 2: Artifacts List & Content Viewer */}
        {tab === 'artifacts' && (
          <div className="flex-1 flex flex-col min-h-0" data-r="GET /projects/:id/artifacts · GET /artifacts/:id/content">
            <div className="tree" style={{ maxHeight: '45%' }}>
              {artifacts.length === 0 ? (
                <div className="p-3 text-xs text-[var(--t3)]">No artifacts generated yet.</div>
              ) : (
                artifacts.map(a => (
                  <button
                    key={a.id}
                    className="tn"
                    onClick={() => void handleSelectArtifact(a.id)}
                  >
                    <FileIcon size={14} />
                    <span>{a.name}</span>
                    <span className="mut mono ml-auto" style={{ fontSize: '10px' }}>{a.kind || 'artifact'}</span>
                  </button>
                ))
              )}
            </div>
            <div className="vw">
              <pre className="p-3 text-xs font-mono whitespace-pre-wrap">
                {selectedArtifactContent || '// Select an artifact to preview its content'}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 3: Snapshots List */}
        {tab === 'snapshots' && (
          <div className="flex-1 p-3 overflow-auto" data-r="GET /projects/:id/snapshots · POST /projects/:id/snapshots">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-semibold">Repository Snapshots</span>
              <button className="bt sm" onClick={() => void handleCreateSnapshot()}>
                New snapshot
              </button>
            </div>
            {snapshots.length === 0 ? (
              <div className="text-xs text-[var(--t3)]">No snapshot checkpoints recorded.</div>
            ) : (
              snapshots.map(s => (
                <div key={s.id} className="li mb-2 text-xs">
                  <div>
                    <b className="mono">{s.id.slice(0, 8)}…</b>
                    <div className="mut">{new Date(s.created_at).toLocaleString()}</div>
                  </div>
                  <span className="rk g n">{s.status}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
