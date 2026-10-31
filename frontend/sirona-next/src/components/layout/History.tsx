import { Trash2 } from 'lucide-react';
import type { Conversation } from '../../api/schemas';

function activity(value: Conversation['last_activity_at']) {
  if (value == null) return null;
  const date = new Date(typeof value === 'number' ? (value < 1e12 ? value * 1000 : value) : value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export interface HistoryProps {
  conversations: Conversation[];
  active?: string;
  disabled: boolean;
  onOpen: (conversation: Conversation) => void;
  onDelete?: (conversation: Conversation) => void;
}

export function History({ conversations, active, disabled, onOpen, onDelete }: HistoryProps) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const groups = Map.groupBy(conversations, conversation => {
    const date = activity(conversation.last_activity_at);
    return date?.toDateString() === today.toDateString()
      ? 'Today'
      : date?.toDateString() === yesterday.toDateString()
      ? 'Yesterday'
      : 'Earlier';
  });

  return (
    <div className="history flex-1 min-h-0 overflow-y-auto px-3 py-1">
      {[...groups].map(([label, items]) => (
        <div key={label} className="history-group mt-3 first:mt-0">
          <div className="history-heading px-2 py-1 text-[11px] font-semibold tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
            {label}
          </div>
          <ul className="history-list flex flex-col gap-0.5 m-0 p-0 list-none">
            {items.map(conversation => {
              const isActive = active === conversation.id;
              const date = activity(conversation.last_activity_at);
              return (
                <li key={conversation.id}>
                  <div
                    className={`history-item group flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-[13px] cursor-pointer transition-all duration-150 ${
                      isActive
                        ? 'is-active active bg-zinc-200/70 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:not-disabled:bg-zinc-200/40 dark:hover:not-disabled:bg-zinc-800/60 hover:not-disabled:text-zinc-900 dark:hover:not-disabled:text-zinc-100'
                    }`}
                    onClick={() => onOpen(conversation)}
                  >
                    <button
                      className="history-item-button flex-1 min-w-0 p-0 border-0 bg-transparent text-inherit font-inherit text-left flex items-center justify-between overflow-hidden cursor-pointer disabled:cursor-not-allowed"
                      aria-current={isActive ? 'page' : undefined}
                      disabled={disabled}
                      title={conversation.title}
                      onClick={e => {
                        e.stopPropagation();
                        onOpen(conversation);
                      }}
                    >
                      <span className="history-item-title truncate flex-1 tracking-tight">
                        {conversation.title}
                      </span>
                      {date && (
                        <time className="text-[11px] text-zinc-400 dark:text-zinc-500 ml-2 shrink-0 font-normal tabular-nums">
                          {date.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })}
                        </time>
                      )}
                    </button>
                    {onDelete && (
                      <button
                        className="history-item-delete shrink-0 inline-flex items-center justify-center w-6 h-6 p-0 border-0 rounded-md bg-transparent text-zinc-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed"
                        aria-label={`Delete ${conversation.title}`}
                        title="Delete chat"
                        disabled={disabled}
                        onClick={e => {
                          e.stopPropagation();
                          onDelete(conversation);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {!conversations.length && (
        <p className="history-empty py-4 px-2.5 text-[12.5px] text-zinc-400 dark:text-zinc-500">
          No conversations yet.
        </p>
      )}
    </div>
  );
}
