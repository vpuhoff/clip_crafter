import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import * as kv from './kv_store.tsx'
import { exportProject } from './export.tsx'

const app = new Hono()

// Middleware
app.use('*', cors())
app.use('*', logger(console.log))

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Utility function to sanitize filenames for storage
function sanitizeFileName(fileName: string): string {
  // Get file extension
  const lastDotIndex = fileName.lastIndexOf('.')
  const name = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName
  const extension = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : ''
  
  // Replace non-ASCII characters, spaces, and special characters with underscores
  const sanitizedName = name
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace non-alphanumeric with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
  
  // Ensure we have a name (fallback to 'file' if empty)
  const finalName = sanitizedName || 'file'
  
  return `${finalName}${extension}`
}

// Create storage bucket on startup
async function initStorage() {
  const bucketName = 'make-766e6542-media'
  try {
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName)
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: false })
      console.log(`Created bucket: ${bucketName}`)
    }
  } catch (error) {
    console.error('Error initializing storage:', error)
  }
}

initStorage()

// Health check
app.get('/make-server-766e6542/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Parse scenario into scenes using LLM
app.post('/make-server-766e6542/parse-scenario', async (c) => {
  try {
    const { text } = await c.req.json()
    
    if (!text) {
      return c.json({ error: 'Text is required' }, 400)
    }

    // Mock LLM response for now - in production, this would call OpenAI API
    const scenes = parseScenarioMock(text)
    
    return c.json({ scenes })
  } catch (error) {
    console.error('Error parsing scenario:', error)
    return c.json({ error: 'Failed to parse scenario' }, 500)
  }
})

// Save project
app.post('/make-server-766e6542/save-project', async (c) => {
  try {
    const { projectId, title, scenes } = await c.req.json()
    
    const project = {
      id: projectId,
      title,
      scenes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    await kv.set(`project:${projectId}`, project)
    
    return c.json({ success: true, projectId })
  } catch (error) {
    console.error('Error saving project:', error)
    return c.json({ error: 'Failed to save project' }, 500)
  }
})

// Load project
app.get('/make-server-766e6542/load-project/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId')
    const project = await kv.get(`project:${projectId}`)
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404)
    }
    
    return c.json({ project })
  } catch (error) {
    console.error('Error loading project:', error)
    return c.json({ error: 'Failed to load project' }, 500)
  }
})

// Export project
app.get('/make-server-766e6542/export-project/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId')
    const exportData = await exportProject(projectId)
    
    return c.json(exportData)
  } catch (error) {
    console.error('Error exporting project:', error)
    return c.json({ error: 'Failed to export project' }, 500)
  }
})

// Delete project
app.delete('/make-server-766e6542/delete-project/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId')
    await kv.del(`project:${projectId}`)
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return c.json({ error: 'Failed to delete project' }, 500)
  }
})

// Upload media file
app.post('/make-server-766e6542/upload-media', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    const sceneId = formData.get('sceneId') as string
    
    if (!file || !sceneId) {
      return c.json({ error: 'File and sceneId are required' }, 400)
    }
    
    // Sanitize the original filename
    const sanitizedOriginalName = sanitizeFileName(file.name)
    const fileName = `${sceneId}-${Date.now()}-${sanitizedOriginalName}`
    const bucketName = 'make-766e6542-media'
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file)
    
    if (error) {
      console.error('Storage upload error:', error)
      return c.json({ error: 'Failed to upload file' }, 500)
    }
    
    // Create signed URL for private access
    const { data: signedUrlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 60 * 60 * 24) // 24 hours
    
    return c.json({ 
      fileName, 
      url: signedUrlData?.signedUrl,
      type: file.type.startsWith('image/') ? 'image' : 'video',
      originalName: file.name // Include original name for display
    })
  } catch (error) {
    console.error('Error uploading media:', error)
    return c.json({ error: 'Failed to upload media' }, 500)
  }
})

// Generate TTS audio
app.post('/make-server-766e6542/generate-tts', async (c) => {
  try {
    const { text, sceneId } = await c.req.json()
    
    if (!text || !sceneId) {
      return c.json({ error: 'Text and sceneId are required' }, 400)
    }
    
    // Mock TTS generation - in production, this would call a TTS service
    const { audioUrl, duration } = await generateTTSMock(text, sceneId)
    
    return c.json({ audioUrl, duration })
  } catch (error) {
    console.error('Error generating TTS:', error)
    return c.json({ error: 'Failed to generate TTS' }, 500)
  }
})

// Get all projects
app.get('/make-server-766e6542/projects', async (c) => {
  try {
    const projects = await kv.getByPrefix('project:')
    return c.json({ projects })
  } catch (error) {
    console.error('Error loading projects:', error)
    return c.json({ error: 'Failed to load projects' }, 500)
  }
})

// Mock functions (replace with real API calls in production)
function parseScenarioMock(text: string) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const scenes = []
  
  for (let i = 0; i < sentences.length; i += 2) {
    const sceneText = sentences.slice(i, i + 2).join('. ').trim()
    if (sceneText) {
      scenes.push({
        id: `scene-${i / 2 + 1}`,
        title: `Сцена ${i / 2 + 1}`,
        text: sceneText,
        description: `Описание сцены ${i / 2 + 1}`,
        media: [],
        audioUrl: null,
        audioDuration: null,
        isCompleted: false
      })
    }
  }
  
  return scenes
}

async function generateTTSMock(text: string, sceneId: string) {
  // Calculate mock duration based on text length
  // Average speaking speed is about 180 words per minute
  const words = text.trim().split(/\s+/).filter(word => word.length > 0)
  const wordCount = words.length
  const wordsPerMinute = 180
  const durationMinutes = wordCount / wordsPerMinute
  const durationSeconds = Math.round(durationMinutes * 60)
  
  // In production, this would call a real TTS service and get actual duration
  return {
    audioUrl: `https://example.com/tts/${sceneId}.mp3`,
    duration: durationSeconds // duration in seconds
  }
}

Deno.serve(app.fetch)