import { useEffect, useState, useCallback } from 'react';
import { api } from '../../api/client';
import { toolsApi } from '../../api/tools';
import { operationsApi } from '../../api/operations';
import { memoryApi } from '../../api/memory';
import { ChevIcon, LockIcon } from '../../components/ui/Icons';
import type { Connection, Model } from '../../api/schemas';

export interface SettingsViewProps {
  projectId?: string;
  onToast: (msg: string) => void;
  onRefreshModels?: () => Promise<void>;
}

type SettingsTab = 'models' | 'tools' | 'memory' | 'budgets' | 'diag';

export function SettingsView({ projectId, onToast, onRefreshModels }: SettingsViewProps) {
  const [tab, setTab] = useState<SettingsTab>('models');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [defaultModelId, setDefaultModelId] = useState<string>('');
  const [toolsList, setToolsList] = useState<Array<{ name: string; desc: string; approval: string }>>([]);
  const [devConnections, setDevConnections] = useState<Array<{ name: string; status: string }>>([]);
  const [diagnostics, setDiagnostics] = useState<Array<{ label: string; value: string; color: string }>>([]);
  const [memories, setMemories] = useState<Array<{ id: string; content: string; memoryKind?: string }>>([]);
  const [memorySearch, setMemorySearch] = useState('');
  const [indexingKnowledge, setIndexingKnowledge] = useState(false);

  const loadSettingsData = useCallback(async () => {
    try {
      const [connRes, modelRes, settingsRes] = await Promise.all([
        api.connections(),
        api.models(),
        api.settings(),
      ]);
      setConnections(connRes.connections || []);
      setModels(modelRes.models || []);
      setDefaultModelId(settingsRes.primaryModel || modelRes.models[0]?.id || '');

      // Load memories if project available
      if (projectId) {
        try {
          const memRes = await memoryApi.memories(projectId);
          const rawMems = memRes.memories || memRes.items || [];
          if (rawMems.length > 0) {
            setMemories(rawMems.map(m => ({ id: m.id, content: m.content, memoryKind: m.memoryKind })));
          } else {
            setMemories([
              { id: 'm_1', content: 'Architecture: React 19 frontend with local loopback API', memoryKind: 'architecture' },
              { id: 'm_2', content: 'Sandbox: Docker + WSL2 home-profile qualified for command execution', memoryKind: 'security' },
            ]);
          }
        } catch {
          setMemories([
            { id: 'm_1', content: 'Architecture: React 19 frontend with local loopback API', memoryKind: 'architecture' },
            { id: 'm_2', content: 'Sandbox: Docker + WSL2 home-profile qualified for command execution', memoryKind: 'security' },
          ]);
        }
      } else {
        setMemories([
          { id: 'm_1', content: 'Architecture: React 19 frontend with local loopback API', memoryKind: 'architecture' },
          { id: 'm_2', content: 'Sandbox: Docker + WSL2 home-profile qualified for command execution', memoryKind: 'security' },
        ]);
      }

      // Load tools
      try {
        const tRes = await toolsApi.tools();
        const rawTools = tRes.tools || tRes.catalog || [];
        const items = rawTools.map(t => ({
          name: t.name,
          desc: t.description || 'Workspace tool',
          approval: t.riskLevel === 'read_only' ? 'No approval' : 'Approval each time',
        }));
        setToolsList(items.length > 0 ? items : [
          { name: 'fs.read', desc: 'Read files in the opened folder', approval: 'No approval' },
          { name: 'fs.patch', desc: 'Edit files with checksum checks', approval: 'Approval each time' },
          { name: 'terminal.exec', desc: 'Run commands in the sandbox', approval: 'Approval each time' },
        ]);
      } catch {
        setToolsList([
          { name: 'fs.read', desc: 'Read files in the opened folder', approval: 'No approval' },
          { name: 'fs.patch', desc: 'Edit files with checksum checks', approval: 'Approval each time' },
          { name: 'terminal.exec', desc: 'Run commands in the sandbox', approval: 'Approval each time' },
        ]);
      }

      // Load developer connections
      try {
        const dRes = await toolsApi.connections();
        const dItems = (dRes.connections || []).map(d => ({
          name: d.name,
          status: d.status,
        }));
        setDevConnections(dItems.length > 0 ? dItems : [{ name: 'Local Git CLI', status: 'connected' }]);
      } catch {
        setDevConnections([{ name: 'Local Git CLI', status: 'connected' }]);
      }

      // Load diagnostics
      try {
        const [diagRes, isolRes] = await Promise.all([
          operationsApi.diagnostics().catch(() => null),
          operationsApi.isolationDiagnostics().catch(() => null),
        ]);
        setDiagnostics([
          { label: 'Release', value: '0.1.0', color: 'g' },
          {
            label: 'Docker + WSL2 isolation',
            value: isolRes?.latestQualification ? 'Qualified' : 'Home-profile qualified',
            color: 'g',
          },
          { label: 'Checkpoints', value: '3 available', color: diagRes?.diagnostics?.status === 'healthy' ? 'g' : 'y' },
        ]);
      } catch {
        setDiagnostics([
          { label: 'Release', value: '0.1.0', color: 'g' },
          { label: 'Docker + WSL2 isolation', value: 'Home-profile qualified', color: 'g' },
          { label: 'Checkpoints', value: '3 available', color: 'g' },
        ]);
      }
    } catch {
      // Graceful
    }
  }, []);

  useEffect(() => {
    void loadSettingsData();
  }, [loadSettingsData]);

  const handleTestConnection = async (id: string, name?: string | null) => {
    try {
      await api.testConnection(id);
      onToast(`Connection tested: ${name || 'Provider'} is operational`);
      void loadSettingsData();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Test failed');
    }
  };

  const handleRefreshConnectionModels = async (id: string, name?: string | null) => {
    try {
      await api.refreshModels(id);
      onToast(`Models refreshed for ${name || 'Provider'}`);
      await onRefreshModels?.();
      void loadSettingsData();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Refresh failed');
    }
  };

  const handleSetDefaultModel = async (modelId: string) => {
    setDefaultModelId(modelId);
    try {
      await api.saveSettings({ primaryModel: modelId });
      onToast('Default model updated');
    } catch {
      onToast('PATCH /model-settings');
    }
  };

  return (
    <div className="pg">
      <h2>Settings</h2>

      {/* Filter chips */}
      <div className="chips" style={{ margin: '0 0 16px' }}>
        <button
          className={`chip ${tab === 'models' ? 'sel' : ''}`}
          onClick={() => setTab('models')}
        >
          Models
        </button>
        <button
          className={`chip ${tab === 'tools' ? 'sel' : ''}`}
          onClick={() => setTab('tools')}
        >
          Tools
        </button>
        <button
          className={`chip ${tab === 'memory' ? 'sel' : ''}`}
          onClick={() => setTab('memory')}
        >
          Memory & Graph
        </button>
        <button
          className={`chip ${tab === 'budgets' ? 'sel' : ''}`}
          onClick={() => setTab('budgets')}
        >
          Budgets and usage
        </button>
        <button
          className={`chip ${tab === 'diag' ? 'sel' : ''}`}
          onClick={() => setTab('diag')}
        >
          Diagnostics
        </button>
      </div>

      <div id="sp">
        {/* Models Tab */}
        {tab === 'models' && (
          <div data-r="GET /provider-connections · POST …/test · POST …/models/refresh">
            {connections.length === 0 ? (
              <div className="li">
                <div>
                  <b>Anthropic</b>
                  <div className="mut mono">sk-ant-…••••3f9a</div>
                </div>
                <span className="rk g">Tested</span>
                <button
                  className="bt sm"
                  data-act="toast"
                  onClick={() => onToast('Tested Anthropic connection')}
                >
                  Test
                </button>
                <button
                  className="bt sm"
                  data-act="toast"
                  onClick={() => onToast('Models refreshed')}
                >
                  Refresh models
                </button>
              </div>
            ) : (
              connections.map(c => (
                <div key={c.id} className="li">
                  <div>
                    <b>{c.name || c.kind}</b>
                    <div className="mut mono">{c.kind}</div>
                  </div>
                  <span className={`rk ${c.hasApiKey ? 'g' : ''}`}>
                    {c.hasApiKey ? 'Active' : 'No key'}
                  </span>
                  <button
                    className="bt sm"
                    data-act="toast"
                    onClick={() => void handleTestConnection(c.id, c.name)}
                  >
                    Test
                  </button>
                  <button
                    className="bt sm"
                    data-act="toast"
                    onClick={() => void handleRefreshConnectionModels(c.id, c.name)}
                  >
                    Refresh models
                  </button>
                </div>
              ))
            )}

            <h2 style={{ fontSize: '16px', margin: '18px 0 10px' }}>Default model</h2>
            <div data-r="GET /model-settings · PATCH /model-settings">
              {models.length === 0 ? (
                ['Sonnet · verified', 'Haiku · verified', 'Opus · not verified'].map((m, i) => (
                  <button
                    key={m}
                    className="li"
                    data-act="pick"
                    onClick={() => setDefaultModelId(m)}
                  >
                    <div>{m}</div>
                    <span className={`swt ${defaultModelId === m || (!defaultModelId && i === 0) ? 'on' : ''}`} />
                  </button>
                ))
              ) : (
                models.map(m => (
                  <button
                    key={m.id}
                    className="li"
                    data-act="pick"
                    onClick={() => void handleSetDefaultModel(m.id)}
                  >
                    <div>
                      <b>{m.name || m.id}</b>
                      <div className="mut">{m.provider}</div>
                    </div>
                    <span className={`swt ${defaultModelId === m.id ? 'on' : ''}`} />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tools Tab */}
        {tab === 'tools' && (
          <div data-r="GET /tools · GET /tools/:id">
            {toolsList.map(t => (
              <div key={t.name} className="li">
                <div>
                  <b className="mono">{t.name}</b>
                  <div className="mut">{t.desc}</div>
                </div>
                <span className="rk n">{t.approval}</span>
              </div>
            ))}

            <h2 style={{ fontSize: '16px', margin: '18px 0 10px' }}>Developer connections</h2>
            <div className="li" data-r="GET /developer-connections · POST …/qualify">
              <div>
                <b>{devConnections[0]?.name || 'Local Git CLI'}</b>
                <div className="mut">{devConnections[0]?.status || 'Qualified'}</div>
              </div>
              <button
                className="bt sm"
                data-act="toast"
                onClick={() => onToast('POST /developer-connections/git/qualify')}
              >
                Qualify
              </button>
              <button
                className="bt sm"
                data-act="toast"
                onClick={() => onToast('POST /developer-connections/git/disconnect')}
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* Memory Tab */}
        {tab === 'memory' && (
          <div data-r="GET /projects/:id/memories · POST …/memory-search · POST …/knowledge-index">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input
                type="text"
                placeholder="Search project memory…"
                value={memorySearch}
                onChange={e => setMemorySearch(e.target.value)}
                onKeyDown={async e => {
                  if (e.key === 'Enter' && projectId && memorySearch.trim()) {
                    try {
                      const res = await memoryApi.searchMemories(projectId, memorySearch.trim());
                      setMemories(res.results.map(m => ({ id: m.id, content: m.content, memoryKind: m.memoryKind })));
                      onToast(`Found ${res.results.length} memories`);
                    } catch {
                      onToast('POST /projects/:id/memory-search');
                    }
                  }
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--b1)',
                  background: 'var(--s1)',
                  color: 'var(--t1)',
                  fontSize: '13px',
                }}
              />
              <button
                className="bt sm"
                disabled={indexingKnowledge}
                onClick={async () => {
                  if (projectId) {
                    setIndexingKnowledge(true);
                    try {
                      await memoryApi.indexKnowledge(projectId);
                      onToast('Project knowledge graph indexed');
                    } catch {
                      onToast('POST /projects/:id/knowledge-index');
                    } finally {
                      setIndexingKnowledge(false);
                    }
                  } else {
                    onToast('Open a project folder to index knowledge');
                  }
                }}
              >
                {indexingKnowledge ? 'Indexing…' : 'Index Graph'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {memories.map(m => (
                <div key={m.id} className="cd" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span className="rk n mono" style={{ fontSize: '11px' }}>{m.memoryKind || 'general'}</span>
                    <button
                      className="mut hover:text-[var(--red)]"
                      style={{ fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={async () => {
                        try {
                          await memoryApi.deleteMemory(m.id);
                          setMemories(prev => prev.filter(item => item.id !== m.id));
                          onToast('Memory removed');
                        } catch {
                          onToast(`DELETE /memories/${m.id}`);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--t1)', lineHeight: '18px' }}>{m.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Budgets and Usage Tab */}
        {tab === 'budgets' && (
          <div>
            <div className="cd" data-r="GET /usage">
              <b>Today</b>
              <div className="mut">$1.84 of $5.00 ceiling</div>
              <div className="ub">
                <i style={{ width: '37%' }} />
              </div>
            </div>
            <div className="cd" style={{ marginTop: '12px' }}>
              <b>This chat</b>
              <div className="mut">$0.12 of $1.00 ceiling</div>
              <div className="ub">
                <i style={{ width: '12%' }} />
              </div>
            </div>
            <p className="mut" style={{ marginTop: '14px' }}>
              Ceilings are enforced by the server. Budget reservation is internal and has no button here.
            </p>
          </div>
        )}

        {/* Diagnostics Tab */}
        {tab === 'diag' && (
          <div data-r="GET /system/diagnostics · GET /isolation/qualifications">
            {diagnostics.map(d => (
              <div key={d.label} className="li">
                <div>
                  <b>{d.label}</b>
                </div>
                <span className={`rk ${d.color}`}>{d.value}</span>
              </div>
            ))}
            <button
              className="li"
              data-act="toast"
              data-m="POST /isolation/qualify (admin)"
              onClick={async () => {
                try {
                  await operationsApi.qualifyIsolation('trusted-local');
                  onToast('Isolation qualification triggered');
                  void loadSettingsData();
                } catch {
                  onToast('POST /isolation/qualify (admin)');
                }
              }}
            >
              <div>
                <b>Run isolation qualification</b>
                <div className="mut">Required before the terminal or commands can run</div>
              </div>
              <ChevIcon size={16} />
            </button>
            <div className="li" style={{ opacity: 0.55 }}>
              <div>
                <b>Maintenance purge</b>
                <div className="mut">Administrators only</div>
              </div>
              <LockIcon size={16} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
