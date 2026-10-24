import { atom, computed } from 'nanostores'
import { $activeContextTab, $contextPaneOpen } from './layoutStore'
import { $activeSessionId } from './sessionStore'

export type ArtifactType = 'html' | 'svg' | 'markdown' | 'code' | 'diagram'
export type PreviewViewport = 'desktop' | 'tablet' | 'mobile'
export type PreviewMode = 'preview' | 'code'

export interface ArtifactItem {
  id: string
  sessionId: string
  title: string
  type: ArtifactType
  language?: string
  content: string
  createdAt: number
  updatedAt: number
  sourcePath?: string
}

export const $artifacts = atom<ArtifactItem[]>([])
export const $selectedArtifactId = atom<string | null>(null)
export const $previewMode = atom<PreviewMode>('preview')
export const $previewViewport = atom<PreviewViewport>('desktop')

export const $selectedArtifact = computed(
  [$artifacts, $selectedArtifactId, $activeSessionId],
  (artifacts, selectedId, activeSessionId) => {
    const sessionArtifacts = activeSessionId
      ? artifacts.filter((a) => a.sessionId === activeSessionId)
      : artifacts
    const pool = sessionArtifacts.length > 0 ? sessionArtifacts : artifacts

    if (!selectedId) return pool[0] || null
    return pool.find((a) => a.id === selectedId) || pool[0] || null
  }
)

export function registerArtifact(artifact: Omit<ArtifactItem, 'createdAt' | 'updatedAt'> & { createdAt?: number; updatedAt?: number }): ArtifactItem {
  const existingList = $artifacts.get()
  const now = Date.now()
  const existingIdx = existingList.findIndex((a) => a.id === artifact.id)

  const fullArtifact: ArtifactItem = {
    ...artifact,
    createdAt: artifact.createdAt || now,
    updatedAt: now,
  }

  if (existingIdx >= 0) {
    const updated = [...existingList]
    updated[existingIdx] = {
      ...updated[existingIdx],
      ...fullArtifact,
      updatedAt: now,
    }
    $artifacts.set(updated)
  } else {
    $artifacts.set([...existingList, fullArtifact])
  }

  // If no artifact selected, select this one
  if (!$selectedArtifactId.get()) {
    $selectedArtifactId.set(fullArtifact.id)
  }

  return fullArtifact
}

export function selectArtifact(id: string): void {
  $selectedArtifactId.set(id)
  $activeContextTab.set('preview')
  $contextPaneOpen.set(true)
}

export function clearArtifacts(): void {
  $artifacts.set([])
  $selectedArtifactId.set(null)
}

export function clearArtifactsForSession(sessionId: string): void {
  const filtered = $artifacts.get().filter((a) => a.sessionId !== sessionId)
  $artifacts.set(filtered)
  if ($selectedArtifactId.get()) {
    const stillExists = filtered.some((a) => a.id === $selectedArtifactId.get())
    if (!stillExists) {
      $selectedArtifactId.set(filtered[0]?.id || null)
    }
  }
}

/**
 * Extracts artifacts from markdown text.
 * Supports:
 * 1. :::artifact{id="..." type="..." title="..."} ... :::
 * 2. ```html artifact id="..." title="..." ... ```
 * 3. Standard ```html / ```svg blocks containing complete documents (e.g. <!DOCTYPE html> or <html... or <svg...)
 */
export function extractArtifactsFromText(text: string, sessionId: string): ArtifactItem[] {
  if (!text) return []
  const detected: ArtifactItem[] = []

  // Pattern 1: :::artifact{...} ... :::
  const directiveRegex = /:::artifact(?:\{([^}]*)\})?[\r\n]([\s\S]*?):::/g
  let match: RegExpExecArray | null
  while ((match = directiveRegex.exec(text)) !== null) {
    const rawAttrs = match[1] || ''
    const content = match[2].trim()

    const idMatch = rawAttrs.match(/id=["']([^"']+)["']/)
    const titleMatch = rawAttrs.match(/title=["']([^"']+)["']/)
    const typeMatch = rawAttrs.match(/type=["']([^"']+)["']/)

    const type = (typeMatch ? typeMatch[1].toLowerCase() : 'html') as ArtifactType
    const id = idMatch ? idMatch[1] : `art-${Date.now()}-${detected.length}`
    const title = titleMatch ? titleMatch[1] : `Artifact ${id}`

    const item = registerArtifact({
      id,
      sessionId,
      title,
      type,
      language: type === 'html' ? 'html' : type,
      content,
    })
    detected.push(item)
  }

  // Pattern 2: Fenced code blocks with artifact flag or complete HTML/SVG documents
  const fencedRegex = /```([a-z0-9_-]+)(?:[^\S\r\n]+([^\r\n]+))?\r?\n([\s\S]*?)```/gi
  while ((match = fencedRegex.exec(text)) !== null) {
    const lang = (match[1] || '').toLowerCase()
    const meta = (match[2] || '').trim()
    const content = match[3].trim()

    const isArtifactExplicit = meta.includes('artifact')
    const isCompleteHtml = lang === 'html' && (content.includes('<!DOCTYPE html>') || content.includes('<html') || content.includes('<body') || isArtifactExplicit)
    const isCompleteSvg = lang === 'svg' && (content.includes('<svg') || isArtifactExplicit)
    const isMermaid = lang === 'mermaid'

    if (isCompleteHtml || isCompleteSvg || isMermaid || isArtifactExplicit) {
      const idMatch = meta.match(/id=["']([^"']+)["']/)
      const titleMatch = meta.match(/title=["']([^"']+)["']/) || meta.match(/\[([^\]]+)\]/)

      let type: ArtifactType = 'code'
      if (isCompleteHtml) type = 'html'
      else if (isCompleteSvg) type = 'svg'
      else if (isMermaid) type = 'diagram'

      const id = idMatch ? idMatch[1] : `art-${lang}-${content.length}-${detected.length}`
      const title = titleMatch ? titleMatch[1] : `${lang.toUpperCase()} Preview`

      const item = registerArtifact({
        id,
        sessionId,
        title,
        type,
        language: lang,
        content,
      })
      detected.push(item)
    }
  }

  return detected
}
