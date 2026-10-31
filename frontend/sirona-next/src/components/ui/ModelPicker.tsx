import { useMemo, useState } from 'react';
import { ChevronDown, Check, Search, Sparkles, Cpu } from 'lucide-react';
import type { Model } from '../../api/schemas';
import { Dialog } from './Dialog';

export interface ModelPickerProps {
  models: Model[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  label?: string;
}

export function ModelPicker({
  models,
  value,
  onChange,
  disabled = false,
  label = 'Select model',
}: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [limit, setLimit] = useState(60);

  const current = models.find(m => m.id === value);
  const options = useMemo(
    () =>
      models.filter(
        m =>
          (filter === 'all' || m.provider === filter) &&
          `${m.name} ${m.id} ${m.provider} ${m.connectionName ?? ''}`
            .toLowerCase()
            .includes(search.toLowerCase())
      ),
    [models, search, filter]
  );

  const groups = Map.groupBy(
    options.slice(0, limit),
    m => m.providerConnectionId ?? m.connectionName ?? m.provider
  );

  return (
    <>
      <button
        type="button"
        className="model-trigger inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all duration-150 text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500"
        aria-label={label}
        title={current?.name ?? 'Select a model'}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
        <span className="truncate max-w-[130px]">{current?.name ?? 'Select a model'}</span>
        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Choose a model">
        <p className="muted text-xs text-zinc-500 dark:text-zinc-400 -mt-2 mb-4 leading-relaxed">
          Discovered models from authenticated provider connections. Upstream availability depends on your API key limits.
        </p>

        <div className="search-field relative mb-3">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            autoFocus
            name="model-search"
            aria-label="Search models"
            placeholder="Search by name, provider, or model ID..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setLimit(60);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>

        <div className="filter-row flex items-center justify-between gap-3 mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800 text-xs">
          <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
            <span className="font-medium text-[11px] uppercase tracking-wider text-zinc-400">Provider</span>
            <select
              value={filter}
              onChange={e => {
                setFilter(e.target.value);
                setLimit(60);
              }}
              className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All providers</option>
              {[...new Set(models.map(m => m.provider))].map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <span className="text-[11px] text-zinc-400 tabular-nums">{options.length} discovered</span>
        </div>

        <div className="model-results max-h-[380px] overflow-y-auto space-y-4 pr-1">
          {[...groups].map(([group, items]) => (
            <section key={group} className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-1 py-1">
                <Cpu className="w-3 h-3 text-zinc-400" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  {items[0]?.connectionName ?? items[0]?.provider ?? group}
                </h3>
              </div>
              <div className="space-y-1">
                {items.map(model => {
                  const isSelected = value === model.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      disabled={!model.hasConfiguredApiKey}
                      aria-pressed={isSelected}
                      onClick={() => {
                        onChange(model.id);
                        setOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <strong className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{model.name}</strong>
                          <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 truncate">
                            {model.id}
                          </code>
                        </span>
                        <small className="block text-[11px] text-zinc-400 mt-0.5">
                          {model.hasConfiguredApiKey
                            ? 'Connection configured · ready'
                            : 'No configured connection'}
                        </small>
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" strokeWidth={2.5} />}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          {!options.length && (
            <p className="text-xs text-zinc-400 text-center py-8">No matching models found.</p>
          )}
          {options.length > limit && (
            <div className="pt-2 text-center">
              <button
                className="secondary text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 cursor-pointer"
                onClick={() => setLimit(n => n + 60)}
              >
                Show 60 more
              </button>
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}
