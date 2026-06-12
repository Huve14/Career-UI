import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { Application, PipelineItem, FollowUp, Profile, PortalConfig } from '../types'
import {
  loadApplications, saveApplications,
  loadPipeline, savePipeline,
  loadFollowUps, saveFollowUps,
  loadProfile,
  loadPortals,
  loadCv, saveCv,
} from './data'

interface AppState {
  applications: Application[]
  pipeline: PipelineItem[]
  followUps: FollowUp[]
  profile: Profile
  portals: PortalConfig
  cv: string
  loading: boolean
  toast: string
}

interface AppContextType extends AppState {
  setApplications: (apps: Application[]) => void
  setPipeline: (items: PipelineItem[]) => void
  setFollowUps: (items: FollowUp[]) => void
  setPortals: (config: PortalConfig) => void
  setCv: (content: string) => void
  showToast: (msg: string) => void
  refresh: () => Promise<void>
}

const AppContext = createContext<AppContextType>(null!)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    applications: [],
    pipeline: [],
    followUps: [],
    profile: {} as Profile,
    portals: { positiveKeywords: [], negativeKeywords: [], companies: [] },
    cv: '',
    loading: true,
    toast: '',
  })

  const showToast = useCallback((msg: string) => {
    setState(s => ({ ...s, toast: msg }))
    setTimeout(() => setState(s => ({ ...s, toast: '' })), 2800)
  }, [])

  const refresh = useCallback(async () => {
    setState(s => ({ ...s, loading: true }))
    const [applications, pipeline, followUps, profile, portals, cv] = await Promise.all([
      loadApplications(),
      loadPipeline(),
      loadFollowUps(),
      loadProfile(),
      loadPortals(),
      loadCv(),
    ])
    setState({ applications, pipeline, followUps, profile, portals, cv, loading: false, toast: '' })
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const setApplications = useCallback(async (apps: Application[]) => {
    setState(s => ({ ...s, applications: apps }))
    await saveApplications(apps)
  }, [])

  const setPipeline = useCallback(async (items: PipelineItem[]) => {
    setState(s => ({ ...s, pipeline: items }))
    await savePipeline(items)
  }, [])

  const setFollowUps = useCallback(async (items: FollowUp[]) => {
    setState(s => ({ ...s, followUps: items }))
    await saveFollowUps(items)
  }, [])

  const setPortals = useCallback(async (config: PortalConfig) => {
    setState(s => ({ ...s, portals: config }))
  }, [])

  const setCv = useCallback(async (content: string) => {
    setState(s => ({ ...s, cv: content }))
    await saveCv(content)
  }, [])

  return (
    <AppContext.Provider value={{ ...state, setApplications, setPipeline, setFollowUps, setPortals, setCv, showToast, refresh }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
