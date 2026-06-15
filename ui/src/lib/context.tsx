import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Application, PipelineItem, FollowUp, Profile, PortalConfig } from '../types'
import {
  loadApplications, saveApplications,
  loadPipeline, savePipeline,
  loadFollowUps, saveFollowUps,
  loadProfile, saveProfileYaml,
  loadPortals, savePortalsYaml,
  loadCv, saveCv,
  loadStorage, saveStorage, getDefaultData,
} from './data'
import { supabase, signOut } from './supabase'

interface AppState {
  applications: Application[]
  pipeline: PipelineItem[]
  followUps: FollowUp[]
  profile: Profile
  portals: PortalConfig
  cv: string
  loading: boolean
  toast: string
  user: User | null
}

interface AppContextType extends AppState {
  setApplications: (apps: Application[]) => void
  setPipeline: (items: PipelineItem[]) => void
  setFollowUps: (items: FollowUp[]) => void
  setPortals: (config: PortalConfig) => void
  setCv: (content: string) => void
  setProfile: (profile: Profile) => Promise<void>
  showToast: (msg: string) => void
  refresh: () => Promise<void>
  signInSupabase: (email: string, password: string) => Promise<string | null>
  signUpSupabase: (email: string, password: string) => Promise<string | null>
  signOutSupabase: () => Promise<void>
  syncToSupabase: () => Promise<string | null>
  syncFromSupabase: () => Promise<string | null>
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
    user: null,
  })

  // Restore session on mount and listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(s => ({ ...s, user: session?.user ?? null, loading: !session }))
      if (session) refresh()
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(s => ({ ...s, user: session?.user ?? null }))
      if (session) refresh()
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    setState(s => ({
      ...s, applications, pipeline, followUps, profile, portals, cv, loading: false,
    }))
  }, [])

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
    await savePortalsYaml(config)
  }, [])

  const setCv = useCallback(async (content: string) => {
    setState(s => ({ ...s, cv: content }))
    await saveCv(content)
  }, [])

  const setProfile = useCallback(async (profile: Profile) => {
    setState(s => ({ ...s, profile }))
    await saveProfileYaml(profile)
  }, [])

  const signInSupabase = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return error.message
    setState(s => ({ ...s, user: data.user }))
    return null
  }, [])

  const signUpSupabase = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return error.message
    setState(s => ({ ...s, user: data.user }))
    return null
  }, [])

  const signOutSupabase = useCallback(async () => {
    await signOut()
    setState(s => ({ ...s, user: null }))
  }, [])

  const syncToSupabase = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return 'Not signed in'

    const data = loadStorage()
    const userId = session.user.id

    const upsert = async (table: string, payload: Record<string, unknown>) => {
      const { error } = await supabase.from(table).upsert(payload, { onConflict: 'user_id' })
      if (error) return error.message
      return null
    }

    const err1 = await upsert('profiles', {
      user_id: userId,
      name: data.profile.name,
      email: data.profile.email,
      phone: data.profile.phone,
      location: data.profile.location,
      linkedin: data.profile.linkedin,
      portfolio_url: data.profile.portfolioUrl,
      visa_status: data.profile.visaStatus,
      target_roles: data.profile.targetRoles,
      narrative: data.profile.narrative,
      headline: data.profile.headline,
      superpowers: JSON.stringify(data.profile.superpowers),
    })
    if (err1) return err1

    const err2 = await upsert('cv', { user_id: userId, content: data.cv })
    if (err2) return err2

    const err3 = await upsert('portals', {
      user_id: userId,
      positive_keywords: JSON.stringify(data.portals.positiveKeywords),
      negative_keywords: JSON.stringify(data.portals.negativeKeywords),
      companies: JSON.stringify(data.portals.companies),
    })
    if (err3) return err3

    return null
  }, [])

  const syncFromSupabase = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return 'Not signed in'

    const userId = session.user.id

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    const { data: cvData } = await supabase
      .from('cv')
      .select('content')
      .eq('user_id', userId)
      .maybeSingle()

    const { data: portalsData } = await supabase
      .from('portals')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    const { data: appsData } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', userId)
      .order('app_id', { ascending: true })

    const { data: pipelineData } = await supabase
      .from('pipeline_items')
      .select('*')
      .eq('user_id', userId)

    const { data: followUpsData } = await supabase
      .from('follow_ups')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: true })

    const data = getDefaultData()

    if (profileData) {
      data.profile = {
        name: profileData.name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        location: profileData.location || '',
        linkedin: profileData.linkedin || '',
        portfolioUrl: profileData.portfolio_url || '',
        visaStatus: profileData.visa_status || '',
        targetRoles: profileData.target_roles || '',
        salaryMin: '',
        salaryMax: '',
        narrative: profileData.narrative || '',
        headline: profileData.headline || '',
        superpowers: typeof profileData.superpowers === 'string'
          ? JSON.parse(profileData.superpowers)
          : profileData.superpowers || [],
      }
    }

    if (cvData) {
      data.cv = cvData.content || ''
    }

    if (portalsData) {
      data.portals = {
        positiveKeywords: typeof portalsData.positive_keywords === 'string'
          ? JSON.parse(portalsData.positive_keywords)
          : portalsData.positive_keywords || [],
        negativeKeywords: typeof portalsData.negative_keywords === 'string'
          ? JSON.parse(portalsData.negative_keywords)
          : portalsData.negative_keywords || [],
        companies: typeof portalsData.companies === 'string'
          ? JSON.parse(portalsData.companies)
          : portalsData.companies || [],
      }
    }

    if (appsData) {
      data.applications = appsData.map((a: Record<string, unknown>) => ({
        id: a.app_id as number,
        date: (a.date as string) || '',
        company: a.company as string,
        role: a.role as string,
        score: (a.score as number) || 0,
        status: (a.status as Application['status']) || 'Evaluated',
        pdf: (a.pdf as boolean) || false,
        report: (a.report as string) || '',
        notes: (a.notes as string) || '',
      }))
    }

    if (pipelineData) {
      data.pipeline = pipelineData.map((p: Record<string, unknown>, i: number) => ({
        id: i + 1,
        url: p.url as string,
        added: (p.added as string) || '',
      }))
    }

    if (followUpsData) {
      data.followUps = followUpsData.map((f: Record<string, unknown>) => ({
        id: (f as any).app_id || Date.now(),
        company: f.company as string,
        role: f.role as string,
        date: (f.date as string) || '',
        type: (f.type as string) || '',
        notes: (f.notes as string) || '',
        overdue: (f.overdue as boolean) || false,
      }))
    }

    saveStorage(data)
    await refresh()
    return null
  }, [refresh])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(s => ({ ...s, user: session?.user ?? null }))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(s => ({ ...s, user: session?.user ?? null }))
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <AppContext.Provider value={{
      ...state,
      setApplications, setPipeline, setFollowUps, setPortals, setCv, setProfile,
      showToast, refresh,
      signInSupabase, signUpSupabase, signOutSupabase,
      syncToSupabase, syncFromSupabase,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
