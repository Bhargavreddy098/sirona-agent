import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  $settings,
  $modelsCatalog,
  $activeSettingsTab,
  $providerTestResults,
  DEFAULT_SETTINGS,
  loadSettings,
  loadModelOptions,
  updateSetting,
  saveAllSettings,
  testProvider,
  setActiveSettingsTab,
  resetSettings,
} from '../store/settingsStore'
import { api } from '../api/client'

vi.mock('../api/client', () => ({
  api: {
    getSettings: vi.fn(),
    getModelOptions: vi.fn(),
    saveSettings: vi.fn(),
    saveSingleSetting: vi.fn(),
    deleteSetting: vi.fn(),
    testProvider: vi.fn(),
  },
}))

describe('settingsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    $settings.set({ ...DEFAULT_SETTINGS })
    $providerTestResults.set({})
    $activeSettingsTab.set('general')
  })

  it('loads settings and populates atom', async () => {
    vi.mocked(api.getSettings).mockResolvedValue({
      settings: {
        ...DEFAULT_SETTINGS,
        theme: 'dark',
        default_model: 'claude-3-5-sonnet',
      },
    })

    const loaded = await loadSettings()
    expect(loaded.theme).toBe('dark')
    expect(loaded.default_model).toBe('claude-3-5-sonnet')
    expect($settings.get().theme).toBe('dark')
  })

  it('loads model options and populates catalog', async () => {
    vi.mocked(api.getModelOptions).mockResolvedValue({
      models: [
        { id: 'custom-model-1', provider: 'custom', name: 'Custom Model 1' },
      ],
      reasoning_efforts: ['low', 'medium'],
    })

    const models = await loadModelOptions()
    expect(models.length).toBe(1)
    expect(models[0].id).toBe('custom-model-1')
    expect($modelsCatalog.get()[0].id).toBe('custom-model-1')
  })

  it('optimistically updates setting and saves single setting to backend', async () => {
    vi.mocked(api.saveSingleSetting).mockResolvedValue({
      success: true,
      key: 'interface_mode',
      value: 'focused',
    })

    await updateSetting('interface_mode', 'focused')
    expect($settings.get().interface_mode).toBe('focused')
    expect(api.saveSingleSetting).toHaveBeenCalledWith('interface_mode', 'focused')
  })

  it('saves batch settings and updates state', async () => {
    vi.mocked(api.saveSettings).mockResolvedValue({
      success: true,
      saved_keys: ['theme', 'stream_tokens'],
    })

    const res = await saveAllSettings({ theme: 'system', stream_tokens: false })
    expect(res).toBe(true)
    expect($settings.get().theme).toBe('system')
    expect($settings.get().stream_tokens).toBe(false)
  })

  it('tests provider connection and stores result', async () => {
    vi.mocked(api.testProvider).mockResolvedValue({
      valid: true,
      provider: 'gemini',
      message: 'Gemini API verified',
    })

    const result = await testProvider('gemini', 'AIzaSyTestKey1234567890')
    expect(result.valid).toBe(true)
    expect($providerTestResults.get().gemini?.valid).toBe(true)
    expect($providerTestResults.get().gemini?.message).toBe('Gemini API verified')
  })

  it('switches active settings tab and resets settings', async () => {
    setActiveSettingsTab('providers')
    expect($activeSettingsTab.get()).toBe('providers')

    setActiveSettingsTab('reasoning')
    expect($activeSettingsTab.get()).toBe('reasoning')

    vi.mocked(api.saveSettings).mockResolvedValue({
      success: true,
      saved_keys: Object.keys(DEFAULT_SETTINGS),
    })

    // Modify setting, then reset
    $settings.set({ ...DEFAULT_SETTINGS, theme: 'dark' })
    expect($settings.get().theme).toBe('dark')

    await resetSettings()
    expect($settings.get().theme).toBe('light')
  })
})
