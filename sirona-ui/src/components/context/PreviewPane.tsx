import React, { useState, useRef } from 'react'
import { useStore } from '@nanostores/react'
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCw,
  Copy,
  Check,
  Download,
  ExternalLink,
  Code,
  Eye,
  Layers,
  Sparkles,
} from 'lucide-react'
import {
  $artifacts,
  $selectedArtifact,
  $previewMode,
  $previewViewport,
  selectArtifact,
  registerArtifact,
  type PreviewViewport,
} from '../../store/artifactStore'
import { $activeSessionId } from '../../store/sessionStore'

export const PreviewPane: React.FC = () => {
  const artifacts = useStore($artifacts)
  const selected = useStore($selectedArtifact)
  const mode = useStore($previewMode)
  const viewport = useStore($previewViewport)
  const activeSessionId = useStore($activeSessionId)

  const [copied, setCopied] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1)
  }

  const handleCopy = () => {
    if (!selected) return
    navigator.clipboard.writeText(selected.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!selected) return
    const blob = new Blob([selected.content], {
      type: selected.type === 'html' ? 'text/html' : 'text/plain',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selected.id}.${selected.type === 'html' ? 'html' : selected.language || 'txt'}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleOpenExternal = () => {
    if (!selected) return
    if (selected.type === 'html') {
      const blob = new Blob([selected.content], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      if (typeof window !== 'undefined' && (window as any).sironaDesktop?.openExternal) {
        ;(window as any).sironaDesktop.openExternal(url)
      } else {
        window.open(url, '_blank')
      }
    }
  }

  const handleLoadSample = () => {
    const sampleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sirona Sample Metrics</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 24px;
      background: #f6f8fa;
      color: #0f172a;
    }
    .card {
      background: #ffffff;
      border: 1px solid #d0d7de;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      margin-bottom: 16px;
    }
    h1 { font-size: 20px; margin-top: 0; color: #0053fd; font-weight: 600; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .metric { background: #ffffff; border: 1px solid #d0d7de; padding: 12px; border-radius: 8px; }
    .value { font-size: 24px; font-weight: 700; color: #0053fd; }
    .label { font-size: 12px; color: #57606a; margin-top: 4px; }
    button {
      background: #0053fd;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
    }
    button:hover { background: #0043c7; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🚀 Sirona Agent Live Preview</h1>
    <p>This is a sandboxed HTML preview rendered within Sirona's Right Rail.</p>
    <div class="grid">
      <div class="metric">
        <div class="value">99.98%</div>
        <div class="label">Uptime SLA</div>
      </div>
      <div class="metric">
        <div class="value">14.2ms</div>
        <div class="label">Median RPC Latency</div>
      </div>
      <div class="metric">
        <div class="value">48/48</div>
        <div class="label">Parity Contracts</div>
      </div>
    </div>
    <div style="margin-top: 16px;">
      <button onclick="alert('Interactive sandbox works!')">Test Interactivity</button>
    </div>
  </div>
</body>
</html>`

    registerArtifact({
      id: 'sample-metrics-dashboard',
      sessionId: activeSessionId || 'default-session',
      title: 'Sample Metrics Dashboard',
      type: 'html',
      language: 'html',
      content: sampleHtml,
    })
  }

  // Get viewport width constraint
  const getViewportWidth = (vp: PreviewViewport): string => {
    switch (vp) {
      case 'mobile':
        return '375px'
      case 'tablet':
        return '768px'
      default:
        return '100%'
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--dt-sidebar)] overflow-hidden select-text">
      {/* Top action toolbar */}
      <div className="h-11 px-3 border-b border-[var(--dt-border)] bg-[var(--dt-card)] flex items-center justify-between shrink-0">
        {/* Left: Artifact title & selector */}
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          {artifacts.length > 1 ? (
            <select
              value={selected?.id || ''}
              onChange={(e) => selectArtifact(e.target.value)}
              className="bg-[var(--dt-sidebar)] text-[12px] font-medium text-[var(--dt-foreground)] border border-[var(--dt-border)] rounded-[6px] px-2 py-1 outline-none cursor-pointer max-w-[180px] truncate"
            >
              {artifacts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          ) : selected ? (
            <span className="text-[13px] font-medium text-[var(--dt-foreground)] truncate max-w-[180px]">
              {selected.title}
            </span>
          ) : (
            <span className="text-[13px] text-[var(--dt-muted-foreground)]">Preview</span>
          )}

          {selected && (
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--dt-sidebar)] border border-[var(--dt-border)] text-[var(--dt-primary)]">
              {selected.type}
            </span>
          )}
        </div>

        {/* Center: Viewport & Mode Controls */}
        {selected && (
          <div className="flex items-center gap-1">
            {/* Viewport switch */}
            <div className="hidden sm:flex items-center bg-[var(--dt-sidebar)] border border-[var(--dt-border)] rounded-[6px] p-0.5">
              <button
                type="button"
                onClick={() => $previewViewport.set('desktop')}
                className={`p-1 rounded ${viewport === 'desktop' ? 'bg-[var(--dt-card)] text-[var(--dt-primary)] shadow-[var(--shadow-subtle)]' : 'text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)]'}`}
                title="Desktop View"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => $previewViewport.set('tablet')}
                className={`p-1 rounded ${viewport === 'tablet' ? 'bg-[var(--dt-card)] text-[var(--dt-primary)] shadow-[var(--shadow-subtle)]' : 'text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)]'}`}
                title="Tablet View (768px)"
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => $previewViewport.set('mobile')}
                className={`p-1 rounded ${viewport === 'mobile' ? 'bg-[var(--dt-card)] text-[var(--dt-primary)] shadow-[var(--shadow-subtle)]' : 'text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)]'}`}
                title="Mobile View (375px)"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mode toggle */}
            <div className="flex items-center bg-[var(--dt-sidebar)] border border-[var(--dt-border)] rounded-[6px] p-0.5">
              <button
                type="button"
                onClick={() => $previewMode.set('preview')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium ${mode === 'preview' ? 'bg-[var(--dt-card)] text-[var(--dt-primary)] shadow-[var(--shadow-subtle)]' : 'text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)]'}`}
              >
                <Eye className="w-3 h-3" />
                <span>Preview</span>
              </button>
              <button
                type="button"
                onClick={() => $previewMode.set('code')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium ${mode === 'code' ? 'bg-[var(--dt-card)] text-[var(--dt-primary)] shadow-[var(--shadow-subtle)]' : 'text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)]'}`}
              >
                <Code className="w-3 h-3" />
                <span>Code</span>
              </button>
            </div>
          </div>
        )}

        {/* Right: Actions */}
        {selected && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleRefresh}
              className="p-1.5 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-sidebar-accent)] rounded-[6px] transition-colors"
              title="Refresh Preview"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-sidebar-accent)] rounded-[6px] transition-colors"
              title="Copy Code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[var(--dt-primary)]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-sidebar-accent)] rounded-[6px] transition-colors"
              title="Download Artifact"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleOpenExternal}
              className="p-1.5 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-sidebar-accent)] rounded-[6px] transition-colors"
              title="Open in Browser"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 bg-[var(--dt-sidebar)] overflow-auto flex items-center justify-center p-3 relative">
        {selected ? (
          mode === 'preview' ? (
            <div
              style={{ width: getViewportWidth(viewport) }}
              className="h-full bg-[var(--dt-card)] rounded-[12px] border border-[var(--dt-border)] shadow-[var(--shadow-subtle)] overflow-hidden transition-all duration-200 flex flex-col"
            >
              {selected.type === 'html' ? (
                <iframe
                  key={refreshKey}
                  ref={iframeRef}
                  title={selected.title}
                  srcDoc={selected.content}
                  sandbox="allow-scripts allow-forms allow-modals"
                  className="w-full h-full border-0 bg-white"
                />
              ) : selected.type === 'svg' ? (
                <div
                  className="w-full h-full flex items-center justify-center p-4 overflow-auto"
                  dangerouslySetInnerHTML={{ __html: selected.content }}
                />
              ) : (
                <div className="p-4 overflow-auto font-mono text-[12px] text-[var(--dt-foreground)] whitespace-pre-wrap">
                  {selected.content}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full bg-[var(--dt-card)] rounded-[12px] border border-[var(--dt-border)] shadow-[var(--shadow-subtle)] p-4 overflow-auto font-mono text-[12px] leading-relaxed text-[var(--dt-foreground)] select-text">
              <pre className="whitespace-pre-wrap">{selected.content}</pre>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 select-none max-w-sm">
            <div className="w-12 h-12 rounded-[16px] bg-[var(--dt-card)] border border-[var(--dt-border)] flex items-center justify-center mb-3 shadow-[var(--shadow-subtle)]">
              <Layers className="w-6 h-6 text-[var(--dt-primary)]" />
            </div>
            <h3 className="text-[16px] font-medium text-[var(--dt-foreground)] mb-1">
              No Preview Active
            </h3>
            <p className="text-[13px] text-[var(--dt-muted-foreground)] leading-relaxed mb-4">
              Generate an HTML dashboard, visual diagram, or web component in chat to inspect and test it live.
            </p>
            <button
              type="button"
              onClick={handleLoadSample}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--dt-primary)] text-white hover:bg-[var(--dt-primary-hover)] transition-colors text-[12px] font-medium shadow-[var(--shadow-subtle)] cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Sample Dashboard</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
