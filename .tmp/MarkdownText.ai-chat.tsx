import { isValidElement, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeTokens } from '../application/ai-chat/CodeTokens'

function CodeBlock({ code, language, title }: { code: string; language: string; title: string }) {
  const [copied, setCopied] = useState(false), [error, setError] = useState('')
  return <div className="code-block"><header className="ai-snippet-header"><span className="ai-code-language">{language.toUpperCase()}</span><span>{title || 'Code snippet'}</span><button className="icon-button" aria-label="Copy code" onClick={() => { void navigator.clipboard.writeText(code).then(() => { setCopied(true); setError('') }).catch(() => setError('Could not copy code.')) }}>{copied ? <Check size={13} /> : <Copy size={13} />}</button></header><pre><code>{code.replace(/\n$/, '').split('\n').map((line, index) => <span key={index} className="ai-snippet-line"><span className="ai-line-number" aria-hidden>{index + 1}</span><span><CodeTokens line={line} /></span></span>)}</code></pre>{error && <p role="status">{error}</p>}</div>
}

export default function Message({ text }: { text: string }) {
  return <div className="message-prose"><Markdown remarkPlugins={[remarkGfm]} components={{
    a: ({ children, href }) => <span title={href}>{children}</span>,
    pre: ({ children, node }) => {
      const info = (text.split('\n')[(node?.position?.start.line ?? 1) - 1] ?? '').replace(/^\s*```/, '').trim().split(/\s+/)
      const code = isValidElement<{ children?: unknown }>(children) ? String(children.props.children ?? '') : String(children ?? '')
      return <CodeBlock code={code} language={info[0] || 'text'} title={info.slice(1).join(' ')} />
    },
  }}>{text}</Markdown></div>
}
