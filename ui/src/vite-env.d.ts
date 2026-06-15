/// <reference types="vite/client" />

interface Window {
  careerOps?: {
    readFile: (path: string) => Promise<{ content: string | null; error: string | null }>
    writeFile: (path: string, content: string) => Promise<{ error: string | null }>
    listFiles: (path: string) => Promise<{ entries: { name: string; isDirectory: boolean }[]; error: string | null }>
    runScan: () => Promise<{ output: string; code: number; error: string | null }>
    runPipeline: (jobUrl: string) => Promise<{ output: string; code: number; error: string | null }>
    generatePdf: (companySlug?: string) => Promise<{ output: string; code: number; error: string | null }>
    selectDirectory: () => Promise<{ path: string | null }>
  }
}
