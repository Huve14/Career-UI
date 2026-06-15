import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ddnjdhhkmdcnpxwdwixv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbmpkaGhrbWRjbnB4d2R3aXh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NTEzNzcsImV4cCI6MjA5MzAyNzM3N30.NSaYpw8qNScCBFpHf63Mf7YY4bZZXAIzmQh-lrMf2-M'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
