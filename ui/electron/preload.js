const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('careerOps', {
  readFile: (relativePath) => ipcRenderer.invoke('read-file', relativePath),
  writeFile: (relativePath, content) => ipcRenderer.invoke('write-file', relativePath, content),
  listFiles: (relativePath) => ipcRenderer.invoke('list-files', relativePath),
  runScan: () => ipcRenderer.invoke('run-scan'),
  runPipeline: (jobUrl) => ipcRenderer.invoke('run-pipeline', jobUrl),
  generatePdf: (companySlug) => ipcRenderer.invoke('generate-pdf', companySlug),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
})
