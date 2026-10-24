import { atom } from 'nanostores'
import { api, type DesktopSettings } from '../api/client'

export type SettingsTab = 'general' | 'providers' | 'reasoning' | 'shortcuts'

export const DEFAULT_SETTINGS: DesktopSettings = {
  theme: 'light',
  interface_mode: 'studio',
  default_model: 'gemini-2.5-flash',
  default_reasoning_effort: 'medium',
  auto_preview: true,
  stream_tokens: true,
  sound_enabled: false,
  gemini_api_key: '',
  openai_api_key: '',
  anthropic_api_key: '',
  ollama_base_url: 'http://localhost:11434',
}

export interface ModelOption {
  id: string
  provider: string
  name: string
  context_window?: number
}

export const $settings = atom<DesktopSettings>(DEFAULT_SETTINGS)
export const $modelsCatalog = atom<ModelOption[]>([
  { id: 'gemini-2.5-flash', provider: 'gemini', name: 'Gemini 2.5 Flash', context_window: 1_048_576 },
  { id: 'gemini-2.5-pro', provider: 'gemini', name: 'Gemini 2.5 Pro', context_window: 2_097_152 },
  { id: 'claude-3-5-sonnet', provider: 'anthropic', name: 'Claude 3.5 Sonnet', context_window: 200_000 },
  { id: 'claude-3-7-sonnet', provider: 'anthropic', name: 'Claude 3.7 Sonnet', context_window: 200_000 },
  { id: 'gpt-4o', provider: 'openai', name: 'GPT-4o', context_window: 128_000 },
  { id: 'o3-mini', provider: 'openai', name: 'o3-mini', context_window: 200_000 },
  { id: 'ollama/llama3.3', provider: 'ollama', name: 'Ollama Llama 3.3', context_window: 128_000 },
])

export const $activeSettingsTab = atom<SettingsTab>('general')
export const $isSavingSettings = atom<boolean>(false)
export const $testingProvider = atom<string | null>(null)
export const $providerTestResults = atom<Record<string, { valid: boolean; message: string }>>({})

export async function loadSettings(): Promise<DesktopSettings> {
  try {
    const res = await api.getSettings()
    if (res && res.settings) {
      $settings.set(res.settings)
      return res.settings
    }
  } catch (err) {
    console.warn('[SettingsStore] Failed to load settings:', err)
  }
  return $settings.get()
}

export async function loadModelOptions(): Promise<ModelOption[]> {
  try {
    const res = await api.getModelOptions()
    if (res && res.models && res.models.length > 0) {
      $modelsCatalog.set(res.models)
      return res.models
    }
  } catch (err) {
    console.warn('[SettingsStore] Failed to load model options:', err)
  }
  return $modelsCatalog.get()
}

export async function updateSetting<K extends keyof DesktopSettings>(
  key: K,
  value: DesktopSettings[K]
): Promise<void> {
  const current = $settings.get()
  const updated = { ...current, [key]: value }
  $settings.set(updated)

  try {
    await api.saveSingleSetting(String(key), value)
  } catch (err) {
    console.error(`[SettingsStore] Failed to save setting ${String(key)}:`, err)
  }
}

export async function saveAllSettings(updates: Partial<DesktopSettings>): Promise<boolean> {
  $isSavingSettings.set(true)
  const current = $settings.get()
  const merged = { ...current, ...updates }
  $settings.set(merged)

  try {
    const res = await api.saveSettings(updates)
    return res.success
  } catch (err) {
    console.error('[SettingsStore] Failed to batch save settings:', err)
    return false
  } finally {
    $isSavingSettings.set(false)
  }
}

export async function testProvider(
  provider: string,
  apiKey?: string,
  baseUrl?: string
): Promise<{ valid: boolean; message: string }> {
  $testingProvider.set(provider)
  try {
    const res = await api.testProvider(provider, apiKey, baseUrl)
    const result = { valid: res.valid, message: res.message }
    $providerTestResults.set({
      ...$providerTestResults.get(),
      [provider]: result,
    })
    return result
  } catch (err) {
    const result = { valid: false, message: `Test failed: ${String(err)}` }
    $providerTestResults.set({
      ...$providerTestResults.get(),
      [provider]: result,
    })
    return result
  } finally {
    $testingProvider.set(null)
  }
}

export function setActiveSettingsTab(tab: SettingsTab): void {
  $activeSettingsTab.set(tab)
}

export async function resetSettings(): Promise<void> {
  $settings.set({ ...DEFAULT_SETTINGS })
  $providerTestResults.set({})
  try {
    await api.saveSettings(DEFAULT_SETTINGS)
  } catch (err) {
    console.error('[SettingsStore] Failed to reset settings:', err)
  }
}
