const { contextBridge, ipcRenderer, webFrame } = require('electron')

// Query translucency and feature flags synchronously before first paint
const translucencySupport = ipcRenderer.sendSync('sirona:translucency:support')
const launchFlags = ipcRenderer.sendSync('sirona:feature-flags')

function customWindowControlsEnabled() {
  if (process.platform !== 'linux') {
    return false
  }
  const env = process.env
  return Boolean(env.WSL_DISTRO_NAME || env.WSL_INTEROP)
}

const sironaDesktopApi = {
  isElectron: true,
  platform: process.platform,
  version: '0.1.0',
  glassSupported: translucencySupport?.glass === true,
  translucencySupported: translucencySupport?.translucency === true,
  localModelsEnabled: launchFlags?.localModels === true,
  assumeFreshInstall: launchFlags?.assumeFreshInstall === true,

  // Window Controls
  windowControls: {
    custom: customWindowControlsEnabled(),
    minimize: () => ipcRenderer.send('sirona:window-control', 'minimize'),
    toggleMaximize: () => ipcRenderer.send('sirona:window-control', 'toggle-maximize'),
    close: () => ipcRenderer.send('sirona:window-control', 'close'),
  },

  // Zoom Controls
  zoom: {
    get: () => ipcRenderer.invoke('sirona:zoom:get'),
    factor: () => webFrame.getZoomFactor(),
    setPercent: (percent) => ipcRenderer.send('sirona:zoom:set-percent', percent),
    onChanged: (callback) => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('sirona:zoom:changed', listener)
      return () => ipcRenderer.removeListener('sirona:zoom:changed', listener)
    },
  },

  // Navigation & External links
  openExternal: (url) => ipcRenderer.invoke('sirona:open-external', url),

  // File system & Dialogs
  showOpenDialog: (options) => ipcRenderer.invoke('sirona:show-open-dialog', options),
  selectPaths: (options) => ipcRenderer.invoke('sirona:show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('sirona:show-save-dialog', options),
  selectSavePath: (options) => ipcRenderer.invoke('sirona:show-save-dialog', options),
  saveTextFileAs: (request) => ipcRenderer.invoke('sirona:save-text-file-as', request),
  readFileText: (filePath) => ipcRenderer.invoke('sirona:read-file-text', filePath),

  // Clipboard
  writeClipboard: (text) => ipcRenderer.invoke('sirona:write-clipboard', text),
  readClipboard: () => ipcRenderer.invoke('sirona:read-clipboard'),

  // Find in page
  findInPage: (query, options) => ipcRenderer.invoke('sirona:find-in-page', query, options),
  stopFindInPage: (action) => ipcRenderer.invoke('sirona:stop-find-in-page', action),
  onFoundInPage: (callback) => {
    const listener = (_event, result) => callback(result)
    ipcRenderer.on('sirona:found-in-page', listener)
    return () => ipcRenderer.removeListener('sirona:found-in-page', listener)
  },

  // Window state listener
  onWindowStateChanged: (callback) => {
    const listener = (_event, state) => callback(state)
    ipcRenderer.on('sirona:window-state-changed', listener)
    return () => ipcRenderer.removeListener('sirona:window-state-changed', listener)
  },

  // Backend Process Lifecycle
  getBackendStatus: () => ipcRenderer.invoke('sirona:get-backend-status'),
  restartBackend: () => ipcRenderer.invoke('sirona:restart-backend'),

  // System & Environment Info
  getVersion: () => ipcRenderer.invoke('sirona:version'),
  getMachineProfile: () => ipcRenderer.invoke('sirona:machine-profile'),
}

// Hermes Desktop Compatibility Alias (ensures any Hermes components/hooks function without edits)
const hermesDesktopApi = {
  ...sironaDesktopApi,
  windowControls: {
    custom: customWindowControlsEnabled(),
    minimize: () => ipcRenderer.send('hermes:window-control', 'minimize'),
    toggleMaximize: () => ipcRenderer.send('hermes:window-control', 'toggle-maximize'),
    close: () => ipcRenderer.send('hermes:window-control', 'close'),
  },
  zoom: {
    get: () => ipcRenderer.invoke('hermes:zoom:get'),
    factor: () => webFrame.getZoomFactor(),
    setPercent: (percent) => ipcRenderer.send('hermes:zoom:set-percent', percent),
    onChanged: (callback) => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('hermes:zoom:changed', listener)
      return () => ipcRenderer.removeListener('hermes:zoom:changed', listener)
    },
  },
  openExternal: (url) => ipcRenderer.invoke('hermes:openExternal', url),
  selectPaths: (options) => ipcRenderer.invoke('hermes:selectPaths', options),
  selectSavePath: (options) => ipcRenderer.invoke('hermes:selectSavePath', options),
  saveTextFileAs: (request) => ipcRenderer.invoke('hermes:saveTextFileAs', request),
  readFileText: (filePath) => ipcRenderer.invoke('hermes:readFileText', filePath),
  writeClipboard: (text) => ipcRenderer.invoke('hermes:writeClipboard', text),
  readClipboard: () => ipcRenderer.invoke('hermes:readClipboard'),
  findInPage: (query, options) => ipcRenderer.invoke('hermes:find-in-page', query, options),
  stopFindInPage: (action) => ipcRenderer.invoke('hermes:stop-find-in-page', action),
  onFoundInPage: (callback) => {
    const listener = (_event, result) => callback(result)
    ipcRenderer.on('hermes:found-in-page', listener)
    return () => ipcRenderer.removeListener('hermes:found-in-page', listener)
  },
  onWindowStateChanged: (callback) => {
    const listener = (_event, state) => callback(state)
    ipcRenderer.on('hermes:window-state-changed', listener)
    return () => ipcRenderer.removeListener('hermes:window-state-changed', listener)
  },
  getVersion: () => ipcRenderer.invoke('hermes:version'),
  getMachineProfile: () => ipcRenderer.invoke('hermes:machine:profile'),
}

contextBridge.exposeInMainWorld('sironaDesktop', sironaDesktopApi)
contextBridge.exposeInMainWorld('hermesDesktop', hermesDesktopApi)
