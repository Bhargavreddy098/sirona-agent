import { useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Copy, Check, Compass, Hammer } from 'lucide-react';
import type { Message as MessageData } from '../../api/schemas';

export function CopyButton({ text, label = 'Copy message' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="icon-button copy inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover)] transition-[color,background-color] var(--duration-fast) var(--ease-out) cursor-pointer"
      aria-label={copied ? 'Copied' : label}
      title={copied ? 'Copied' : label}
      onClick={() => {
        void (window.sirona
          ? window.sirona.copyText(text)
          : navigator.clipboard.writeText(text)
        )
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => setCopied(false));
      }}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-[var(--color-success)]" strokeWidth={2} /> : <Copy className="w-3.5 h-3.5" strokeWidth={2} />}
    </button>
  );
}

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    return textOf((node.props as { children?: ReactNode }).children);
  }
  return '';
}

export function Message({ message }: { message: MessageData }) {
  const user = message.role === 'user';
  const completed = message.status === 'completed';

  const isPlan = user && message.content.startsWith('[Mode: Plan]');
  const isBuild = user && message.content.startsWith('[Mode: Build]');
  const displayContent = isPlan
    ? message.content.replace(/^\[Mode: Plan\]\s*/, '')
    : isBuild
    ? message.content.replace(/^\[Mode: Build\]\s*/, '')
    : message.content;

  return (
    <article
      className={`message ${user ? 'user' : 'assistant'}`}
      aria-label={user ? 'Your message' : 'Assistant response'}
    >
      <div className="message-content">
        {user && (isPlan || isBuild) && (
          <div className="mb-[var(--space-2-5)] flex items-center gap-[var(--space-1-5)]">
            {isPlan && (
              <span className="inline-flex items-center gap-[var(--space-1)] px-2 py-0.5 rounded-full text-[11px] font-[var(--font-semibold)] bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
                <Compass className="w-3 h-3" strokeWidth={2} />
                <span>Plan</span>
              </span>
            )}
            {isBuild && (
              <span className="inline-flex items-center gap-[var(--space-1)] px-2 py-0.5 rounded-full text-[11px] font-[var(--font-semibold)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]">
                <Hammer className="w-3 h-3" strokeWidth={2} />
                <span>Build</span>
              </span>
            )}
          </div>
        )}

        <div className="prose">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}
            components={{
              pre: ({ children }) => (
                <div className="code-block rounded-[var(--radius-2xl)] overflow-hidden border border-[var(--color-border)] my-[var(--space-2)] bg-[var(--color-surface)]">
                  <div className="code-heading flex items-center justify-between px-3 py-1.5 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--text-xs)] font-mono text-[var(--color-text-secondary)]">
                    <span>Code</span>
                    <CopyButton text={textOf(children)} label="Copy code" />
                  </div>
                  <pre className="p-3 text-[var(--text-xs)] overflow-x-auto font-mono text-[var(--color-text-primary)] leading-relaxed">
                    {children}
                  </pre>
                </div>
              ),
              a: ({ children, href }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--color-primary)] hover:underline font-[var(--font-medium)]"
                >
                  {children}
                </a>
              ),
            }}
          >
            {displayContent}
          </ReactMarkdown>
        </div>

        {!completed && (
          <p className="message-status text-[var(--text-xs)] text-[var(--color-text-tertiary)] mt-[var(--space-1)]" role="status">
            {message.status === 'cancelled'
              ? 'Stopped'
              : message.status === 'failed'
              ? 'Turn failed'
              : 'In progress'}
          </p>
        )}

        {!user && completed && (
          <div className="mt-[var(--space-1)] flex items-center gap-[var(--space-2)]">
            <CopyButton text={message.content} />
          </div>
        )}

        {message.timestamp && (
          <time className="message-time text-[10px] text-[var(--color-text-tertiary)] mt-[var(--space-1)] block">
            {new Date(message.timestamp * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })}
          </time>
        )}
      </div>
    </article>
  );
}

export default Message;
