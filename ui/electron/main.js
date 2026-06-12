const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { exec } = require('child_process')

const isDev = !app.isPackaged
let mainWindow

function getCareerOpsPath() {
  return path.resolve(__dirname, '..', '..')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// ── IPC Handlers ──────────────────────────────────────────────

ipcMain.handle('read-file', async (_, relativePath) => {
  const fullPath = path.join(getCareerOpsPath(), relativePath)
  try {
    const content = fs.readFileSync(fullPath, 'utf-8')
    return { content, error: null }
  } catch (e) {
    return { content: null, error: e.message }
  }
})

ipcMain.handle('write-file', async (_, relativePath, content) => {
  const fullPath = path.join(getCareerOpsPath(), relativePath)
  try {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, content, 'utf-8')
    return { error: null }
  } catch (e) {
    return { error: e.message }
  }
})

ipcMain.handle('list-files', async (_, relativePath) => {
  const fullPath = path.join(getCareerOpsPath(), relativePath)
  try {
    const entries = fs.readdirSync(fullPath, { withFileTypes: true })
    return {
      entries: entries.map(e => ({
        name: e.name,
        isDirectory: e.isDirectory(),
      })),
      error: null,
    }
  } catch (e) {
    return { entries: [], error: e.message }
  }
})

ipcMain.handle('run-scan', async () => {
  return new Promise((resolve) => {
    const coPath = getCareerOpsPath()
    const child = exec('node scan.mjs', { cwd: coPath, timeout: 120000 })
    let output = ''
    child.stdout?.on('data', (d) => { output += d })
    child.stderr?.on('data', (d) => { output += d })
    child.on('close', (code) => {
      resolve({ output, code, error: code !== 0 ? `Exit code ${code}` : null })
    })
    child.on('error', (e) => {
      resolve({ output, code: -1, error: e.message })
    })
  })
})

ipcMain.handle('run-pipeline', async (_, jobUrl) => {
  // Run the pipeline evaluation for a single URL
  return new Promise((resolve) => {
    const coPath = getCareerOpsPath()
    const cmd = `echo "${jobUrl.replace(/"/g, '\\"')}" | node pipeline.mjs`
    const child = exec(cmd, { cwd: coPath, timeout: 60000 })
    let output = ''
    child.stdout?.on('data', (d) => { output += d })
    child.stderr?.on('data', (d) => { output += d })
    child.on('close', (code) => {
      resolve({ output, code, error: code !== 0 ? `Exit code ${code}` : null })
    })
    child.on('error', (e) => {
      resolve({ output, code: -1, error: e.message })
    })
  })
})

ipcMain.handle('generate-pdf', async (_, companySlug) => {
  return new Promise((resolve) => {
    const coPath = getCareerOpsPath()
    const cmd = companySlug
      ? `node generate-pdf.mjs --company "${companySlug.replace(/"/g, '\\"')}"`
      : 'node generate-pdf.mjs'
    const child = exec(cmd, { cwd: coPath, timeout: 60000 })
    let output = ''
    child.stdout?.on('data', (d) => { output += d })
    child.stderr?.on('data', (d) => { output += d })
    child.on('close', (code) => {
      resolve({ output, code, error: code !== 0 ? `Exit code ${code}` : null })
    })
    child.on('error', (e) => {
      resolve({ output, code: -1, error: e.message })
    })
  })
})

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })
  if (result.canceled || !result.filePaths.length) return { path: null }
  return { path: result.filePaths[0] }
})
