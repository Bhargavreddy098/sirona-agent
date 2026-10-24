import { describe, it, expect, beforeEach } from 'vitest'
import {
  $artifacts,
  $selectedArtifactId,
  $selectedArtifact,
  registerArtifact,
  selectArtifact,
  clearArtifacts,
  clearArtifactsForSession,
  extractArtifactsFromText,
} from '../store/artifactStore'
import { $activeContextTab, $contextPaneOpen } from '../store/layoutStore'
import { $activeSessionId } from '../store/sessionStore'

describe('Stage 6: Artifacts & HTML Preview System', () => {
  const sessionId = 'session-art-1'

  beforeEach(() => {
    clearArtifacts()
    $activeSessionId.set(sessionId)
    $activeContextTab.set('files')
    $contextPaneOpen.set(false)
  })

  it('registers an artifact and defaults selection', () => {
    const art = registerArtifact({
      id: 'dash-1',
      sessionId,
      title: 'Metrics Overview',
      type: 'html',
      content: '<h1>Hello World</h1>',
    })

    expect(art.id).toBe('dash-1')
    expect($artifacts.get()).toHaveLength(1)
    expect($selectedArtifactId.get()).toBe('dash-1')
    expect($selectedArtifact.get()?.title).toBe('Metrics Overview')
    expect($selectedArtifact.get()?.content).toBe('<h1>Hello World</h1>')
  })

  it('updates existing artifact on re-register', () => {
    registerArtifact({
      id: 'dash-1',
      sessionId,
      title: 'Metrics Overview',
      type: 'html',
      content: '<h1>V1</h1>',
    })

    registerArtifact({
      id: 'dash-1',
      sessionId,
      title: 'Metrics Overview V2',
      type: 'html',
      content: '<h1>V2</h1>',
    })

    expect($artifacts.get()).toHaveLength(1)
    expect($selectedArtifact.get()?.title).toBe('Metrics Overview V2')
    expect($selectedArtifact.get()?.content).toBe('<h1>V2</h1>')
  })

  it('selectArtifact switches context tab to preview and opens context pane', () => {
    registerArtifact({
      id: 'dash-1',
      sessionId,
      title: 'Metrics Overview',
      type: 'html',
      content: '<h1>V1</h1>',
    })
    registerArtifact({
      id: 'dash-2',
      sessionId,
      title: 'Logs Viewer',
      type: 'code',
      content: 'console.log("ready")',
    })

    expect($contextPaneOpen.get()).toBe(false)
    expect($activeContextTab.get()).toBe('files')

    selectArtifact('dash-2')

    expect($selectedArtifactId.get()).toBe('dash-2')
    expect($activeContextTab.get()).toBe('preview')
    expect($contextPaneOpen.get()).toBe(true)
    expect($selectedArtifact.get()?.id).toBe('dash-2')
  })

  it('extracts artifacts from canonical :::artifact directives', () => {
    const markdown = `
Here is the dashboard you requested:

:::artifact{id="custom-dash" type="html" title="Custom Dashboard"}
<!DOCTYPE html>
<html>
  <body><h3>Interactive App</h3></body>
</html>
:::

Let me know if you want modifications.
`
    const extracted = extractArtifactsFromText(markdown, sessionId)

    expect(extracted).toHaveLength(1)
    expect(extracted[0].id).toBe('custom-dash')
    expect(extracted[0].title).toBe('Custom Dashboard')
    expect(extracted[0].type).toBe('html')
    expect(extracted[0].content).toContain('Interactive App')
    expect($artifacts.get()).toHaveLength(1)
  })

  it('extracts artifacts from complete HTML code blocks', () => {
    const markdown = `
\`\`\`html [title="Landing Page Preview"]
<!DOCTYPE html>
<html>
  <head><title>Test</title></head>
  <body><h1>Welcome</h1></body>
</html>
\`\`\`
`
    const extracted = extractArtifactsFromText(markdown, sessionId)

    expect(extracted).toHaveLength(1)
    expect(extracted[0].type).toBe('html')
    expect(extracted[0].title).toBe('Landing Page Preview')
    expect(extracted[0].content).toContain('Welcome')
  })

  it('extracts artifacts from SVG code blocks', () => {
    const markdown = `
\`\`\`svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="teal" />
</svg>
\`\`\`
`
    const extracted = extractArtifactsFromText(markdown, sessionId)

    expect(extracted).toHaveLength(1)
    expect(extracted[0].type).toBe('svg')
    expect(extracted[0].content).toContain('<circle')
  })

  it('clears artifacts for specific session', () => {
    registerArtifact({
      id: 'sess1-art',
      sessionId: 'session-1',
      title: 'S1',
      type: 'html',
      content: '1',
    })
    registerArtifact({
      id: 'sess2-art',
      sessionId: 'session-2',
      title: 'S2',
      type: 'html',
      content: '2',
    })

    expect($artifacts.get()).toHaveLength(2)

    clearArtifactsForSession('session-1')

    expect($artifacts.get()).toHaveLength(1)
    expect($artifacts.get()[0].id).toBe('sess2-art')
  })
})
