const { app, BrowserWindow, Menu, ipcMain, shell, dialog, clipboard } = require('electron')
const path = require('path')
const http = require('http')
const fs = require('fs')
const os = require('os')
const { spawn } = require('child_process')

// Configure single instance & isolated userData to prevent cache lock conflicts
app.name = 'sirona'
const userDataPath = path.join(app.getPath('appData'), 'sirona-desktop')
try {
  fs.mkdirSync(userDataPath, { recursive: true })
  app.setPath('userData', userDataPath)
} catch (e) {
  // Ignore folder creation race
}

// Disable HTTP and GPU shader disk caches to avoid Windows file locks
app.commandLine.appendSwitch('disable-http-cache')
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
app.commandLine.appendSwitch('disable-gpu-program-cache')

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  console.log('[Sirona Electron] Another instance is already running. Exiting.')
  app.quit()
  process.exit(0)
}

let mainWindow = null
let backendProcess = null
const BACKEND_PORT = 8000
const DEV_URLS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
]

function checkHttp(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400)
    })
    req.on('error', () => resolve(false))
    req.setTimeout(800, () => {
      req.destroy()
      resolve(false)
    })
  })
}

function detectTranslucencySupport() {
  const platform = process.platform
  const release = os.release()
  if (platform === 'darwin') {
    return { glass: true, translucency: true }
  }
  if (platform === 'win32') {
    const parts = release.split('.')
    const build = parseInt(parts[2] || '0', 10)
    return {
      glass: build >= 22000,
      translucency: build >= 10240,
    }
  }
  return { glass: false, translucency: false }
}

function isSafeExternalUrl(url) {
  if (!url || typeof url !== 'string') return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

async function ensureBackendRunning() {
  const isAlive = await checkHttp(`http://127.0.0.1:${BACKEND_PORT}/health`)
  if (isAlive) {
    console.log('[Sirona Electron] Backend is already active on port 8000.')
    return
  }

  const projectRoot = path.resolve(__dirname, '../..')
  const pythonExe = path.join(projectRoot, 'sirona-core', '.venv', 'Scripts', 'python.exe')
  const coreDir = path.join(projectRoot, 'sirona-core')

  if (fs.existsSync(pythonExe)) {
    console.log('[Sirona Electron] Launching Sirona Core Backend process...')
    backendProcess = spawn(
      pythonExe,
      ['-m', 'sirona.cli', 'serve', '--host', '127.0.0.1', '--port', String(BACKEND_PORT)],
      {
        cwd: coreDir,
        env: {
          ...process.env,
          PYTHONPATH: coreDir,
        },
        stdio: 'pipe',
      }
    )

    backendProcess.stdout?.on('data', (d) => {
      console.log(`[Sirona Core] ${d.toString().trim()}`)
    })

    backendProcess.stderr?.on('data', (d) => {
      console.error(`[Sirona Core ERR] ${d.toString().trim()}`)
    })

    backendProcess.on('exit', (code) => {
      console.log(`[Sirona Electron] Backend process exited with code ${code}`)
      backendProcess = null
    })

    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 400))
      if (await checkHttp(`http://127.0.0.1:${BACKEND_PORT}/health`)) {
        console.log('[Sirona Electron] Backend startup verified healthy.')
        return
      }
    }
  } else {
    console.log('[Sirona Electron] Python virtualenv not found at expected path; backend spawn deferred.')
  }
}

async function resolveAppUrl() {
  // If not explicitly launched in dev mode, prefer the built production dist bundle
  const isDevMode = process.argv.includes('--dev') || Boolean(process.env.ELECTRON_DEV)
  if (!isDevMode) {
    const distPath = path.join(__dirname, '../dist/index.html')
    if (fs.existsSync(distPath)) {
      return null
    }
  }

  for (const url of DEV_URLS) {
    if (await checkHttp(url)) {
      return url
    }
  }
  return null
}

function broadcastWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const state = {
    isMaximized: mainWindow.isMaximized(),
    isFullScreen: mainWindow.isFullScreen(),
    isFocused: mainWindow.isFocused(),
    isMinimized: mainWindow.isMinimized(),
  }
  mainWindow.webContents.send('sirona:window-state-changed', state)
  mainWindow.webContents.send('hermes:window-state-changed', state)
}

function performWindowControl(action) {
  if (!mainWindow || mainWindow.isDestroyed()) return false
  if (action === 'minimize') {
    mainWindow.minimize()
    return true
  }
  if (action === 'toggle-maximize') {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
    return true
  }
  if (action === 'close') {
    mainWindow.close()
    return true
  }
  return false
}

async function createWindow() {
  await ensureBackendRunning()

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    title: 'Sirona',
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, '../public/icon.svg'),
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: true,
    },
  })

  // Prevent navigation to unsafe or unhandled URLs and deny new window opens
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      shell.openExternal(url).catch((err) => console.error('[Sirona] openExternal error:', err))
    }
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentUrl = mainWindow.webContents.getURL()
    if (url !== currentUrl && isSafeExternalUrl(url)) {
      event.preventDefault()
      shell.openExternal(url).catch((err) => console.error('[Sirona] openExternal error:', err))
    }
  })

  // Window state event listeners
  mainWindow.on('maximize', broadcastWindowState)
  mainWindow.on('unmaximize', broadcastWindowState)
  mainWindow.on('enter-full-screen', broadcastWindowState)
  mainWindow.on('leave-full-screen', broadcastWindowState)
  mainWindow.on('focus', broadcastWindowState)
  mainWindow.on('blur', broadcastWindowState)

  // Find-in-page listener
  mainWindow.webContents.on('found-in-page', (_event, result) => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.webContents.send('sirona:found-in-page', result)
    mainWindow.webContents.send('hermes:found-in-page', result)
  })

  const devUrl = await resolveAppUrl()
  if (devUrl) {
    console.log(`[Sirona Electron] Connecting to dev server: ${devUrl}`)
    mainWindow.loadURL(devUrl)
  } else {
    const distPath = path.join(__dirname, '../dist/index.html')
    console.log(`[Sirona Electron] Loading built production app: ${distPath}`)
    mainWindow.loadFile(distPath)
  }

  buildApplicationMenu()

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

function buildApplicationMenu() {
  const isMac = process.platform === 'darwin'
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Session',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('sirona:new-session')
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close' }]),
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// -------------------------------------------------------------
// Synchronous IPC Handlers (needed before first renderer paint)
// -------------------------------------------------------------
ipcMain.on('sirona:translucency:support', (event) => {
  event.returnValue = detectTranslucencySupport()
})
ipcMain.on('hermes:translucency:support', (event) => {
  event.returnValue = detectTranslucencySupport()
})

ipcMain.on('sirona:feature-flags', (event) => {
  event.returnValue = { localModels: true, assumeFreshInstall: false }
})
ipcMain.on('hermes:feature-flags', (event) => {
  event.returnValue = { localModels: true, assumeFreshInstall: false }
})

ipcMain.on('sirona:skin:local', (event) => {
  event.returnValue = null
})
ipcMain.on('hermes:skin:local', (event) => {
  event.returnValue = null
})

// -------------------------------------------------------------
// Window Controls & Zoom IPC
// -------------------------------------------------------------
ipcMain.on('sirona:window-control', (_event, action) => {
  performWindowControl(action)
})
ipcMain.on('hermes:window-control', (_event, action) => {
  performWindowControl(action)
})

ipcMain.handle('sirona:zoom:get', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { level: 0, percent: 100 }
  return {
    level: mainWindow.webContents.getZoomLevel(),
    percent: Math.round(mainWindow.webContents.getZoomFactor() * 100),
  }
})
ipcMain.handle('hermes:zoom:get', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { level: 0, percent: 100 }
  return {
    level: mainWindow.webContents.getZoomLevel(),
    percent: Math.round(mainWindow.webContents.getZoomFactor() * 100),
  }
})

ipcMain.on('sirona:zoom:set-percent', (_event, percent) => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const factor = Math.max(0.5, Math.min(3.0, (Number(percent) || 100) / 100))
  mainWindow.webContents.setZoomFactor(factor)
  const payload = { level: mainWindow.webContents.getZoomLevel(), percent: Math.round(factor * 100) }
  mainWindow.webContents.send('sirona:zoom:changed', payload)
  mainWindow.webContents.send('hermes:zoom:changed', payload)
})
ipcMain.on('hermes:zoom:set-percent', (_event, percent) => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const factor = Math.max(0.5, Math.min(3.0, (Number(percent) || 100) / 100))
  mainWindow.webContents.setZoomFactor(factor)
  const payload = { level: mainWindow.webContents.getZoomLevel(), percent: Math.round(factor * 100) }
  mainWindow.webContents.send('sirona:zoom:changed', payload)
  mainWindow.webContents.send('hermes:zoom:changed', payload)
})

// -------------------------------------------------------------
// Clipboard IPC
// -------------------------------------------------------------
ipcMain.handle('sirona:write-clipboard', async (_, text) => {
  clipboard.writeText(String(text || ''))
  return true
})
ipcMain.handle('hermes:writeClipboard', async (_, text) => {
  clipboard.writeText(String(text || ''))
  return true
})

ipcMain.handle('sirona:read-clipboard', async () => {
  return clipboard.readText()
})
ipcMain.handle('hermes:readClipboard', async () => {
  return clipboard.readText()
})

// -------------------------------------------------------------
// Safe External Link IPC
// -------------------------------------------------------------
ipcMain.handle('sirona:open-external', async (_, url) => {
  if (isSafeExternalUrl(url)) {
    await shell.openExternal(url)
    return true
  }
  return false
})
ipcMain.handle('hermes:openExternal', async (_, url) => {
  if (isSafeExternalUrl(url)) {
    await shell.openExternal(url)
    return true
  }
  return false
})

// -------------------------------------------------------------
// File Dialogs & FS Handlers
// -------------------------------------------------------------
ipcMain.handle('sirona:show-open-dialog', async (_, options) => {
  return await dialog.showOpenDialog(mainWindow, options || {})
})
ipcMain.handle('hermes:selectPaths', async (_, options) => {
  return await dialog.showOpenDialog(mainWindow, options || {})
})

ipcMain.handle('sirona:show-save-dialog', async (_, options) => {
  return await dialog.showSaveDialog(mainWindow, options || {})
})
ipcMain.handle('hermes:selectSavePath', async (_, options) => {
  return await dialog.showSaveDialog(mainWindow, options || {})
})

ipcMain.handle('sirona:save-text-file-as', async (_, request) => {
  const { defaultPath, content, title } = request || {}
  const result = await dialog.showSaveDialog(mainWindow, {
    title: title || 'Save File',
    defaultPath: defaultPath,
  })
  if (!result.canceled && result.filePath) {
    await fs.promises.writeFile(result.filePath, content || '', 'utf8')
    return { success: true, filePath: result.filePath }
  }
  return { success: false, canceled: true }
})
ipcMain.handle('hermes:saveTextFileAs', async (_, request) => {
  const { defaultPath, content, title } = request || {}
  const result = await dialog.showSaveDialog(mainWindow, {
    title: title || 'Save File',
    defaultPath: defaultPath,
  })
  if (!result.canceled && result.filePath) {
    await fs.promises.writeFile(result.filePath, content || '', 'utf8')
    return { success: true, filePath: result.filePath }
  }
  return { success: false, canceled: true }
})

ipcMain.handle('sirona:read-file-text', async (_, filePath) => {
  if (!filePath || typeof filePath !== 'string') return ''
  const stats = await fs.promises.stat(filePath)
  if (stats.size > 20 * 1024 * 1024) {
    throw new Error('File exceeds maximum readable size of 20MB')
  }
  return await fs.promises.readFile(filePath, 'utf8')
})
ipcMain.handle('hermes:readFileText', async (_, filePath) => {
  if (!filePath || typeof filePath !== 'string') return ''
  const stats = await fs.promises.stat(filePath)
  if (stats.size > 20 * 1024 * 1024) {
    throw new Error('File exceeds maximum readable size of 20MB')
  }
  return await fs.promises.readFile(filePath, 'utf8')
})

// -------------------------------------------------------------
// Find in Page IPC
// -------------------------------------------------------------
ipcMain.handle('sirona:find-in-page', async (_, query, options) => {
  if (!mainWindow || mainWindow.isDestroyed() || !query) return 0
  return mainWindow.webContents.findInPage(query, options || {})
})
ipcMain.handle('hermes:find-in-page', async (_, query, options) => {
  if (!mainWindow || mainWindow.isDestroyed() || !query) return 0
  return mainWindow.webContents.findInPage(query, options || {})
})

ipcMain.handle('sirona:stop-find-in-page', async (_, action) => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.stopFindInPage(action || 'clearSelection')
})
ipcMain.handle('hermes:stop-find-in-page', async (_, action) => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.stopFindInPage(action || 'clearSelection')
})

// -------------------------------------------------------------
// Backend Status & Lifecycle IPC
// -------------------------------------------------------------
ipcMain.handle('sirona:get-backend-status', async () => {
  const healthy = await checkHttp(`http://127.0.0.1:${BACKEND_PORT}/health`)
  return { isHealthy: healthy, port: BACKEND_PORT }
})

ipcMain.handle('sirona:restart-backend', async () => {
  if (backendProcess) {
    backendProcess.kill()
    backendProcess = null
  }
  await ensureBackendRunning()
  return { success: true }
})

ipcMain.handle('sirona:version', async () => {
  return {
    version: '0.1.0',
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
  }
})
ipcMain.handle('hermes:version', async () => {
  return {
    version: '0.1.0',
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
  }
})

ipcMain.handle('sirona:machine-profile', async () => {
  return {
    platform: process.platform,
    arch: process.arch,
    release: os.release(),
    cpus: os.cpus().length,
    totalMemoryMb: Math.round(os.totalmem() / 1024 / 1024),
  }
})
ipcMain.handle('hermes:machine:profile', async () => {
  return {
    platform: process.platform,
    arch: process.arch,
    release: os.release(),
    cpus: os.cpus().length,
    totalMemoryMb: Math.round(os.totalmem() / 1024 / 1024),
  }
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill()
    backendProcess = null
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
