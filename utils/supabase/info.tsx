// Supabase project configuration
// Prefer explicit project id, then derive from URL, then fall back to known project id in repo
const derivedProjectId = (() => {
  const explicitId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined
  if (explicitId && explicitId.trim()) return explicitId.trim()

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (url) {
    try {
      const host = url.split('//')[1]
      const sub = host?.split('.')[0]
      if (sub) return sub
    } catch {}
  }
  // Fallback to repo-known project id to avoid invalid https://localhost.supabase.co
  return 'ggzhkvvhrsazbcqiiqvu'
})()

export const projectId = derivedProjectId
export const publicAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'test-key'

// Warn once if critical vars are missing; include which fallback is used
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    `Missing Supabase environment variables. Using fallback projectId="${projectId}". ` +
    'Please set VITE_SUPABASE_URL, VITE_SUPABASE_PROJECT_ID and VITE_SUPABASE_ANON_KEY in your .env.'
  )
}