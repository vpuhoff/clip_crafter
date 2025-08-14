"""
Python библиотека для управления проектами и сценами в Supabase
Совместима с веб-приложением "Сценарный редактор"
"""

import os
import json
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from dataclasses import dataclass, asdict, field
from supabase import create_client, Client


@dataclass
class MediaFile:
    """Представляет медиафайл в сцене"""
    fileName: str
    url: str
    type: str  # 'image' or 'video'
    originalName: Optional[str] = None


@dataclass
class VoiceSettings:
    """Глобальные настройки озвучки проекта"""
    voice: str = "alloy"  # 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
    gender: str = "female"  # 'male' | 'female'
    narratorDescription: str = (
        "Act as a warm female narrator, soft and supportive, slower pace"
    )
    steerability: str = "доброжелательно, спокойно"


@dataclass
class ProjectSettings:
    """Настройки проекта"""
    voiceSettings: VoiceSettings = field(default_factory=VoiceSettings)


@dataclass
class Scene:
    """Представляет сцену в проекте"""
    id: str
    title: str
    text: str
    description: str
    narratorDescription: str = ""
    media: List[MediaFile] = field(default_factory=list)
    audioUrl: Optional[str] = None
    audioDuration: Optional[int] = None  # duration in seconds
    isCompleted: bool = False
    # Управление скоростью видео (1-10). 5 означает 1x
    speed: int = 5
    # Рекомендуемая системой скорость (опционально)
    recommendedSpeed: Optional[int] = None

    def __post_init__(self):
        """Конвертируем список словарей в список MediaFile объектов"""
        if self.media and isinstance(self.media[0], dict):
            self.media = [MediaFile(**m) for m in self.media]

    def calculate_text_duration(self, words_per_minute: int = 180) -> int:
        """Рассчитывает длительность на основе количества слов"""
        if not self.text or not self.text.strip():
            return 0
        
        words = [word for word in self.text.strip().split() if word]
        word_count = len(words)
        duration_minutes = word_count / words_per_minute
        return round(duration_minutes * 60)

    def get_duration(self, words_per_minute: int = 180) -> int:
        """Возвращает реальную длительность озвучки или расчетную"""
        if self.audioDuration is not None:
            return self.audioDuration
        return self.calculate_text_duration(words_per_minute)

    def format_duration(self, duration_seconds: Optional[int] = None) -> str:
        """Форматирует длительность в MM:SS формат"""
        if duration_seconds is None:
            duration_seconds = self.get_duration()
        
        if duration_seconds == 0:
            return "0:00"
        
        minutes = duration_seconds // 60
        seconds = duration_seconds % 60
        return f"{minutes}:{seconds:02d}"

    def add_media(self, media_file: MediaFile):
        """Добавляет медиафайл к сцене"""
        self.media.append(media_file)

    def remove_media(self, file_name: str) -> bool:
        """Удаляет медиафайл по имени файла"""
        original_length = len(self.media)
        self.media = [m for m in self.media if m.fileName != file_name]
        return len(self.media) < original_length

    def has_images(self) -> bool:
        """Проверяет наличие изображений в сцене"""
        return any(m.type == 'image' for m in self.media)

    def has_videos(self) -> bool:
        """Проверяет наличие видео в сцене"""
        return any(m.type == 'video' for m in self.media)

    def get_image_count(self) -> int:
        """Возвращает количество изображений"""
        return sum(1 for m in self.media if m.type == 'image')

    def get_video_count(self) -> int:
        """Возвращает количество видео"""
        return sum(1 for m in self.media if m.type == 'video')


@dataclass
class Project:
    """Представляет проект сценарного редактора"""
    id: str
    title: str
    scenes: List[Scene] = field(default_factory=list)
    settings: ProjectSettings = field(default_factory=ProjectSettings)
    createdAt: str = field(default_factory=lambda: datetime.now().isoformat())
    updatedAt: str = field(default_factory=lambda: datetime.now().isoformat())

    def __post_init__(self):
        """Конвертируем список словарей в список Scene объектов"""
        if self.scenes and isinstance(self.scenes[0], dict):
            self.scenes = [Scene(**s) for s in self.scenes]

    def update_timestamp(self):
        """Обновляет временную метку изменения"""
        self.updatedAt = datetime.now().isoformat()

    def add_scene(self, scene: Scene, index: Optional[int] = None):
        """Добавляет сцену в проект"""
        if index is None:
            self.scenes.append(scene)
        else:
            self.scenes.insert(index, scene)
        self.update_timestamp()

    def remove_scene(self, scene_id: str) -> bool:
        """Удаляет сцену по ID"""
        original_length = len(self.scenes)
        self.scenes = [s for s in self.scenes if s.id != scene_id]
        if len(self.scenes) < original_length:
            self.update_timestamp()
            return True
        return False

    def get_scene(self, scene_id: str) -> Optional[Scene]:
        """Получает сцену по ID"""
        return next((s for s in self.scenes if s.id == scene_id), None)

    def move_scene(self, scene_id: str, new_index: int) -> bool:
        """Перемещает сцену на новую позицию"""
        scene = self.get_scene(scene_id)
        if not scene:
            return False
        
        current_index = self.scenes.index(scene)
        if current_index == new_index:
            return False
        
        # Удаляем сцену с текущей позиции и вставляем на новую
        self.scenes.pop(current_index)
        self.scenes.insert(new_index, scene)
        self.update_timestamp()
        return True

    def get_total_duration(self, words_per_minute: int = 180) -> int:
        """Возвращает общую длительность проекта в секундах"""
        return sum(scene.get_duration(words_per_minute) for scene in self.scenes)

    def format_total_duration(self, words_per_minute: int = 180) -> str:
        """Форматирует общую длительность проекта"""
        total_seconds = self.get_total_duration(words_per_minute)
        
        if total_seconds >= 3600:  # >= 1 hour
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            return f"{hours}:{minutes:02d}:{seconds:02d}"
        else:
            minutes = total_seconds // 60
            seconds = total_seconds % 60
            return f"{minutes}:{seconds:02d}"

    def get_completion_stats(self) -> Dict[str, int]:
        """Возвращает статистику выполнения проекта"""
        completed = sum(1 for scene in self.scenes if scene.isCompleted)
        return {
            "completed": completed,
            "total": len(self.scenes),
            "percentage": round((completed / len(self.scenes)) * 100) if self.scenes else 0
        }

    def is_completed(self) -> bool:
        """Проверяет, завершен ли проект (все сцены готовы)"""
        return all(scene.isCompleted for scene in self.scenes) if self.scenes else False


class ScenarioManager:
    """Основной класс для управления проектами и сценами в Supabase"""
    
    def __init__(self, supabase_url: str, supabase_key: str):
        """
        Инициализация менеджера
        
        Args:
            supabase_url: URL Supabase проекта
            supabase_key: Ключ доступа к Supabase (service_role или anon)
        """
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.table_name = "kv_store_766e6542"
        self.project_prefix = "project:"

    def _get_project_key(self, project_id: str) -> str:
        """Формирует ключ для проекта в KV хранилище"""
        return f"{self.project_prefix}{project_id}"

    def _generate_project_id(self) -> str:
        """Генерирует уникальный ID для проекта"""
        return f"project-{int(datetime.now().timestamp() * 1000)}"

    def _generate_scene_id(self) -> str:
        """Генерирует уникальный ID для сцены"""
        return f"scene-{int(datetime.now().timestamp() * 1000)}"

    def create_project(self, title: str, scenario_text: str = "") -> Project:
        """
        Создает новый проект
        
        Args:
            title: Название проекта
            scenario_text: Текст сценария для автоматического разбиения на сцены
            
        Returns:
            Созданный проект
        """
        project_id = self._generate_project_id()
        project = Project(id=project_id, title=title)
        
        if scenario_text:
            scenes = self._parse_scenario_text(scenario_text)
            project.scenes = scenes
        
        return project

    def _parse_scenario_text(self, text: str) -> List[Scene]:
        """
        Разбивает текст сценария на сцены (простая версия)
        В продакшене здесь должен быть вызов LLM
        """
        sentences = [s.strip() for s in text.replace('?', '.').replace('!', '.').split('.') if s.strip()]
        scenes = []
        
        # Группируем по 2 предложения на сцену
        for i in range(0, len(sentences), 2):
            scene_text = '. '.join(sentences[i:i+2])
            if scene_text:
                scene_id = self._generate_scene_id()
                scene = Scene(
                    id=scene_id,
                    title=f"Сцена {len(scenes) + 1}",
                    text=scene_text,
                    description=f"Описание сцены {len(scenes) + 1}",
                    narratorDescription="",
                    speed=5
                )
                scenes.append(scene)
        
        return scenes

    def save_project(self, project: Project) -> bool:
        """
        Сохраняет проект в базе данных
        
        Args:
            project: Проект для сохранения
            
        Returns:
            True если сохранение прошло успешно
        """
        try:
            project.update_timestamp()
            
            # Конвертируем проект в словарь для сохранения
            project_data = asdict(project)
            
            key = self._get_project_key(project.id)
            result = self.supabase.table(self.table_name).upsert({
                "key": key,
                "value": project_data
            }).execute()
            
            return len(result.data) > 0
        except Exception as e:
            print(f"Error saving project: {e}")
            return False

    def load_project(self, project_id: str) -> Optional[Project]:
        """
        Загружает проект из базы данных
        
        Args:
            project_id: ID проекта
            
        Returns:
            Проект или None если не найден
        """
        try:
            key = self._get_project_key(project_id)
            result = self.supabase.table(self.table_name).select("value").eq("key", key).single().execute()
            
            if result.data:
                project_data = result.data["value"]
                # Обеспечиваем обратную совместимость для старых проектов
                if "settings" not in project_data or not project_data.get("settings"):
                    project_data["settings"] = asdict(ProjectSettings())
                # Приводим сцены к новой схеме
                for s in project_data.get("scenes", []):
                    s.setdefault("narratorDescription", "")
                    s.setdefault("speed", 5)
                    # "recommendedSpeed" опционален
                return Project(**project_data)
            return None
        except Exception as e:
            print(f"Error loading project: {e}")
            return None

    def delete_project(self, project_id: str) -> bool:
        """
        Удаляет проект из базы данных
        
        Args:
            project_id: ID проекта
            
        Returns:
            True если удаление прошло успешно
        """
        try:
            key = self._get_project_key(project_id)
            result = self.supabase.table(self.table_name).delete().eq("key", key).execute()
            return True
        except Exception as e:
            print(f"Error deleting project: {e}")
            return False

    def list_projects(self) -> List[Project]:
        """
        Возвращает список всех проектов
        
        Returns:
            Список проектов, отсортированный по дате обновления
        """
        try:
            result = self.supabase.table(self.table_name).select("key, value").like("key", f"{self.project_prefix}%").execute()
            
            projects = []
            for row in result.data:
                try:
                    project_data = row["value"]
                    project = Project(**project_data)
                    projects.append(project)
                except Exception as e:
                    print(f"Error parsing project: {e}")
                    continue
            
            # Сортируем по дате обновления (новые первыми)
            projects.sort(key=lambda p: p.updatedAt, reverse=True)
            return projects
        except Exception as e:
            print(f"Error listing projects: {e}")
            return []

    def update_scene(self, project_id: str, scene_id: str, **updates) -> bool:
        """
        Обновляет данные сцены
        
        Args:
            project_id: ID проекта
            scene_id: ID сцены
            **updates: Поля для обновления
            
        Returns:
            True если обновление прошло успешно
        """
        project = self.load_project(project_id)
        if not project:
            return False
        
        scene = project.get_scene(scene_id)
        if not scene:
            return False
        
        # Обновляем поля сцены
        for field, value in updates.items():
            if hasattr(scene, field):
                setattr(scene, field, value)
        
        return self.save_project(project)

    def add_scene_to_project(self, project_id: str, title: str, text: str = "", description: str = "", index: Optional[int] = None) -> Optional[str]:
        """
        Добавляет новую сцену в проект
        
        Args:
            project_id: ID проекта
            title: Название сцены
            text: Текст сцены
            description: Описание сцены
            index: Позиция для вставки (None = в конец)
            
        Returns:
            ID созданной сцены или None при ошибке
        """
        project = self.load_project(project_id)
        if not project:
            return None
        
        scene_id = self._generate_scene_id()
        scene = Scene(
            id=scene_id,
            title=title,
            text=text,
            description=description,
            narratorDescription="",
            speed=5
        )
        
        project.add_scene(scene, index)
        
        if self.save_project(project):
            return scene_id
        return None

    def remove_scene_from_project(self, project_id: str, scene_id: str) -> bool:
        """
        Удаляет сцену из проекта
        
        Args:
            project_id: ID проекта
            scene_id: ID сцены
            
        Returns:
            True если удаление прошло успешно
        """
        project = self.load_project(project_id)
        if not project:
            return False
        
        if project.remove_scene(scene_id):
            return self.save_project(project)
        return False

    def move_scene_in_project(self, project_id: str, scene_id: str, new_index: int) -> bool:
        """
        Перемещает сцену в проекте
        
        Args:
            project_id: ID проекта
            scene_id: ID сцены
            new_index: Новая позиция
            
        Returns:
            True если перемещение прошло успешно
        """
        project = self.load_project(project_id)
        if not project:
            return False
        
        if project.move_scene(scene_id, new_index):
            return self.save_project(project)
        return False

    def toggle_scene_completion(self, project_id: str, scene_id: str) -> bool:
        """
        Переключает статус готовности сцены
        
        Args:
            project_id: ID проекта
            scene_id: ID сцены
            
        Returns:
            True если обновление прошло успешно
        """
        project = self.load_project(project_id)
        if not project:
            return False
        
        scene = project.get_scene(scene_id)
        if not scene:
            return False
        
        scene.isCompleted = not scene.isCompleted
        return self.save_project(project)

    def add_media_to_scene(self, project_id: str, scene_id: str, media_file: MediaFile) -> bool:
        """
        Добавляет медиафайл к сцене
        
        Args:
            project_id: ID проекта
            scene_id: ID сцены
            media_file: Медиафайл для добавления
            
        Returns:
            True если добавление прошло успешно
        """
        project = self.load_project(project_id)
        if not project:
            return False
        
        scene = project.get_scene(scene_id)
        if not scene:
            return False
        
        scene.add_media(media_file)
        return self.save_project(project)

    def remove_media_from_scene(self, project_id: str, scene_id: str, file_name: str) -> bool:
        """
        Удаляет медиафайл из сцены
        
        Args:
            project_id: ID проекта
            scene_id: ID сцены
            file_name: Имя файла для удаления
            
        Returns:
            True если удаление прошло успешно
        """
        project = self.load_project(project_id)
        if not project:
            return False
        
        scene = project.get_scene(scene_id)
        if not scene:
            return False
        
        if scene.remove_media(file_name):
            return self.save_project(project)
        return False

    def export_project(self, project_id: str, include_metadata: bool = True) -> Optional[Dict[str, Any]]:
        """
        Экспортирует проект в словарь для сохранения в файл
        
        Args:
            project_id: ID проекта
            include_metadata: Включать ли метаданные экспорта
            
        Returns:
            Словарь с данными проекта или None при ошибке
        """
        project = self.load_project(project_id)
        if not project:
            return None
        
        export_data = {
            "project": {
                "id": project.id,
                "title": project.title,
                "settings": asdict(project.settings),
                "scenes": [
                    {
                        "id": scene.id,
                        "title": scene.title,
                        "text": scene.text,
                        "description": scene.description,
                        "narratorDescription": scene.narratorDescription,
                        "media": [asdict(media) for media in scene.media],
                        "audioUrl": scene.audioUrl,
                        "audioDuration": scene.audioDuration,
                        "isCompleted": scene.isCompleted,
                        "speed": scene.speed,
                        "recommendedSpeed": scene.recommendedSpeed,
                    } for scene in project.scenes
                ],
                "createdAt": project.createdAt,
                "updatedAt": project.updatedAt,
            }
        }
        
        if include_metadata:
            export_data["metadata"] = {
                "exportedAt": datetime.now().isoformat(),
                "version": "1.0",
                "totalScenes": len(project.scenes),
                "totalDuration": project.format_total_duration(),
                "completionStats": project.get_completion_stats()
            }
        
        return export_data

    def export_project_to_file(self, project_id: str, file_path: str, include_metadata: bool = True) -> bool:
        """
        Экспортирует проект в JSON файл
        
        Args:
            project_id: ID проекта
            file_path: Путь к файлу для сохранения
            include_metadata: Включать ли метаданные экспорта
            
        Returns:
            True если экспорт прошел успешно
        """
        export_data = self.export_project(project_id, include_metadata)
        if not export_data:
            return False
        
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"Error exporting to file: {e}")
            return False


# Utility функции для удобства использования

def create_manager_from_env() -> ScenarioManager:
    """
    Создает ScenarioManager используя переменные окружения
    
    Ожидаемые переменные:
    - SUPABASE_URL
    - SUPABASE_SERVICE_ROLE_KEY или SUPABASE_ANON_KEY
    
    Returns:
        Инициализированный ScenarioManager
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) environment variables are required")
    
    return ScenarioManager(url, key)


def format_duration_from_seconds(seconds: int) -> str:
    """
    Форматирует длительность в секундах в читаемый формат
    
    Args:
        seconds: Длительность в секундах
        
    Returns:
        Строка в формате MM:SS или H:MM:SS
    """
    if seconds < 3600:
        minutes = seconds // 60
        secs = seconds % 60
        return f"{minutes}:{secs:02d}"
    else:
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        return f"{hours}:{minutes:02d}:{secs:02d}"


# Пример использования
if __name__ == "__main__":
    # Создание менеджера
    manager = ScenarioManager(
        supabase_url="your-supabase-url",
        supabase_key="your-supabase-key"
    )
    
    # Создание нового проекта
    project = manager.create_project(
        title="Мой тестовый проект",
        scenario_text="Это первое предложение. Это второе предложение. Это третье предложение. Это четвертое предложение."
    )
    
    # Сохранение проекта
    if manager.save_project(project):
        print(f"Проект '{project.title}' сохранен с ID: {project.id}")
        print(f"Создано сцен: {len(project.scenes)}")
        print(f"Общая длительность: {project.format_total_duration()}")
    
    # Загрузка и вывод информации о проекте
    loaded_project = manager.load_project(project.id)
    if loaded_project:
        print(f"\nЗагружен проект: {loaded_project.title}")
        for i, scene in enumerate(loaded_project.scenes):
            print(f"  Сцена {i+1}: {scene.title} ({scene.format_duration()})")
    
    # Получение списка всех проектов
    all_projects = manager.list_projects()
    print(f"\nВсего проектов: {len(all_projects)}")