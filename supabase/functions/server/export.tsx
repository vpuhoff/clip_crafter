import { createClient } from 'jsr:@supabase/supabase-js@2'
import * as kv from './kv_store.tsx'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

export async function exportProject(projectId: string) {
  try {
    // Load project data
    const project = await kv.get(`project:${projectId}`)
    if (!project) {
      throw new Error('Project not found')
    }

    // Create export data structure
    const exportData = {
      project: {
        title: project.title,
        scenes: project.scenes.map((scene: any) => ({
          id: scene.id,
          title: scene.title,
          text: scene.text,
          description: scene.description,
          media: scene.media,
          audioUrl: scene.audioUrl
        }))
      },
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0'
      }
    }

    // Create JSON file content
    const jsonContent = JSON.stringify(exportData, null, 2)
    
    // In a real implementation, you would:
    // 1. Create a ZIP file with all media files
    // 2. Include the JSON data
    // 3. Return a download URL
    
    return {
      success: true,
      downloadUrl: `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`,
      filename: `${project.title.replace(/[^a-zA-Z0-9]/g, '_')}.json`
    }
  } catch (error) {
    console.error('Export error:', error)
    throw error
  }
}