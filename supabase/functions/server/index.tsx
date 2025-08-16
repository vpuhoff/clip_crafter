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

// ElevenLabs voice ID mapping
const ELEVENLABS_VOICES = {
  'rachel': '21m00Tcm4TlvDq8ikWAM',      // Rachel - Natural female voice
  'drew': '29vD33N1CtxCmqQRPOHJ',        // Drew - Male American
  'clyde': '2EiwWnXFnfZZNgFoOdzd',       // Clyde - Male American
  'paul': '5Q0t7uMcjvnagumLfvZi',        // Paul - Male American
  'domi': 'AZnzlk1XvdvUeBnXmlld',        // Domi - Female American
  'dave': 'CYw3kZ02Hs0563khs1Fj',        // Dave - Male British
  'fin': 'D38z5RcWu1voky8WS1ja',         // Fin - Male Irish
  'sarah': 'EXAVITQu4vr4xnSDxMaL',       // Sarah - Female American
  'antoni': 'ErXwobaYiN019PkySvjV',      // Antoni - Male American
  'thomas': 'GBv7mTt0atIp3Br8iCZE',      // Thomas - Male American
  'emily': 'LcfcDJNUP1GQjkzn1xUU',       // Emily - Female American
  'elli': 'MF3mGyEYCl7XYWbV9V6O',        // Elli - Female American
  'callum': 'N2lVS1w4EtoT3dr4eOWO',      // Callum - Male British
  'patrick': 'ODq5zmih8GrVes37Dizd',     // Patrick - Male American
  'harry': 'SOYHLrjzK2X1ezoPC6cr',       // Harry - Male American
  'liam': 'TX3LPaxmHKxFdv7VOQHJ',        // Liam - Male American
  'dorothy': 'ThT5KcBeYPX3keUQqHPh',     // Dorothy - Female American
  'josh': 'TxGEqnHWrfWFTfGW9XjX',        // Josh - Male American
  'arnold': 'VR6AewLTigWG4xSOukaG',      // Arnold - Male American
  'adam': 'pNInz6obpgDQGcFmaJgB',        // Adam - Male American
  'sam': 'yoZ06aMxZJJ28mfd3POQ'          // Sam - Male American
}

// Voice mapping from our settings to ElevenLabs voices
const getElevenLabsVoiceId = (voiceSettings: any): string => {
  // If custom voice ID is specified, use it directly
  if (voiceSettings?.customVoiceId) {
    console.log('🎭 Using custom voice ID:', voiceSettings.customVoiceId)
    return voiceSettings.customVoiceId
  }

  // Map our voice settings to actual ElevenLabs voice IDs
  const voiceMappings = {
    'alloy': 'rachel',      // Universal -> Rachel (natural female)
    'echo': 'drew',         // Male -> Drew (male American) 
    'fable': 'callum',      // British -> Callum (male British)
    'onyx': 'arnold',       // Deep male -> Arnold (deep male)
    'nova': 'sarah',        // Female -> Sarah (female American)
    'shimmer': 'elli'       // Soft female -> Elli (soft female)
  }
  
  const voiceKey = voiceMappings[voiceSettings?.voice] || 'rachel'
  return ELEVENLABS_VOICES[voiceKey] || ELEVENLABS_VOICES['rachel']
}

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

// Parse scenario into scenes using Gemini LLM
app.post('/make-server-766e6542/parse-scenario', async (c) => {
  try {
    const { text } = await c.req.json()
    
    if (!text) {
      return c.json({ error: 'Text is required' }, 400)
    }

    console.log('Parsing scenario with text length:', text.length)

    // Call Gemini API to parse scenario
    const scenes = await parseScenarioWithGemini(text)
    
    return c.json({ scenes })
  } catch (error) {
    console.error('Error parsing scenario:', error)
    return c.json({ error: 'Failed to parse scenario: ' + error.message }, 500)
  }
})

// Function to parse scenario using Gemini API
async function parseScenarioWithGemini(text: string) {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const prompt = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Чтобы вывести незакоммиченные строки с именами файлов, которые изменились, можно использовать команду git diff.\n\nОсновные команды\nПросмотр всех незакоммиченных изменений (как staged, так и unstaged):\n\nBash\n\ngit diff HEAD\nЭта команда покажет все изменения в вашем рабочем каталоге по сравнению с последним коммитом (HEAD). В выводе будут отображены и сами измененные строки, и имена файлов.\n\nПросмотр только unstaged изменений (не добавленных в staged-зону):\n\nBash\n\ngit diff\nЭто самая базовая форма команды git diff. Она сравнивает ваш рабочий каталог с staged-зоной и показывает изменения, которые еще не были подготовлены для коммита. Вы увидите измененные строки и имена файлов.\n\nПросмотр только staged изменений (подготовленных к коммиту):\n\nBash\n\ngit diff --staged\n# или\ngit diff --cached\nЭти команды показывают разницу между staged-зоной и последним коммитом. Это полезно, когда вы хотите проверить, что именно будет в вашем следующем коммите, прежде чем его создать.\n\nДополнительные полезные флаги\n--name-only: Если вам нужно увидеть только имена файлов, которые были изменены, без показа самих строк.\n\nBash\n\ngit diff --name-only\ngit diff --staged --name-only\n--name-status: Этот флаг покажет не только имена файлов, но и их статус (M - модифицирован, A - добавлен, D - удален и т.д.).\n\nBash\n\ngit diff --name-status\ngit diff --staged --name-status\n--color-words: Этот флаг делает вывод git diff более наглядным, подсвечивая изменения на уровне слов, а не целых строк. Это особенно полезно, если в строке изменено всего несколько символов.\n\nBash\n\ngit diff --color-words\n--unified=0: Этот флаг убирает \"контекстные\" строки в выводе, показывая только добавленные и удаленные строки. Это делает вывод более компактным, но может затруднить понимание, где именно находится изменение."
          }
        ]
      },
      {
        role: "model",
        parts: [
          {
            text: "**Defining Video Structure**\n\nI've started to map out the video's structure, focusing on key scenes for explaining `git diff`. Each scene will now have a description and script, simplifying the editing phase. This approach ensures a clear flow for viewers, enhancing their understanding.\n\n\n**Refining Scene Breakdowns**\n\nI'm now detailing the scene descriptions and voiceover scripts for the `git diff` video. I've expanded Scene 2, adding visuals of a terminal executing `git diff HEAD`, highlighting changes. Also, I'm working to integrate animations to make the explanation of Git's areas clearer for the audience. The initial plan of explaining the command has evolved to incorporate visuals and audio for enhanced user experience.\n\n\n**Constructing Video Scenes**\n\nI'm currently building upon the previous scene breakdowns to include specific commands and relevant visuals. Scene 3 now uses an animation of Git's areas to illustrate unstaged changes. Moreover, I've incorporated the command `git diff` with a brief explanation of how it functions for unstaged changes. For Scene 4, I'm working on adding visuals of a developer staging changes with `git add` and then displaying the output of `git diff --staged` to highlight staged changes. I'll make sure to mention that this is like a final review before committing, to provide context for the viewer.\n\n\n**Outlining Video Elements**\n\nI'm now detailing each scene's visuals and voiceover script to ensure a clear learning path. Scene 1's \"confused developer\" opener is set, leading into a clear introduction to `git diff`. Scene 2 will feature `git diff HEAD`, explaining the differences between staged and unstaged changes. In Scene 3, I'm illustrating unstaged changes and how they are displayed with the command. Next, Scene 4's visuals, featuring `git add`, will show staged changes, and provide the viewer with the context that this is like a final review before committing.\n\n\n**Organizing Video Commands**\n\nI'm now detailing each scene's visuals and voiceover script to ensure a clear learning path. I've broken the introduction into a \"confused developer\" opener, followed by `git diff`'s introduction. `git diff HEAD` will be featured to highlight uncommitted changes, staged and unstaged. The video now includes unstaged changes and how `git diff` is used to see those changes. Also, I will illustrate staged changes with visuals of `git add`, and then `git diff --staged`. I also made sure to explain that this is a final review, before the user commits their changes.\n\n\n**Constructing Scene Scripts**\n\nI'm currently crafting the scene descriptions and voiceover scripts based on my new plan. I've broken down each command and flag into individual scenes. For Scene 1, I've designed an engaging opener, and I will showcase the `--name-only` flag in a \"Pro Tip\" for enhanced user understanding. This will be followed by Scene 2's detailed visual representation of `git diff HEAD`, highlighting the complete flow.\n\n\n"
          },
          {
            text: "{\n  \"scenes\": [\n    {\n      \"short_description\": \"Интро: Разработчик смотрит на код. Появляется надпись 'git diff'.\",\n      \"voiceover_text\": \"Чтобы отследить изменения в коде, которые еще не попали в коммит, используется команда git diff. Давайте разберемся, как с ней работать.\"\n    },\n    {\n      \"short_description\": \"Терминал. Вводится команда 'git diff HEAD'. Вывод подсвечивается.\",\n      \"voiceover_text\": \"Самый полный способ — это команда 'git diff HEAD'. Она покажет вам абсолютно все изменения в вашем проекте по сравнению с последним коммитом, как подготовленные, так и не подготовленные к коммиту.\"\n    },\n    {\n      \"short_description\": \"Анимация: рабочая директория и staged-зона. В терминале вводится 'git diff'.\",\n      \"voiceover_text\": \"Но чаще всего вы будете использовать просто 'git diff'. Эта команда сравнивает ваш рабочий каталог со staged-зоной и показывает изменения, которые вы еще не добавили для коммита.\"\n    },\n    {\n      \"short_description\": \"Анимация: staged-зона и последний коммит. В терминале вводится 'git diff --staged'.\",\n      \"voiceover_text\": \"А чтобы проверить, что именно войдет в следующий коммит, используйте 'git diff --staged' или её аналог 'git diff --cached'. Эта команда покажет разницу между staged-зоной и последним коммитом.\"\n    },\n    {\n      \"short_description\": \"Длинный вывод с изменениями сменяется коротким списком файлов после добавления флага '--name-only'.\",\n      \"voiceover_text\": \"Теперь о полезных флагах. Если вам не нужны сами изменения, а только список измененных файлов, добавьте флаг '--name-only'.\"\n    },\n    {\n      \"short_description\": \"Рядом с именами файлов появляются статусы 'M', 'A', 'D' после добавления флага '--name-status'.\",\n      \"voiceover_text\": \"Флаг '--name-status' пойдет еще дальше и покажет не только имена файлов, но и их статус: M — модифицирован, A — добавлен, D — удален.\"\n    },\n    {\n      \"short_description\": \"Сравнение: обычный вывод и вывод с флагом '--color-words', где подсвечены только измененные слова.\",\n      \"voiceover_text\": \"Чтобы сделать вывод более наглядным, используйте '--color-words'. Этот флаг подсветит изменения на уровне отдельных слов, а не целых строк, что очень удобно при мелких правках.\"\n    },\n    {\n      \"short_description\": \"Длинный вывод с контекстными строками. После добавления флага '--unified=0' контекстные строки исчезают.\",\n      \"voiceover_text\": \"А флаг '--unified=0' уберет 'контекстные' строки, показав только добавленные и удаленные. Вывод станет компактнее, но иногда сложнее для понимания.\"\n    },\n    {\n      \"short_description\": \"Быстрая нарезка всех показанных команд. Финальный кадр: разработчик уверенно печатает 'git commit'.\",\n      \"voiceover_text\": \"Итак, запомните: 'git diff' — для unstaged изменений, 'git diff --staged' — для staged. А флаги '--name-only' и '--name-status' помогут получить быстрый обзор. Теперь вы знаете, как контролировать свои изменения перед коммитом.\"\n    }\n  ]\n}"
          }
        ]
      },
      {
        role: "user",
        parts: [
          {
            text: text
          }
        ]
      }
    ],
    systemInstruction: {
      parts: [
        {
          text: "Ты монтажник видео, твоя задача разбить сценарий на сцены и придумать текст для озвучки каждой сцены."
        }
      ]
    },
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        required: ["scenes"],
        properties: {
          scenes: {
            type: "array",
            items: {
              type: "object",
              required: ["short_description", "voiceover_text"],
              properties: {
                short_description: {
                  type: "string"
                },
                voiceover_text: {
                  type: "string"
                }
              }
            }
          }
        }
      }
    }
  }

  console.log('Calling Gemini API...')

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify(prompt)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Gemini API error:', response.status, errorText)
    throw new Error(`Gemini API request failed: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  console.log('Gemini API response received')

  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    console.error('Invalid Gemini API response structure:', JSON.stringify(data))
    throw new Error('Invalid response from Gemini API')
  }

  const responseText = data.candidates[0].content.parts[0].text
  console.log('Response text length:', responseText.length)

  let parsedResponse
  try {
    parsedResponse = JSON.parse(responseText)
  } catch (parseError) {
    console.error('Error parsing Gemini response as JSON:', parseError)
    console.error('Response text:', responseText)
    throw new Error('Failed to parse Gemini response as JSON')
  }

  if (!parsedResponse.scenes || !Array.isArray(parsedResponse.scenes)) {
    console.error('Invalid scenes structure in response:', parsedResponse)
    throw new Error('Invalid scenes structure in Gemini response')
  }

  // Transform Gemini response to our Scene format
  const scenes = parsedResponse.scenes.map((scene: any, index: number) => ({
    id: `scene-${Date.now()}-${index}`,
    title: `Сцена ${index + 1}`,
    text: scene.voiceover_text || '',
    description: scene.short_description || `Описание сцены ${index + 1}`,
    narratorDescription: '', // будет заполнено пользователем при необходимости
    media: [],
    audioUrl: null,
    audioDuration: null,
    isCompleted: false,
    speed: 5, // default video speed (1x)
    recommendedSpeed: Math.floor(Math.random() * 3) + 4 // random recommended speed between 4-6
  }))

  console.log(`Successfully parsed ${scenes.length} scenes from Gemini API`)
  return scenes
}

// Save project
app.post('/make-server-766e6542/save-project', async (c) => {
  try {
    const { projectId, title, scenes, settings } = await c.req.json()
    
    const project = {
      id: projectId,
      title,
      scenes,
      settings,
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

// Generate TTS audio using ElevenLabs with intelligent fallback
app.post('/make-server-766e6542/generate-tts', async (c) => {
  try {
    const { text, sceneId, voiceSettings, sceneNarratorDescription, ttsSettings } = await c.req.json()
    
    if (!text || !sceneId) {
      return c.json({ error: 'Text and sceneId are required' }, 400)
    }
    
    console.log('🎤 TTS Generation started for scene:', sceneId)
    console.log('📝 Text length:', text.length, 'characters')
    console.log('⚙️ TTS Settings:', ttsSettings)
    console.log('🎭 Voice Settings:', voiceSettings?.voice)

    // Generate TTS based on settings
    const result = await generateTTSWithIntelligentFallback(text, sceneId, voiceSettings, sceneNarratorDescription, ttsSettings)
    
    console.log('✅ TTS generation completed:', result.isDemo ? 'DEMO' : 'ELEVENLABS')
    
    return c.json(result)
  } catch (error) {
    console.error('💥 Critical error in TTS generation:', error)
    
    // Even if there's a critical error, we should still try to provide a fallback
    try {
      console.log('🆘 Attempting emergency fallback to mock TTS')
      const fallbackResult = await generateTTSMock(text, sceneId, true, 'Критическая ошибка системы - аварийный fallback')
      console.log('✅ Emergency fallback successful')
      return c.json(fallbackResult)
    } catch (fallbackError) {
      console.error('💥 Even fallback failed:', fallbackError)
      return c.json({ 
        error: 'Failed to generate TTS', 
        details: error.message,
        fallbackError: fallbackError.message 
      }, 500)
    }
  }
})

// Function to generate TTS with intelligent fallback based on settings
async function generateTTSWithIntelligentFallback(
  text: string, 
  sceneId: string, 
  voiceSettings: any, 
  sceneNarratorDescription?: string,
  ttsSettings?: any
): Promise<{ audioUrl: string; duration: number; isDemo?: boolean; reason?: string }> {
  
  console.log('🔧 TTS Mode Decision Making...')
  console.log('Settings - useElevenLabs:', ttsSettings?.useElevenLabs, 'forceDemo:', ttsSettings?.forceDemo)

  // If force demo is enabled, use mock immediately
  if (ttsSettings?.forceDemo) {
    console.log('🎭 Force demo mode enabled - using mock TTS')
    return generateTTSMock(text, sceneId, true, 'Принудительный демо режим включен в настройках')
  }

  // If ElevenLabs is explicitly disabled, use mock
  if (ttsSettings?.useElevenLabs === false) {
    console.log('❌ ElevenLabs disabled in settings - using mock TTS')
    return generateTTSMock(text, sceneId, true, 'ElevenLabs отключен в настройках проекта')
  }

  // If ElevenLabs is enabled, try it first
  if (ttsSettings?.useElevenLabs === true) {
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY')
    
    if (!apiKey) {
      console.log('🔑 No ElevenLabs API key found - falling back to mock')
      return generateTTSMock(text, sceneId, true, 'API ключ ElevenLabs не найден')
    }

    try {
      console.log('🚀 Attempting ElevenLabs TTS generation')
      return await generateTTSWithElevenLabs(text, sceneId, voiceSettings, sceneNarratorDescription)
    } catch (error) {
      console.error('❌ ElevenLabs TTS failed:', error)
      
      // Check if it's a quota exceeded error or authentication error
      const errorMessage = error.message || ''
      if (errorMessage.includes('quota_exceeded') || errorMessage.includes('quota') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        console.log('💳 ElevenLabs quota/auth error - falling back to mock')
        return generateTTSMock(text, sceneId, true, 'Квота ElevenLabs исчерпана или ошибка авторизации')
      }
      
      // For other errors, also fallback to mock
      console.log('⚠️ ElevenLabs error - falling back to mock')
      return generateTTSMock(text, sceneId, true, `Ошибка ElevenLabs: ${error.message}`)
    }
  }

  // Default behavior (auto mode) - try ElevenLabs if API key exists, otherwise use mock
  const apiKey = Deno.env.get('ELEVENLABS_API_KEY')
  
  if (!apiKey) {
    console.log('🔑 No API key in auto mode - using mock TTS')
    return generateTTSMock(text, sceneId, true, 'API ключ не настроен (автома��ический режим)')
  }

  try {
    console.log('🤖 Auto mode: attempting ElevenLabs TTS')
    return await generateTTSWithElevenLabs(text, sceneId, voiceSettings, sceneNarratorDescription)
  } catch (error) {
    console.error('❌ Auto mode ElevenLabs failed:', error)
    
    const errorMessage = error.message || ''
    if (errorMessage.includes('quota_exceeded') || errorMessage.includes('quota') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      console.log('💳 Auto mode: quota/auth error - falling back to mock')
      return generateTTSMock(text, sceneId, true, 'Квота исчерпана или ошибка авторизации (автоматический режим)')
    }
    
    console.log('⚠️ Auto mode: error - falling back to mock')
    return generateTTSMock(text, sceneId, true, `Ошибка в автоматическом режиме: ${error.message}`)
  }
}

// Function to generate TTS using ElevenLabs standard Text-to-Speech API
async function generateTTSWithElevenLabs(
  text: string, 
  sceneId: string, 
  voiceSettings: any, 
  sceneNarratorDescription?: string
): Promise<{ audioUrl: string; duration: number }> {
  const apiKey = Deno.env.get('ELEVENLABS_API_KEY')!

  // Get the appropriate voice ID
  const voiceId = getElevenLabsVoiceId(voiceSettings)
  
  console.log('🎭 Using ElevenLabs voice ID:', voiceId, 'for voice setting:', voiceSettings?.voice)
  console.log('🔑 API Key (first 10 chars):', apiKey.substring(0, 10) + '...')

  // Prepare voice settings for ElevenLabs
  const elevenLabsVoiceSettings = {
    stability: 0.75,        // Voice consistency (0-1)
    similarity_boost: 0.75, // Voice similarity to original (0-1)
    style: 0.0,             // Style exaggeration (0-1) 
    use_speaker_boost: true // Speaker boost for clarity
  }

  const requestBody = {
    text: text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: elevenLabsVoiceSettings
  }

  console.log('📤 TTS Request URL:', `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`)
  console.log('📤 TTS Request body keys:', Object.keys(requestBody))

  // Call ElevenLabs Text-to-Speech API
  const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    body: JSON.stringify(requestBody)
  })

  console.log('📥 ElevenLabs response status:', ttsResponse.status)

  if (!ttsResponse.ok) {
    const errorText = await ttsResponse.text()
    console.error('❌ ElevenLabs TTS API error:', ttsResponse.status, errorText)
    
    // Parse error to get more details
    let parsedError = null
    try {
      parsedError = JSON.parse(errorText)
    } catch (e) {
      // If can't parse, use the raw text
    }
    
    // Create detailed error message
    let errorMessage = `ElevenLabs TTS API request failed: ${ttsResponse.status}`
    if (parsedError?.detail?.message) {
      errorMessage += ` - ${parsedError.detail.message}`
    } else {
      errorMessage += ` ${errorText}`
    }
    
    throw new Error(errorMessage)
  }

  console.log('✅ ElevenLabs TTS API response received successfully')

  // Get audio as array buffer
  const audioArrayBuffer = await ttsResponse.arrayBuffer()
  
  if (!audioArrayBuffer || audioArrayBuffer.byteLength === 0) {
    throw new Error('No audio data received from ElevenLabs')
  }

  console.log('💾 Audio buffer size:', audioArrayBuffer.byteLength, 'bytes')

  // Create a File object from the buffer
  const audioFile = new File([audioArrayBuffer], `${sceneId}-audio.mp3`, { type: 'audio/mpeg' })

  // Upload to Supabase Storage
  const bucketName = 'make-766e6542-media'
  const fileName = `tts-${sceneId}-${Date.now()}.mp3`
  
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, audioFile)
  
  if (error) {
    console.error('💾 Storage upload error:', error)
    throw new Error('Failed to upload audio to storage')
  }

  // Create signed URL for private access
  const { data: signedUrlData, error: urlError } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(fileName, 60 * 60 * 24 * 7) // 7 days

  if (urlError || !signedUrlData?.signedUrl) {
    console.error('🔗 Error creating signed URL:', urlError)
    throw new Error('Failed to create signed URL for audio')
  }

  console.log('✅ Audio uploaded successfully, file:', fileName)

  // Calculate estimated duration based on text length
  const words = text.trim().split(/\s+/).filter(word => word.length > 0)
  const wordCount = words.length
  const wordsPerMinute = 180
  const durationMinutes = wordCount / wordsPerMinute
  const estimatedDurationSeconds = Math.round(durationMinutes * 60)

  console.log(`⏱️ Estimated audio duration: ${estimatedDurationSeconds} seconds for ${wordCount} words`)

  return {
    audioUrl: signedUrlData.signedUrl,
    duration: estimatedDurationSeconds
  }
}

// Mock TTS function - creates actual demo audio file
async function generateTTSMock(text: string, sceneId: string, isDemo = false, reason?: string): Promise<{ audioUrl: string; duration: number; isDemo: boolean; reason?: string }> {
  console.log('🎭 Using mock TTS generation for scene:', sceneId)
  if (reason) {
    console.log('📋 Reason:', reason)
  }
  
  try {
    // Calculate mock duration based on text length
    const words = text.trim().split(/\s+/).filter(word => word.length > 0)
    const wordCount = words.length
    const wordsPerMinute = 180
    const durationMinutes = wordCount / wordsPerMinute
    const durationSeconds = Math.max(Math.round(durationMinutes * 60), 1) // At least 1 second
    
    console.log(`🎵 Creating demo audio: ${durationSeconds}s for ${wordCount} words`)
    
    // Create a simple sine wave audio file as demo
    const sampleRate = 22050 // Lower sample rate for smaller files
    const audioDuration = durationSeconds
    const samples = sampleRate * audioDuration
    
    // Create audio buffer
    const audioBuffer = new Float32Array(samples)
    
    // Generate a more pleasant tone sequence
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate
      // Create a soft melody that changes over time
      const progress = t / audioDuration
      const frequency = 440 + (Math.sin(progress * Math.PI * 4) * 100) // Varying frequency
      const envelope = Math.sin(Math.PI * progress) * 0.05 // Soft envelope
      audioBuffer[i] = envelope * Math.sin(2 * Math.PI * frequency * t)
    }
    
    // Convert to WAV format
    const wavBuffer = createWAVFile(audioBuffer, sampleRate)
    
    // Create a File object from the buffer
    const audioFile = new File([wavBuffer], `${sceneId}-demo-audio.wav`, { type: 'audio/wav' })

    // Upload to Supabase Storage
    const bucketName = 'make-766e6542-media'
    const fileName = `tts-demo-${sceneId}-${Date.now()}.wav`
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, audioFile)
    
    if (error) {
      console.error('💾 Storage upload error for demo audio:', error)
      throw new Error('Failed to upload demo audio to storage')
    }

    // Create signed URL for private access
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 60 * 60 * 24 * 7) // 7 days

    if (urlError || !signedUrlData?.signedUrl) {
      console.error('🔗 Error creating signed URL for demo audio:', urlError)
      throw new Error('Failed to create signed URL for demo audio')
    }

    console.log('✅ Demo audio uploaded successfully, file:', fileName)
    
    return {
      audioUrl: signedUrlData.signedUrl,
      duration: durationSeconds,
      isDemo: true,
      reason
    }
  } catch (error) {
    console.error('💥 Error creating demo audio:', error)
    
    // Final fallback to silent audio with data URL
    const words = text.trim().split(/\s+/).filter(word => word.length > 0)
    const wordCount = words.length
    const wordsPerMinute = 180
    const durationMinutes = wordCount / wordsPerMinute
    const durationSeconds = Math.max(Math.round(durationMinutes * 60), 1)
    
    console.log('🔄 Fallback to silent audio data URL')
    const silentAudioDataURL = createSilentAudioDataURL(durationSeconds)
    
    return {
      audioUrl: silentAudioDataURL,
      duration: durationSeconds,
      isDemo: true,
      reason: reason || 'Ошибка создания демо аудио'
    }
  }
}

// Helper function to create WAV file from audio buffer
function createWAVFile(audioBuffer: Float32Array, sampleRate: number): ArrayBuffer {
  const length = audioBuffer.length
  const arrayBuffer = new ArrayBuffer(44 + length * 2)
  const view = new DataView(arrayBuffer)
  
  // Write WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }
  
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // Mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, length * 2, true)
  
  // Write audio data
  let offset = 44
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, audioBuffer[i]))
    view.setInt16(offset, sample * 0x7FFF, true)
    offset += 2
  }
  
  return arrayBuffer
}

// Helper function to create silent audio data URL
function createSilentAudioDataURL(durationSeconds: number): string {
  const sampleRate = 8000 // Lower sample rate for smaller file
  const samples = sampleRate * durationSeconds
  const arrayBuffer = new ArrayBuffer(44 + samples * 2)
  const view = new DataView(arrayBuffer)
  
  // Write minimal WAV header for silence
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }
  
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, samples * 2, true)
  
  // Audio data is already zero-initialized (silent)
  
  // Convert to base64
  const uint8Array = new Uint8Array(arrayBuffer)
  const binaryString = String.fromCharCode(...uint8Array)
  const base64 = btoa(binaryString)
  
  return `data:audio/wav;base64,${base64}`
}

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

Deno.serve(app.fetch)