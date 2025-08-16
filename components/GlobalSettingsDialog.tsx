import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Plus, Trash2, ExternalLink, Mic, Settings } from 'lucide-react'
import { CustomVoice, GlobalSettings } from '../types'

interface GlobalSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  globalSettings: GlobalSettings
  updateGlobalSettings: (settings: Partial<GlobalSettings>) => void
}

export const GlobalSettingsDialog: React.FC<GlobalSettingsDialogProps> = ({
  open,
  onOpenChange,
  globalSettings,
  updateGlobalSettings
}) => {
  const [newVoice, setNewVoice] = useState<Partial<CustomVoice>>({
    name: '',
    gender: 'female',
    description: '',
    id: '',
    libraryUrl: ''
  })

  const addCustomVoice = () => {
    if (!newVoice.name || !newVoice.id) return

    const voice: CustomVoice = {
      id: newVoice.id!,
      name: newVoice.name!,
      gender: newVoice.gender as 'male' | 'female',
      description: newVoice.description,
      libraryUrl: newVoice.libraryUrl
    }

    updateGlobalSettings({
      customVoices: [...globalSettings.customVoices, voice]
    })

    setNewVoice({
      name: '',
      gender: 'female',
      description: '',
      id: '',
      libraryUrl: ''
    })
  }

  const removeCustomVoice = (voiceId: string) => {
    updateGlobalSettings({
      customVoices: globalSettings.customVoices.filter(v => v.id !== voiceId)
    })
  }

  const extractVoiceIdFromUrl = (url: string) => {
    const match = url.match(/voiceId=([a-zA-Z0-9]+)/)
    return match ? match[1] : ''
  }

  const handleUrlChange = (url: string) => {
    setNewVoice({
      ...newVoice,
      libraryUrl: url,
      id: extractVoiceIdFromUrl(url)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Глобальные настройки
          </DialogTitle>
          <DialogDescription>
            Управление пользовательскими голосами и общими настройками приложения
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="voices" className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="voices">Голоса ElevenLabs</TabsTrigger>
          </TabsList>

          <TabsContent value="voices" className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 bg-accent rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Mic className="h-4 w-4 text-blue-500" />
                  Управление голосами ElevenLabs
                </h4>
                <p className="text-sm text-muted-foreground">
                  Добавьте пользовательские голоса из библиотеки ElevenLabs для использования в проектах
                </p>
              </div>

              {/* Форма добавления нового голоса */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Добавить новый голос
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="voice-url">Ссылка из библиотеки ElevenLabs</Label>
                      <Input
                        id="voice-url"
                        placeholder="https://elevenlabs.io/app/voice-library?voiceId=..."
                        value={newVoice.libraryUrl || ''}
                        onChange={(e) => handleUrlChange(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Скопируйте ссылку из библиотеки голосов ElevenLabs
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="voice-id">ID голоса</Label>
                      <Input
                        id="voice-id"
                        placeholder="dHAwRJVaEPhU907QLTPW"
                        value={newVoice.id || ''}
                        onChange={(e) => setNewVoice({ ...newVoice, id: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Автоматически извлекается из ссылки
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="voice-name">Название голоса</Label>
                      <Input
                        id="voice-name"
                        placeholder="Название голоса"
                        value={newVoice.name || ''}
                        onChange={(e) => setNewVoice({ ...newVoice, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="voice-gender">Пол</Label>
                      <Select 
                        value={newVoice.gender} 
                        onValueChange={(value) => setNewVoice({ ...newVoice, gender: value as 'male' | 'female' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="female">Женский</SelectItem>
                          <SelectItem value="male">Мужской</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="voice-description">Описание (опционально)</Label>
                    <Textarea
                      id="voice-description"
                      placeholder="Описание характеристик голоса..."
                      value={newVoice.description || ''}
                      onChange={(e) => setNewVoice({ ...newVoice, description: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <Button 
                    onClick={addCustomVoice}
                    disabled={!newVoice.name || !newVoice.id}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить голос
                  </Button>
                </CardContent>
              </Card>

              {/* Список добавленных голосов */}
              <Card>
                <CardHeader>
                  <CardTitle>Добавленные голоса ({globalSettings.customVoices.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {globalSettings.customVoices.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Пока нет добавленных голосов
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {globalSettings.customVoices.map((voice) => (
                        <div 
                          key={voice.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{voice.name}</h4>
                              <span className="text-xs px-2 py-1 bg-muted rounded">
                                {voice.gender === 'male' ? 'Мужской' : 'Женский'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              ID: <code className="text-xs bg-muted px-1 rounded">{voice.id}</code>
                            </p>
                            {voice.description && (
                              <p className="text-sm text-muted-foreground">{voice.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {voice.libraryUrl && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(voice.libraryUrl, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Удалить голос?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Голос "{voice.name}" будет удален из списка. Это действие нельзя отменить.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => removeCustomVoice(voice.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Удалить
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <h4 className="font-medium mb-2 text-blue-800 dark:text-blue-200">
                  💡 Как добавить голос из ElevenLabs
                </h4>
                <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                  <p>1. Перейдите в <a href="https://elevenlabs.io/app/voice-library" target="_blank" rel="noopener noreferrer" className="underline">библиотеку голосов ElevenLabs</a></p>
                  <p>2. Найдите понравившийся голос и нажмите на него</p>
                  <p>3. Скопируйте ссылку из адресной строки (она содержит voiceId)</p>
                  <p>4. Вставьте ссылку в поле выше - ID извлечется автоматически</p>
                  <p>5. Заполните название и описание голоса</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}