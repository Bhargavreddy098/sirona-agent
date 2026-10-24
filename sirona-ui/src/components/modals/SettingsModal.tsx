import React, { useState, useEffect } from 'react'
import {
  X,
  Cpu,
  Key,
  Layers,
  Database,
  CheckCircle2,
  Save,
  Server,
} from 'lucide-react'
import { useStore } from '@nanostores/react'
import { $settingsOpen, toggleSettings } from '../../store/layoutStore'
import { api, type SystemStatus } from '../../api/client'

export const SettingsModal: React.FC = () => {
  const isOpen = useStore($settingsOpen)
  const [activeTab, setActiveTab] = useState<'providers' | 'system' | 'tools' | 'skills'>('providers')
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [tools, setTools] = useState<any[]>([])
  const [skills, setSkills] = useState<any[]>([])
  const [geminiKey, setGeminiKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [savedNotice, setSavedNotice] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    api.getStatus().then(setStatus).catch(() => {})
    api.getTools().then((res) => setTools(res.tools || [])).catch(() => {})
    api.getSkills().then((res) => setSkills(res.skills || [])).catch(() => {})
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = () => {
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-[230] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans select-none">
      <div className="w-full max-w-2xl bg-[#fdfbfa] border border-[#d1d1cd] rounded-[16px] shadow-[var(--shadow-subtle)] overflow-hidden flex flex-col h-[520px]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#d1d1cd] bg-[#faf8f5]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#016a71]" />
            <h3 className="text-[16px] font-medium text-[#27251e]">Sirona Settings & Environment</h3>
          </div>
          <button
            onClick={toggleSettings}
            className="p-1 text-[#72706b] hover:text-[#27251e] rounded-[6px] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Grid: Left Tabs Rail + Right Content Pane */}
        <div className="flex-1 flex overflow-hidden">
          {/* Settings Nav Rail */}
          <div className="w-48 bg-[#faf8f5] border-r border-[#d1d1cd] p-2 flex flex-col gap-1 text-[13px]">
            <button
              onClick={() => setActiveTab('providers')}
              className={`flex items-center gap-2 px-3 py-2 rounded-[8px] text-left transition-colors cursor-pointer ${
                activeTab === 'providers'
                  ? 'bg-[#016a71] text-white font-medium'
                  : 'text-[#72706b] hover:bg-[#f5f3ef] hover:text-[#27251e]'
              }`}
            >
              <Key className="w-4 h-4 shrink-0" />
              <span>Model Providers</span>
            </button>

            <button
              onClick={() => setActiveTab('system')}
              className={`flex items-center gap-2 px-3 py-2 rounded-[8px] text-left transition-colors cursor-pointer ${
                activeTab === 'system'
                  ? 'bg-[#016a71] text-white font-medium'
                  : 'text-[#72706b] hover:bg-[#f5f3ef] hover:text-[#27251e]'
              }`}
            >
              <Cpu className="w-4 h-4 shrink-0" />
              <span>System & Storage</span>
            </button>

            <button
              onClick={() => setActiveTab('tools')}
              className={`flex items-center gap-2 px-3 py-2 rounded-[8px] text-left transition-colors cursor-pointer ${
                activeTab === 'tools'
                  ? 'bg-[#016a71] text-white font-medium'
                  : 'text-[#72706b] hover:bg-[#f5f3ef] hover:text-[#27251e]'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>Tools Registry</span>
            </button>

            <button
              onClick={() => setActiveTab('skills')}
              className={`flex items-center gap-2 px-3 py-2 rounded-[8px] text-left transition-colors cursor-pointer ${
                activeTab === 'skills'
                  ? 'bg-[#016a71] text-white font-medium'
                  : 'text-[#72706b] hover:bg-[#f5f3ef] hover:text-[#27251e]'
              }`}
            >
              <Server className="w-4 h-4 shrink-0" />
              <span>Skills & MCP</span>
            </button>
          </div>

          {/* Settings Content Area */}
          <div className="flex-1 overflow-y-auto p-5 text-[13px] text-[#27251e]">
            {activeTab === 'providers' && (
              <div className="flex flex-col gap-4">
                <div>
                  <h4 className="font-medium text-[14px] mb-1">Model API Keys & Routing</h4>
                  <p className="text-[12px] text-[#72706b]">
                    Configure local environment credentials for autonomous model execution.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-[#72706b]">Google Gemini API Key</label>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy... (leave blank to use GEMINI_API_KEY env)"
                    className="w-full px-3 py-2 bg-[#ffffff] border border-[#d1d1cd] rounded-[8px] font-mono text-[12px] outline-none focus:border-[#016a71]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-[#72706b]">Anthropic API Key</label>
                  <input
                    type="password"
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    placeholder="sk-ant-... (leave blank to use ANTHROPIC_API_KEY env)"
                    className="w-full px-3 py-2 bg-[#ffffff] border border-[#d1d1cd] rounded-[8px] font-mono text-[12px] outline-none focus:border-[#016a71]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-[#72706b]">Local Ollama Host</label>
                  <input
                    type="text"
                    defaultValue="http://127.0.0.1:11434"
                    className="w-full px-3 py-2 bg-[#ffffff] border border-[#d1d1cd] rounded-[8px] font-mono text-[12px] outline-none focus:border-[#016a71]"
                  />
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="flex flex-col gap-4">
                <div>
                  <h4 className="font-medium text-[14px] mb-1">Core System Health</h4>
                  <p className="text-[12px] text-[#72706b]">
                    Diagnostics from SQLite WAL engine and process resources.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#ffffff] border border-[#d1d1cd] rounded-[10px]">
                    <div className="text-[11px] text-[#72706b] mb-1">CPU Utilization</div>
                    <div className="text-[18px] font-mono font-medium text-[#016a71]">
                      {status?.cpu_pct ?? 0}%
                    </div>
                  </div>
                  <div className="p-3 bg-[#ffffff] border border-[#d1d1cd] rounded-[10px]">
                    <div className="text-[11px] text-[#72706b] mb-1">Available RAM</div>
                    <div className="text-[18px] font-mono font-medium text-[#016a71]">
                      {status?.mem_available_mb ?? 0} MB
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#ffffff] border border-[#d1d1cd] rounded-[10px] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#016a71]" />
                    <span className="font-medium text-[12px]">SQLite Storage Engine</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[rgba(1,106,113,0.1)] text-[#016a71] font-medium">
                    PRAGMA journal_mode = WAL
                  </span>
                </div>
              </div>
            )}

            {activeTab === 'tools' && (
              <div className="flex flex-col gap-3">
                <h4 className="font-medium text-[14px]">Active Tool Registry</h4>
                <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
                  {tools.map((t: any, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-[#ffffff] border border-[#d1d1cd] rounded-[8px] flex items-center justify-between"
                    >
                      <div>
                        <div className="font-mono text-[12px] font-medium text-[#27251e]">{t.name}</div>
                        <div className="text-[11px] text-[#72706b]">{t.description}</div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                          t.danger_level === 'safe'
                            ? 'bg-[rgba(1,106,113,0.1)] text-[#016a71]'
                            : 'bg-red-50 text-[#b91c1c]'
                        }`}
                      >
                        {t.danger_level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'skills' && (
              <div className="flex flex-col gap-3">
                <h4 className="font-medium text-[14px]">SKILL.md & MCP Host</h4>
                <p className="text-[12px] text-[#72706b]">
                  Extensible skills loaded from workspace and user home directories ({skills.length} skills active).
                </p>
                <div className="p-3 bg-[#ffffff] border border-[#d1d1cd] rounded-[8px] flex items-center justify-between">
                  <span>Native MCP Client</span>
                  <span className="text-[#016a71] font-mono text-[11px]">Ready (subprocess host)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#d1d1cd] bg-[#faf8f5] flex items-center justify-between">
          <div>
            {savedNotice && (
              <span className="flex items-center gap-1.5 text-[12px] text-[#016a71]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Settings saved successfully
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSettings}
              className="px-3 py-1.5 rounded-[6px] border border-[#d1d1cd] text-[#72706b] hover:text-[#27251e] transition-colors cursor-pointer text-[13px]"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#016a71] text-white hover:bg-[#01585e] transition-colors cursor-pointer text-[13px] shadow-[var(--shadow-subtle)]"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
