import React, { useState } from 'react'
import { Eye, Copy, Check, Code, Layout, ChevronDown, ChevronRight } from 'lucide-react'
import { selectArtifact, type ArtifactItem } from '../../store/artifactStore'

export interface ArtifactCardProps {
  artifact: ArtifactItem
}

export const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact }) => {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handleOpenPreview = () => {
    selectArtifact(artifact.id)
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(artifact.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isHtmlOrSvg = artifact.type === 'html' || artifact.type === 'svg'

  return (
    <div className="my-2.5 border border-[var(--dt-border)] bg-[var(--dt-card)] hover:border-[var(--dt-primary)] rounded-[12px] overflow-hidden shadow-[var(--shadow-subtle)] transition-all">
      <div
        onClick={handleOpenPreview}
        className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer select-none bg-[var(--dt-card)] hover:bg-[var(--dt-background)] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-[var(--dt-background)] border border-[var(--dt-border)] flex items-center justify-center text-[var(--dt-primary)]">
            {isHtmlOrSvg ? <Layout className="w-4 h-4" /> : <Code className="w-4 h-4" />}
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-[var(--dt-foreground)] leading-snug">
              {artifact.title}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--dt-muted-foreground)] font-mono">
              <span className="uppercase">{artifact.language || artifact.type}</span>
              <span>•</span>
              <span>{artifact.content.split('\n').length} lines</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-card)] rounded-[6px] transition-colors"
            title="Copy artifact code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[var(--dt-primary)]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleOpenPreview}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--dt-primary)] text-white hover:brightness-110 transition-all text-[12px] font-medium shadow-sm"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Open Preview</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="p-1 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] transition-colors"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 border-t border-[var(--dt-border)] bg-[var(--dt-background)]">
          <pre className="text-[12px] font-mono leading-relaxed overflow-x-auto text-[var(--dt-foreground)] max-h-60 whitespace-pre">
            {artifact.content}
          </pre>
        </div>
      )}
    </div>
  )
}
