import React, { useEffect, useState } from 'react'
import {
  X,
  Sliders,
  Cpu,
  Zap,
  Keyboard,
  Check,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Server,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { useStore } from '@nanostores/react'
import { $settingsOpen, toggleSettings } from '../../store/layoutStore'
import {
  $settings,
  $modelsCatalog,
  $activeSettingsTab,
  $isSavingSettings,
  $testingProvider,
  $providerTestResults,
  loadSettings,
  loadModelOptions,
  updateSetting,
  testProvider,
  setActiveSettingsTab,
  resetSettings,
  type SettingsTab,
} from '../../store/settingsStore'

export const SettingsModal: React.FC = () => {
  const isOpen = useStore($settingsOpen)
  const settings = useStore($settings)
  const models = useStore($modelsCatalog)
  const activeTab = useStore($activeSettingsTab)
  const isSaving = useStore($isSavingSettings)
  const testingProvider = useStore($testingProvider)
  const testResults = useStore($providerTestResults)

  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [showOpenAiKey, setShowOpenAiKey] = useState(false)
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [saveToast, setSaveToast] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadSettings()
      loadModelOptions()
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        toggleSettings()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  if (!isOpen) return null

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    { id: 'general', label: 'General', icon: <Sliders className="w-4 h-4" /> },
    { id: 'providers', label: 'Models & Providers', icon: <Cpu className="w-4 h-4" /> },
    { id: 'reasoning', label: 'Reasoning & Limits', icon: <Zap className="w-4 h-4" /> },
    { id: 'shortcuts', label: 'Shortcuts & System', icon: <Keyboard className="w-4 h-4" /> },
  ]

  const notifySaved = () => {
    setSaveToast(true)
    setTimeout(() => setSaveToast(false), 2000)
  }

  const handleTestProvider = async (provider: string, key?: string, url?: string) => {
    await testProvider(provider, key, url)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans select-none animate-in fade-in duration-150">
      <div
        className="bg-[var(--dt-card)] border border-[var(--dt-border)] rounded-[20px] shadow-2xl max-w-3xl w-full h-[580px] flex flex-col overflow-hidden select-text text-[var(--dt-foreground)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--dt-border)] bg-[var(--dt-card)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-[var(--dt-sidebar-accent)] flex items-center justify-center text-[var(--dt-primary)]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--dt-foreground)] tracking-tight">Sirona Settings</h2>
              <p className="text-[11px] text-[var(--dt-muted-foreground)]">Desktop configuration, AI model providers and environment</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saveToast && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--dt-primary)] bg-[var(--dt-sidebar-accent)] px-2.5 py-1 rounded-[6px] animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </span>
            )}
            <button
              onClick={toggleSettings}
              className="p-1.5 hover:bg-[var(--dt-sidebar-accent)] text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] rounded-[8px] transition-colors cursor-pointer"
              title="Close Settings (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Layout: Left Tab Rail + Right Settings Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Vertical Tab Rail */}
          <div className="w-52 border-r border-[var(--dt-border)] bg-[var(--dt-sidebar)] p-3 flex flex-col gap-1 shrink-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSettingsTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] font-medium transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'bg-[var(--dt-card)] text-[var(--dt-primary)] shadow-sm border border-[var(--dt-border)]'
                      : 'text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-sidebar-accent)]'
                  }`}
                >
                  <span className={isActive ? 'text-[var(--dt-primary)]' : 'text-[var(--dt-muted-foreground)]'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              )
            })}

            <div className="flex-1" />

            <button
              onClick={() => {
                if (window.confirm('Reset all settings to factory defaults?')) {
                  resetSettings()
                  notifySaved()
                }
              }}
              className="flex items-center gap-2 px-3 py-2 text-[11px] text-[var(--dt-muted-foreground)] hover:text-[var(--dt-danger)] hover:bg-[var(--dt-danger)]/10 rounded-[8px] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>
          </div>

          {/* Right Panel View */}
          <div className="flex-1 overflow-y-auto p-6 bg-[var(--dt-card-subtle)] space-y-6">
            {/* Tab 1: General */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[13px] font-semibold text-[var(--dt-foreground)] mb-1">Interface Mode</h3>
                  <p className="text-[11px] text-[var(--dt-muted-foreground)] mb-3">Choose the layout density and workspace panes.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        updateSetting('interface_mode', 'studio')
                        notifySaved()
                      }}
                      className={`p-3.5 rounded-[12px] border text-left cursor-pointer transition-all ${
                        settings.interface_mode === 'studio'
                          ? 'border-[var(--dt-primary)] bg-[var(--dt-card)] shadow-sm ring-1 ring-[var(--dt-primary)]'
                          : 'border-[var(--dt-border)] bg-[var(--dt-card)] hover:border-[var(--dt-muted-foreground)]'
                      }`}
                    >
                      <div className="font-semibold text-[13px] text-[var(--dt-foreground)] flex items-center justify-between mb-1">
                        <span>Full Studio</span>
                        {settings.interface_mode === 'studio' && <Check className="w-3.5 h-3.5 text-[var(--dt-primary)]" />}
                      </div>
                      <p className="text-[11px] text-[var(--dt-muted-foreground)] leading-relaxed">
                        Developer workspace with tabs, git review, live file tree, sandboxed previews, and terminal deck.
                      </p>
                    </button>

                    <button
                      onClick={() => {
                        updateSetting('interface_mode', 'focused')
                        notifySaved()
                      }}
                      className={`p-3.5 rounded-[12px] border text-left cursor-pointer transition-all ${
                        settings.interface_mode === 'focused'
                          ? 'border-[var(--dt-primary)] bg-[var(--dt-card)] shadow-sm ring-1 ring-[var(--dt-primary)]'
                          : 'border-[var(--dt-border)] bg-[var(--dt-card)] hover:border-[var(--dt-muted-foreground)]'
                      }`}
                    >
                      <div className="font-semibold text-[13px] text-[var(--dt-foreground)] flex items-center justify-between mb-1">
                        <span>Focused Chat</span>
                        {settings.interface_mode === 'focused' && <Check className="w-3.5 h-3.5 text-[var(--dt-primary)]" />}
                      </div>
                      <p className="text-[11px] text-[var(--dt-muted-foreground)] leading-relaxed">
                        Streamlined conversational view focused on prompts, answers, and artifacts without secondary rails.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="border-t border-[var(--dt-border)] pt-4">
                  <h3 className="text-[13px] font-semibold text-[var(--dt-foreground)] mb-1">Theme Palette</h3>
                  <div className="flex items-center gap-2 mt-2">
                    {(['light', 'dark', 'system'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          updateSetting('theme', t)
                          notifySaved()
                        }}
                        className={`px-3 py-1.5 text-[12px] font-medium capitalize rounded-[8px] border transition-colors cursor-pointer ${
                          settings.theme === t
                            ? 'bg-[var(--dt-primary)] text-white border-[var(--dt-primary)]'
                            : 'bg-[var(--dt-card)] text-[var(--dt-muted-foreground)] border-[var(--dt-border)] hover:text-[var(--dt-foreground)]'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[var(--dt-border)] pt-4 space-y-3">
                  <h3 className="text-[13px] font-semibold text-[var(--dt-foreground)]">Behavior & Features</h3>
                  <label className="flex items-center justify-between p-3 rounded-[10px] bg-[var(--dt-card)] border border-[var(--dt-border)] cursor-pointer">
                    <div>
                      <span className="text-[12px] font-medium text-[var(--dt-foreground)] block">Live Token Delta Streaming</span>
                      <span className="text-[11px] text-[var(--dt-muted-foreground)]">Stream AI response tokens as they are generated by the model</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.stream_tokens}
                      onChange={(e) => {
                        updateSetting('stream_tokens', e.target.checked)
                        notifySaved()
                      }}
                      className="w-4 h-4 rounded text-[var(--dt-primary)] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-[10px] bg-[var(--dt-card)] border border-[var(--dt-border)] cursor-pointer">
                    <div>
                      <span className="text-[12px] font-medium text-[var(--dt-foreground)] block">Auto-Open Preview Pane</span>
                      <span className="text-[11px] text-[var(--dt-muted-foreground)]">Automatically expand the right preview rail when an HTML/SVG artifact is received</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.auto_preview}
                      onChange={(e) => {
                        updateSetting('auto_preview', e.target.checked)
                        notifySaved()
                      }}
                      className="w-4 h-4 rounded text-[var(--dt-primary)] cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Tab 2: Models & Providers */}
            {activeTab === 'providers' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[13px] font-semibold text-[var(--dt-foreground)] mb-1">Active Default Model</h3>
                  <p className="text-[11px] text-[var(--dt-muted-foreground)] mb-2">Default model used for new autonomous agent sessions.</p>
                  <select
                    value={settings.default_model}
                    onChange={(e) => {
                      updateSetting('default_model', e.target.value)
                      notifySaved()
                    }}
                    className="w-full px-3 py-2 text-[12px] bg-[var(--dt-card)] border border-[var(--dt-border)] rounded-[10px] outline-none font-mono text-[var(--dt-foreground)]"
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.provider}) · {Math.round((m.context_window || 128000) / 1000)}k ctx
                      </option>
                    ))}
                  </select>
                </div>

                {/* Google Gemini Card */}
                <div className="p-4 rounded-[14px] bg-[var(--dt-card)] border border-[var(--dt-border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[var(--dt-primary)]" />
                      <span className="text-[13px] font-semibold text-[var(--dt-foreground)]">Google Gemini</span>
                    </div>
                    <button
                      type="button"
                      disabled={testingProvider === 'gemini'}
                      onClick={() => handleTestProvider('gemini', settings.gemini_api_key)}
                      className="text-[11px] font-medium text-[var(--dt-primary)] hover:underline cursor-pointer"
                    >
                      {testingProvider === 'gemini' ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showGeminiKey ? 'text' : 'password'}
                      placeholder="AIzaSy... (or inherited from GEMINI_API_KEY)"
                      value={settings.gemini_api_key || ''}
                      onChange={(e) => updateSetting('gemini_api_key', e.target.value)}
                      onBlur={notifySaved}
                      className="w-full px-3 py-2 text-[11px] font-mono bg-[var(--dt-sidebar)] border border-[var(--dt-border)] rounded-[8px] outline-none pr-9 text-[var(--dt-foreground)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute right-2.5 top-2.5 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)]"
                    >
                      {showGeminiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {testResults.gemini && (
                    <div
                      className={`text-[11px] p-2 rounded-[6px] flex items-center gap-1.5 ${
                        testResults.gemini.valid ? 'bg-[var(--dt-sidebar-accent)] text-[var(--dt-primary)]' : 'bg-[var(--dt-danger)]/10 text-[var(--dt-danger)]'
                      }`}
                    >
                      {testResults.gemini.valid ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                      <span>{testResults.gemini.message}</span>
                    </div>
                  )}
                </div>

                {/* Anthropic Card */}
                <div className="p-4 rounded-[14px] bg-[var(--dt-card)] border border-[var(--dt-border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-[var(--dt-warning)]" />
                      <span className="text-[13px] font-semibold text-[var(--dt-foreground)]">Anthropic Claude</span>
                    </div>
                    <button
                      type="button"
                      disabled={testingProvider === 'anthropic'}
                      onClick={() => handleTestProvider('anthropic', settings.anthropic_api_key)}
                      className="text-[11px] font-medium text-[var(--dt-primary)] hover:underline cursor-pointer"
                    >
                      {testingProvider === 'anthropic' ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showAnthropicKey ? 'text' : 'password'}
                      placeholder="sk-ant-... (or inherited from ANTHROPIC_API_KEY)"
                      value={settings.anthropic_api_key || ''}
                      onChange={(e) => updateSetting('anthropic_api_key', e.target.value)}
                      onBlur={notifySaved}
                      className="w-full px-3 py-2 text-[11px] font-mono bg-[var(--dt-sidebar)] border border-[var(--dt-border)] rounded-[8px] outline-none pr-9 text-[var(--dt-foreground)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                      className="absolute right-2.5 top-2.5 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)]"
                    >
                      {showAnthropicKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {testResults.anthropic && (
                    <div
                      className={`text-[11px] p-2 rounded-[6px] flex items-center gap-1.5 ${
                        testResults.anthropic.valid ? 'bg-[var(--dt-sidebar-accent)] text-[var(--dt-primary)]' : 'bg-[var(--dt-danger)]/10 text-[var(--dt-danger)]'
                      }`}
                    >
                      {testResults.anthropic.valid ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                      <span>{testResults.anthropic.message}</span>
                    </div>
                  )}
                </div>

                {/* OpenAI Card */}
                <div className="p-4 rounded-[14px] bg-[var(--dt-card)] border border-[var(--dt-border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-[#10a37f]" />
                      <span className="text-[13px] font-semibold text-[var(--dt-foreground)]">OpenAI</span>
                    </div>
                    <button
                      type="button"
                      disabled={testingProvider === 'openai'}
                      onClick={() => handleTestProvider('openai', settings.openai_api_key)}
                      className="text-[11px] font-medium text-[var(--dt-primary)] hover:underline cursor-pointer"
                    >
                      {testingProvider === 'openai' ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showOpenAiKey ? 'text' : 'password'}
                      placeholder="sk-... (or inherited from OPENAI_API_KEY)"
                      value={settings.openai_api_key || ''}
                      onChange={(e) => updateSetting('openai_api_key', e.target.value)}
                      onBlur={notifySaved}
                      className="w-full px-3 py-2 text-[11px] font-mono bg-[var(--dt-sidebar)] border border-[var(--dt-border)] rounded-[8px] outline-none pr-9 text-[var(--dt-foreground)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenAiKey(!showOpenAiKey)}
                      className="absolute right-2.5 top-2.5 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)]"
                    >
                      {showOpenAiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {testResults.openai && (
                    <div
                      className={`text-[11px] p-2 rounded-[6px] flex items-center gap-1.5 ${
                        testResults.openai.valid ? 'bg-[var(--dt-sidebar-accent)] text-[var(--dt-primary)]' : 'bg-[var(--dt-danger)]/10 text-[var(--dt-danger)]'
                      }`}
                    >
                      {testResults.openai.valid ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                      <span>{testResults.openai.message}</span>
                    </div>
                  )}
                </div>

                {/* Local Ollama Card */}
                <div className="p-4 rounded-[14px] bg-[var(--dt-card)] border border-[var(--dt-border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-[var(--dt-foreground)]" />
                      <span className="text-[13px] font-semibold text-[var(--dt-foreground)]">Local / Ollama Endpoint</span>
                    </div>
                    <button
                      type="button"
                      disabled={testingProvider === 'ollama'}
                      onClick={() => handleTestProvider('ollama', undefined, settings.ollama_base_url)}
                      className="text-[11px] font-medium text-[var(--dt-primary)] hover:underline cursor-pointer"
                    >
                      {testingProvider === 'ollama' ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="http://localhost:11434"
                    value={settings.ollama_base_url || ''}
                    onChange={(e) => updateSetting('ollama_base_url', e.target.value)}
                    onBlur={notifySaved}
                    className="w-full px-3 py-2 text-[11px] font-mono bg-[var(--dt-sidebar)] border border-[var(--dt-border)] rounded-[8px] outline-none text-[var(--dt-foreground)]"
                  />
                  {testResults.ollama && (
                    <div
                      className={`text-[11px] p-2 rounded-[6px] flex items-center gap-1.5 ${
                        testResults.ollama.valid ? 'bg-[var(--dt-sidebar-accent)] text-[var(--dt-primary)]' : 'bg-[var(--dt-danger)]/10 text-[var(--dt-danger)]'
                      }`}
                    >
                      {testResults.ollama.valid ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                      <span>{testResults.ollama.message}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Reasoning & Limits */}
            {activeTab === 'reasoning' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[13px] font-semibold text-[var(--dt-foreground)] mb-1">Default Reasoning Effort</h3>
                  <p className="text-[11px] text-[var(--dt-muted-foreground)] mb-3">Controls the depth of internal chain-of-thought exploration.</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'low', label: 'Low', desc: 'Fast, minimal internal thinking tokens' },
                      { id: 'medium', label: 'Medium', desc: 'Balanced reasoning for complex coding and debugging' },
                      { id: 'high', label: 'High', desc: 'Deep multi-step planning and exhaustive code inspection' },
                    ].map((effort) => (
                      <button
                        key={effort.id}
                        onClick={() => {
                          updateSetting('default_reasoning_effort', effort.id)
                          notifySaved()
                        }}
                        className={`p-3 rounded-[12px] border text-left cursor-pointer transition-all ${
                          settings.default_reasoning_effort === effort.id
                            ? 'border-[var(--dt-primary)] bg-[var(--dt-card)] ring-1 ring-[var(--dt-primary)] shadow-sm'
                            : 'border-[var(--dt-border)] bg-[var(--dt-card)] hover:border-[var(--dt-muted-foreground)]'
                        }`}
                      >
                        <div className="font-semibold text-[13px] text-[var(--dt-foreground)] flex items-center justify-between mb-1">
                          <span>{effort.label}</span>
                          {settings.default_reasoning_effort === effort.id && (
                            <Check className="w-3.5 h-3.5 text-[var(--dt-primary)]" />
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--dt-muted-foreground)] leading-tight">{effort.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[var(--dt-border)] pt-4">
                  <h3 className="text-[13px] font-semibold text-[var(--dt-foreground)] mb-1">Execution Safety Guardrails</h3>
                  <p className="text-[11px] text-[var(--dt-muted-foreground)] mb-3">
                    Actions marked as requires_approval pause for explicit user confirmation in the CardStack before execution.
                  </p>
                  <div className="p-3.5 bg-[var(--dt-card)] border border-[var(--dt-border)] rounded-[12px] text-[12px] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[var(--dt-foreground)]">File Modifications (write_file, edit_file)</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--dt-warning)]/15 text-[var(--dt-warning)]">
                        requires_approval
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[var(--dt-foreground)]">Shell Execution (run_shell, bash)</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--dt-warning)]/15 text-[var(--dt-warning)]">
                        requires_approval
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[var(--dt-foreground)]">Read & Inspection (read_file, git_status, tree)</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--dt-sidebar-accent)] text-[var(--dt-primary)]">
                        autonomous
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Shortcuts & System */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[13px] font-semibold text-[var(--dt-foreground)] mb-2">Global Keyboard Shortcuts</h3>
                  <div className="border border-[var(--dt-border)] rounded-[12px] bg-[var(--dt-card)] overflow-hidden text-[12px] divide-y divide-[var(--dt-border)]">
                    {[
                      { key: '⌘K / Ctrl+K', action: 'Open Command / Slash Palette' },
                      { key: '⌘B / Ctrl+B', action: 'Toggle Sidebar' },
                      { key: '⌘\\ / Ctrl+\\', action: 'Toggle Right Rail Context Pane' },
                      { key: '⌘` / Ctrl+`', action: 'Toggle Docked Terminal Deck' },
                      { key: '⌘Enter / Ctrl+Enter', action: 'Submit Composer Prompt' },
                      { key: 'Esc', action: 'Interrupt turn or dismiss active modal' },
                    ].map((sc, i) => (
                      <div key={i} className="flex items-center justify-between px-3.5 py-2">
                        <span className="text-[var(--dt-foreground)]">{sc.action}</span>
                        <kbd className="px-2 py-0.5 text-[10px] font-mono bg-[var(--dt-sidebar)] text-[var(--dt-muted-foreground)] rounded border border-[var(--dt-border)]">
                          {sc.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[var(--dt-border)] pt-4">
                  <h3 className="text-[13px] font-semibold text-[var(--dt-foreground)] mb-2">System Telemetry & Architecture</h3>
                  <div className="p-3 bg-[var(--dt-card)] border border-[var(--dt-border)] rounded-[12px] text-[11px] font-mono space-y-1.5 text-[var(--dt-muted-foreground)]">
                    <div className="flex justify-between">
                      <span>Gateway Core:</span>
                      <span className="text-[var(--dt-foreground)]">http://127.0.0.1:8000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>WebSocket Transport:</span>
                      <span className="text-[var(--dt-primary)]">JSON-RPC 2.0 (Bidirectional)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Database Engine:</span>
                      <span className="text-[var(--dt-foreground)]">SQLite WAL Mode (65-col parity)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Client Architecture:</span>
                      <span className="text-[var(--dt-foreground)]">Electron + React 19 + Nanostores</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--dt-border)] bg-[var(--dt-card)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--dt-muted-foreground)]">
            <HelpCircle className="w-3.5 h-3.5 text-[var(--dt-primary)]" />
            <span>Settings are automatically persisted to SQLite in real-time.</span>
          </div>
          <button
            onClick={toggleSettings}
            disabled={isSaving}
            className="px-4 py-1.5 text-[12px] font-medium bg-[var(--dt-primary)] text-white rounded-[8px] hover:bg-[var(--dt-primary-hover)] disabled:opacity-50 cursor-pointer transition-colors shadow-sm"
          >
            {isSaving ? 'Saving...' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  )
}
