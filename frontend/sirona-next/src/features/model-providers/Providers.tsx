import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  RiAddLine,
  RiArrowLeftLine,
  RiRefreshLine,
  RiCheckLine,
  RiEditLine,
  RiDeleteBinLine,
  RiShieldCheckLine,
} from '@remixicon/react';
import { api } from '../../api/client';
import type { Connection, Model, ProviderInput, Settings } from '../../api/schemas';
import { Dialog } from '../../components/ui/Dialog';
import { CredentialStatus } from './CredentialStatus';
import { ModelPicker } from '../../components/ui/ModelPicker';
import { ToolsSettings } from './ToolsSettings';
import { GovernanceSettings } from './GovernanceSettings';
import { DiagnosticsSettings } from './DiagnosticsSettings';

type Provider = {
  id: string;
  name: string;
  description?: string;
  defaultBaseUrl?: string | null;
};

export function Providers({
  onBack,
  onRefresh,
}: {
  onBack: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [settings, setSettings] = useState<Settings>();
  const [tab, setTab] = useState('Connections');
  const [editor, setEditor] = useState<Connection | 'new' | null>(null);
  const [removing, setRemoving] = useState<Connection | null>(null);
  const [kind, setKind] = useState('openai_compatible');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const [c, p, m, s] = await Promise.all([
      api.connections(),
      api.providers(),
      api.models(),
      api.settings(),
    ]);
    setConnections(c.connections);
    setProviders(p.providers);
    setModels(m.models);
    setSettings(s);
  }, []);

  useEffect(() => {
    void refresh().catch(cause => setError(cause.message));
  }, [refresh]);

  const action = async (id: string, task: () => Promise<void>) => {
    if (busy) return;
    setBusy(id);
    setError('');
    setNotice('');
    try {
      await task();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed');
    } finally {
      setBusy('');
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const input: ProviderInput = {
      ...(editor && editor !== 'new' ? { id: editor.id } : {}),
      kind,
      name: String(data.get('name')),
      baseUrl: String(data.get('baseUrl') || '') || undefined,
      ...(data.get('apiKey') ? { apiKey: String(data.get('apiKey')) } : {}),
      isActive: true,
    };
    (form.elements.namedItem('apiKey') as HTMLInputElement).value = '';
    await action('save', async () => {
      try {
        await api.saveConnection(input);
      } finally {
        input.apiKey = undefined;
      }
      await refresh();
      await onRefresh();
      setEditor(null);
      setNotice('Connection saved. Test it, then refresh its models.');
    });
  };

  const labels = [
    'Connections',
    'Models',
    'Routing',
    'Tools & CLIs',
    'Governance & Budgets',
    'Diagnostics & Recovery',
    'Security',
  ];

  return (
    <div className="settings-page flex-1 overflow-y-auto px-6 py-6 max-w-4xl mx-auto w-full text-[var(--fg-primary)]">
      {/* Page Heading */}
      <div className="page-heading flex items-center justify-between pb-5 mb-5 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-3">
          <button
            className="icon-button inline-flex items-center justify-center w-8 h-8 rounded-lg text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)] transition-all cursor-pointer"
            aria-label="Back to chat"
            onClick={onBack}
          >
            <RiArrowLeftLine size={20} />
          </button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--fg-primary)]">
              Model providers
            </h1>
            <p className="text-xs text-[var(--fg-secondary)] mt-0.5">
              Configure AI model connections and secure API credentials.
            </p>
          </div>
        </div>
        <button
          className="primary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)] transition-all shadow-xs cursor-pointer"
          onClick={() => {
            setKind('openai_compatible');
            setEditor('new');
          }}
        >
          <RiAddLine size={16} />
          <span>Add connection</span>
        </button>
      </div>

      {error && (
        <div className="notice error flex items-center gap-2 p-3 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger)] text-[var(--danger-text)] text-xs mb-4" role="alert">
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="notice flex items-center gap-2 p-3 rounded-xl bg-[var(--success-bg)] border border-[var(--success)] text-[var(--success-text)] text-xs mb-4" role="status">
          <RiCheckLine size={16} />
          <span>{notice}</span>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <nav className="settings-tabs flex gap-1 border-b border-[var(--border-default)] mb-6" aria-label="Provider settings">
        {labels.map(label => (
          <button
            key={label}
            className={`px-3 py-2 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
              tab === label
                ? 'border-[var(--accent-primary)] text-[var(--accent-text)] bg-[var(--bg-surface-subtle)]'
                : 'border-transparent text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-hover)]'
            }`}
            aria-current={tab === label ? 'page' : undefined}
            onClick={() => setTab(label)}
          >
            <span>{label}</span>
            {label === 'Models' && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--bg-hover)] text-[var(--fg-muted)]">
                {models.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Tab: Connections */}
      {tab === 'Connections' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-[var(--fg-secondary)] flex items-center gap-1.5">
              <RiShieldCheckLine size={15} className="text-[var(--success)]" />
              <span>API keys are encrypted locally with Windows DPAPI and stored securely.</span>
            </p>
          </div>
          <div className="connection-list flex flex-col gap-3">
            {connections.map(connection => (
              <section
                key={connection.id}
                className="connection-row flex items-center justify-between p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="provider-monogram w-9 h-9 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent-text)] flex items-center justify-center font-bold text-sm shrink-0">
                    {connection.name?.slice(0, 1).toUpperCase() ?? 'P'}
                  </div>
                  <div className="connection-info min-w-0">
                    <h2 className="text-sm font-semibold text-[var(--fg-primary)] truncate">
                      {connection.name || connection.kind}
                    </h2>
                    <p className="text-xs text-[var(--fg-secondary)] mt-0.5">
                      <span className="capitalize">{connection.kind}</span> ·{' '}
                      <span className={connection.isActive ? 'text-[var(--success)]' : 'text-[var(--fg-muted)]'}>
                        {connection.isActive ? 'Enabled' : 'Disabled'}
                      </span>
                    </p>
                    <code className="text-[11px] text-[var(--fg-muted)] block mt-1 font-mono truncate max-w-sm">
                      {connection.baseUrl || 'Provider default endpoint'}
                    </code>
                  </div>
                </div>

                <div className="connection-actions flex items-center gap-2 shrink-0">
                  <button
                    disabled={!!busy}
                    className="secondary text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--fg-primary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer disabled:opacity-45"
                    onClick={() =>
                      void action(connection.id, async () => {
                        const result = await api.testConnection(connection.id);
                        if (result.success === false)
                          throw new Error(result.message || 'Connection test failed');
                        setNotice(
                          `Connection test succeeded${
                            result.latencyMs !== undefined ? ` · ${result.latencyMs}ms` : ''
                          }`
                        );
                      })
                    }
                  >
                    {busy === connection.id ? 'Testing…' : 'Test connection'}
                  </button>
                  <button
                    disabled={!!busy}
                    className="secondary inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--fg-primary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer disabled:opacity-45"
                    onClick={() =>
                      void action(`refresh:${connection.id}`, async () => {
                        const result = await api.refreshModels(connection.id);
                        await refresh();
                        await onRefresh();
                        setNotice(
                          `Models refreshed${
                            result.count !== undefined ? ` · ${result.count} discovered` : ''
                          }`
                        );
                      })
                    }
                  >
                    <RiRefreshLine size={14} />
                    <span>Refresh</span>
                  </button>
                  <button
                    className="icon-button p-1.5 rounded-md text-[var(--fg-muted)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer"
                    aria-label={`Edit ${connection.name}`}
                    onClick={() => {
                      setKind(connection.kind);
                      setEditor(connection);
                    }}
                  >
                    <RiEditLine size={16} />
                  </button>
                  <button
                    className="icon-button p-1.5 rounded-md text-[var(--fg-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-all cursor-pointer"
                    aria-label={`Remove ${connection.name}`}
                    onClick={() => setRemoving(connection)}
                  >
                    <RiDeleteBinLine size={16} />
                  </button>
                </div>
              </section>
            ))}
            {!connections.length && (
              <div className="settings-empty p-8 text-center border border-dashed border-[var(--border-default)] rounded-xl bg-[var(--bg-surface-subtle)]">
                <h2 className="text-sm font-semibold text-[var(--fg-primary)]">No connections configured</h2>
                <p className="text-xs text-[var(--fg-secondary)] mt-1">
                  Add a model provider connection to begin chatting.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Models */}
      {tab === 'Models' && (
        <section className="registry-section p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-xs">
          <h2 className="text-sm font-semibold text-[var(--fg-primary)] mb-1">Discovered models</h2>
          <p className="text-xs text-[var(--fg-secondary)] mb-4">
            Available models synced from your configured connections.
          </p>
          <ModelPicker
            models={models}
            value=""
            onChange={id => setNotice(`Selected registry identifier: ${id}`)}
          />
          <div className="registry-summary grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-[var(--border-default)]">
            {[...new Set(models.map(m => m.connectionName ?? m.provider))].map(group => (
              <div
                key={group}
                className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-xs"
              >
                <strong className="font-semibold text-[var(--fg-primary)]">{group}</strong>
                <span className="text-[var(--fg-muted)]">
                  {models.filter(m => (m.connectionName ?? m.provider) === group).length} discovered
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tab: Routing */}
      {tab === 'Routing' && settings && (
        <form
          className="routing-form p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-xs flex flex-col gap-4"
          onSubmit={event => {
            event.preventDefault();
            void action('routing', async () => {
              await api.saveSettings(settings);
              await onRefresh();
              setNotice(
                'Routing preferences saved. New chats use the configured primary model when available.'
              );
            });
          }}
        >
          <div>
            <h2 className="text-sm font-semibold text-[var(--fg-primary)]">Routing defaults</h2>
            <p className="text-xs text-[var(--fg-secondary)] mt-0.5">
              Set primary and fallback models for new conversations.
            </p>
          </div>
          <div className="routing-field flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--fg-secondary)]">Primary model</label>
            <ModelPicker
              label="Select primary model"
              models={models}
              value={settings.primaryModel}
              onChange={id => setSettings({ ...settings, primaryModel: id })}
            />
          </div>
          <div className="routing-field flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--fg-secondary)]">Fallback model</label>
            <ModelPicker
              label="Select fallback model"
              models={models}
              value={settings.fallbackModel}
              onChange={id => setSettings({ ...settings, fallbackModel: id })}
            />
          </div>
          {['fast', 'reasoning', 'embedding'].map(role => (
            <div className="routing-field flex flex-col gap-1.5" key={role}>
              <label className="text-xs font-semibold text-[var(--fg-secondary)] capitalize">
                Auxiliary {role}
              </label>
              <ModelPicker
                label={`Select auxiliary ${role} model`}
                models={models}
                value={settings.auxiliaryModels?.[role] ?? ''}
                onChange={id =>
                  setSettings({
                    ...settings,
                    auxiliaryModels: { ...settings.auxiliaryModels, [role]: id },
                  })
                }
              />
            </div>
          ))}
          <div className="pt-2">
            <button
              className="primary px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)] transition-all cursor-pointer disabled:opacity-45"
              disabled={!!busy}
            >
              Save routing preferences
            </button>
          </div>
        </form>
      )}

      {/* Tab: Tools & CLIs */}
      {tab === 'Tools & CLIs' && <ToolsSettings />}

      {/* Tab: Governance & Budgets */}
      {tab === 'Governance & Budgets' && <GovernanceSettings />}

      {/* Tab: Diagnostics & Recovery */}
      {tab === 'Diagnostics & Recovery' && <DiagnosticsSettings />}

      {/* Tab: Security */}
      {tab === 'Security' && <CredentialStatus />}

      {/* Editor Modal Dialog */}
      <Dialog
        open={!!editor}
        onClose={() => setEditor(null)}
        title={editor === 'new' ? 'Add provider connection' : 'Edit provider connection'}
      >
        {editor && (
          <form
            key={typeof editor === 'string' ? editor : editor.id}
            className="provider-form flex flex-col gap-3.5 pt-2"
            method="post"
            onSubmit={event => void save(event)}
          >
            <div>
              <label htmlFor="provider-kind" className="block text-xs font-semibold text-[var(--fg-secondary)] mb-1">
                Provider
              </label>
              <select
                id="provider-kind"
                name="kind"
                value={kind}
                disabled={editor !== 'new'}
                onChange={event => setKind(event.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--fg-primary)]"
              >
                {providers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="provider-name" className="block text-xs font-semibold text-[var(--fg-secondary)] mb-1">
                Connection name
              </label>
              <input
                autoFocus
                id="provider-name"
                name="name"
                required
                maxLength={100}
                defaultValue={editor !== 'new' ? editor.name ?? '' : ''}
                placeholder="My model gateway"
                className="w-full text-xs p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--fg-primary)]"
              />
            </div>

            <div>
              <label htmlFor="provider-url" className="block text-xs font-semibold text-[var(--fg-secondary)] mb-1">
                Endpoint URL {kind === 'openai_compatible' ? '(required)' : '(optional)'}
              </label>
              <input
                id="provider-url"
                name="baseUrl"
                type="url"
                required={kind === 'openai_compatible'}
                defaultValue={editor !== 'new' ? editor.baseUrl ?? '' : ''}
                placeholder={kind === 'openai_compatible' ? 'http://127.0.0.1:11434/v1' : 'Use the provider default'}
                spellCheck={false}
                autoCapitalize="off"
                className="w-full text-xs p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--fg-primary)]"
              />
            </div>

            <div>
              <label htmlFor="provider-key" className="block text-xs font-semibold text-[var(--fg-secondary)] mb-1">
                {editor === 'new' ? 'API key' : 'Replace API key'}{' '}
                {kind === 'openai_compatible' || editor !== 'new' ? '(optional)' : '(required)'}
              </label>
              <input
                id="provider-key"
                name="apiKey"
                type="password"
                autoComplete="new-password"
                required={kind !== 'openai_compatible' && editor === 'new'}
                aria-describedby="key-help"
                className="w-full text-xs p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--fg-primary)]"
              />
              <p id="key-help" className="text-[11px] text-[var(--fg-subtle)] mt-1">
                {editor !== 'new' ? 'Leave blank to preserve current key. ' : ''}Encrypted with Windows DPAPI.
              </p>
            </div>

            {error && (
              <p role="alert" className="form-error text-xs text-[var(--danger)]">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-default)]">
              <button
                type="button"
                className="secondary px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-xs text-[var(--fg-secondary)] hover:bg-[var(--bg-hover)]"
                onClick={() => setEditor(null)}
              >
                Cancel
              </button>
              <button
                className="primary px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-45"
                disabled={!!busy}
              >
                {busy === 'save' ? 'Saving…' : 'Save connection'}
              </button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={!!removing} onClose={() => setRemoving(null)} title="Remove this connection?">
        <p className="text-xs text-[var(--fg-secondary)] my-2">
          Models from <strong className="text-[var(--fg-primary)]">{removing?.name || 'this connection'}</strong> will no longer be available.
        </p>
        <div className="dialog-actions flex justify-end gap-2 mt-4 pt-3 border-t border-[var(--border-default)]">
          <button autoFocus className="secondary text-xs px-3 py-1.5 rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-hover)] cursor-pointer" onClick={() => setRemoving(null)}>
            Keep connection
          </button>
          <button
            className="danger text-xs px-3 py-1.5 rounded-lg bg-[var(--danger)] text-white hover:opacity-90 disabled:opacity-45 cursor-pointer"
            disabled={!!busy}
            onClick={() =>
              void action('remove', async () => {
                if (removing) {
                  await api.removeConnection(removing.id);
                  setRemoving(null);
                  await refresh();
                  await onRefresh();
                  setNotice('Connection removed.');
                }
              })
            }
          >
            Remove connection
          </button>
        </div>
      </Dialog>
    </div>
  );
}
