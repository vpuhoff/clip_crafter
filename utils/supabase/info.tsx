// Supabase project configuration
export const projectId = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'localhost'
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'test-key'

// Validate required environment variables
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Missing Supabase environment variables. Please check your .env file.')
}