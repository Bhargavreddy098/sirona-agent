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
    <div className="my-3 border border-[#d1d1cd] bg-[#ffffff] hover:border-[#016a71] rounded-[14px] overflow-hidden shadow-[var(--shadow-subtle)] transition-all">
      <div
        onClick={handleOpenPreview}
        className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer select-none bg-[#fdfbfa] hover:bg-[#faf8f5] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-[#f5f3ef] border border-[#d1d1cd] flex items-center justify-center text-[#016a71]">
            {isHtmlOrSvg ? <Layout className="w-4 h-4" /> : <Code className="w-4 h-4" />}
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-[#27251e] leading-snug">
              {artifact.title}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-[#72706b] font-mono">
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
            className="p-1.5 text-[#72706b] hover:text-[#27251e] hover:bg-[#f5f3ef] rounded-[6px] transition-colors"
            title="Copy artifact code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#016a71]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleOpenPreview}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#016a71] text-white hover:bg-[#01585e] transition-colors text-[12px] font-medium shadow-[var(--shadow-subtle)]"
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
            className="p-1 text-[#72706b] hover:text-[#27251e] transition-colors"
            title={expanded ? 'Collapse preview' : 'Expand preview'}
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 border-t border-[#d1d1cd] bg-[#faf8f5] font-mono text-[12px] leading-relaxed max-h-60 overflow-y-auto">
          <pre className="whitespace-pre-wrap text-[#27251e]">{artifact.content}</pre>
        </div>
      )}
    </div>
  )
}
