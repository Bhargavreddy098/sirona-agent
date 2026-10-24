export interface WindowState {
  isMaximized: boolean
  isFullScreen: boolean
  isFocused: boolean
  isMinimized?: boolean
}

export interface ZoomInfo {
  level: number
  percent: number
}

export interface FileFilter {
  name: string
  extensions: string[]
}

export interface OpenDialogOptions {
  title?: string
  defaultPath?: string
  buttonLabel?: string
  filters?: FileFilter[]
  properties?: Array<
    | 'openFile'
    | 'openDirectory'
    | 'multiSelections'
    | 'showHiddenFiles'
    | 'createDirectory'
    | 'promptToCreate'
    | 'noResolveAliases'
    | 'treatPackageAsDirectory'
    | 'dontAddToRecent'
  >
}

export interface OpenDialogReturnValue {
  canceled: boolean
  filePaths: string[]
}

export interface SaveDialogOptions {
  title?: string
  defaultPath?: string
  buttonLabel?: string
  filters?: FileFilter[]
}

export interface SaveDialogReturnValue {
  canceled: boolean
  filePath?: string
}

export interface SaveTextFileRequest {
  title?: string
  defaultPath?: string
  content?: string
}

export interface SaveTextFileResponse {
  success: boolean
  filePath?: string
  canceled?: boolean
}

export interface BackendStatus {
  isHealthy: boolean
  port: number
}

export interface VersionInfo {
  version: string
  electron: string
  chrome: string
  node: string
  platform: string
}

export interface MachineProfile {
  platform: string
  arch: string
  release: string
  cpus: number
  totalMemoryMb: number
}

export interface FindInPageResult {
  requestId: number
  activeMatchOrdinal: number
  matches: number
  selectionArea: { x: number; y: number; width: number; height: number }
  finalUpdate: boolean
}

export interface SironaDesktopApi {
  isElectron: boolean
  platform: NodeJS.Platform
  version: string
  glassSupported: boolean
  translucencySupported: boolean
  localModelsEnabled?: boolean
  assumeFreshInstall?: boolean

  windowControls: {
    custom: boolean
    minimize: () => void
    toggleMaximize: () => void
    close: () => void
  }

  zoom: {
    get: () => Promise<ZoomInfo>
    factor: () => number
    setPercent: (percent: number) => void
    onChanged: (callback: (info: ZoomInfo) => void) => () => void
  }

  openExternal: (url: string) => Promise<boolean>

  showOpenDialog: (options?: OpenDialogOptions) => Promise<OpenDialogReturnValue>
  selectPaths: (options?: OpenDialogOptions) => Promise<OpenDialogReturnValue>
  showSaveDialog: (options?: SaveDialogOptions) => Promise<SaveDialogReturnValue>
  selectSavePath: (options?: SaveDialogOptions) => Promise<SaveDialogReturnValue>
  saveTextFileAs: (request: SaveTextFileRequest) => Promise<SaveTextFileResponse>
  readFileText: (filePath: string) => Promise<string>

  writeClipboard: (text: string) => Promise<boolean>
  readClipboard: () => Promise<string>

  findInPage: (query: string, options?: Electron.FindInPageOptions) => Promise<number>
  stopFindInPage: (action?: 'clearSelection' | 'keepSelection' | 'activateSelection') => Promise<void>
  onFoundInPage: (callback: (result: FindInPageResult) => void) => () => void

  onWindowStateChanged: (callback: (state: WindowState) => void) => () => void

  getBackendStatus: () => Promise<BackendStatus>
  restartBackend: () => Promise<{ success: boolean }>

  getVersion: () => Promise<VersionInfo>
  getMachineProfile: () => Promise<MachineProfile>
}

declare global {
  interface Window {
    sironaDesktop?: SironaDesktopApi
    hermesDesktop?: SironaDesktopApi
  }
}
