const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron')
const path = require('path')
const http = require('http')
const fs = require('fs')
const { spawn } = require('child_process')

// Configure single instance & isolated userData to prevent cache lock conflicts
app.name = 'sirona'
const userDataPath = path.join(app.getPath('appData'), 'sirona-desktop')
try {
  fs.mkdirSync(userDataPath, { recursive: true })
  app.setPath('userData', userDataPath)
} catch (e) {
  // Ignore
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

async function ensureBackendRunning() {
  const isAlive = await checkHttp(`http://127.0.0.1:${BACKEND_PORT}/health`)
  if (isAlive) {
    console.log('[Sirona Electron] Backend is already active on port 8000.')
    return
  }

  const projectRoot = path.resolve(__dirname, '../..')
  const pythonExe = path.join(projectRoot, 'sirona-core', '.venv', 'Scripts', 'python.exe')
  const coreDir = path.join(projectRoot, 'sirona-core')

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

  backendProcess.stdout.on('data', (d) => {
    console.log(`[Sirona Core] ${d.toString().trim()}`)
  })

  backendProcess.stderr.on('data', (d) => {
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
}

async function resolveAppUrl() {
  for (const url of DEV_URLS) {
    if (await checkHttp(url)) {
      return url
    }
  }
  return null
}

async function createWindow() {
  await ensureBackendRunning()

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    title: 'Sirona',
    backgroundColor: '#faf8f5',
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
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

// IPC Handlers
ipcMain.handle('sirona:open-external', async (_, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    await shell.openExternal(url)
  }
})

ipcMain.handle('sirona:show-open-dialog', async (_, options) => {
  return await dialog.showOpenDialog(mainWindow, options)
})

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
