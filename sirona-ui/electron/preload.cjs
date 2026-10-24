const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('sironaDesktop', {
  isElectron: true,
  platform: process.platform,
  version: '0.1.0',
  openExternal: (url) => ipcRenderer.invoke('sirona:open-external', url),
  showOpenDialog: (options) => ipcRenderer.invoke('sirona:show-open-dialog', options),
  getBackendStatus: () => ipcRenderer.invoke('sirona:get-backend-status'),
  restartBackend: () => ipcRenderer.invoke('sirona:restart-backend'),
})
