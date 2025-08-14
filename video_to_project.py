#!/usr/bin/env python3
"""
Скрипт: Нарезка видео на сцены и формирование проекта сценарного редактора

Функции:
- Принимает несколько входных видеофайлов
- Находит границы сцен (scene detection) с помощью ffprobe (порог по умолчанию 0.4)
- Формирует непрерывные сегменты между границами, гарантируя минимальную длительность сегмента
- Вырезает сегменты с помощью ffmpeg и сохраняет их в каталог media внутри папки проекта
- Создает Project со сценами и добавленными медиафайлами
- Проставляет audioDuration из длительности сегмента (чтобы в UI показывалась «реальная» длительность)
- Сохраняет итоговый проект в JSON файл с экспортным форматом

Зависимости: ffmpeg, ffprobe (должны быть в PATH)
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import List, Tuple
from uuid import uuid4

# Импортируем модели из "данного модуля"
from scenario_manager import Project, Scene, MediaFile, ProjectSettings


def ensure_tool_available(tool_name: str) -> None:
    if shutil.which(tool_name) is None:
        raise RuntimeError(f"Не найдено '{tool_name}' в PATH. Установите и добавьте в PATH.")


def run_command(cmd: List[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False)


def ffprobe_duration(input_path: Path) -> float:
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=nw=1:nk=1",
        str(input_path),
    ]
    result = run_command(cmd)
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe duration error: {result.stderr}")
    try:
        return float(result.stdout.strip())
    except ValueError:
        raise RuntimeError(f"Не удалось распарсить длительность: {result.stdout}")


def ffprobe_scene_changes(input_path: Path, threshold: float = 0.4) -> List[float]:
    """
    Возвращает список времени (секунды) по границам сцен (моментам смены сцены).
    Использует lavfi graph: movie=...,select=gt(scene,THRESHOLD)
    """
    # Используем JSON для надежного парсинга
    # Пример команды:
    # ffprobe -f lavfi -i "movie=input.mp4,select=gt(scene,0.4)" -show_entries frame=pkt_pts_time -of json
    cmd = [
        "ffprobe",
        "-f",
        "lavfi",
        "-i",
        f"movie={str(input_path)},select=gt(scene\,{threshold})",
        "-show_entries",
        "frame=pkt_pts_time",
        "-of",
        "json",
    ]
    result = run_command(cmd)
    if result.returncode != 0:
        # Иногда lavfi может падать на некоторых контейнерах; пробуем альтернативный способ через showinfo
        # Но сначала бросим явную ошибку с диагностикой
        raise RuntimeError(
            "ffprobe scene detection error.\n"
            f"Command: {' '.join(cmd)}\n"
            f"STDERR: {result.stderr}\nSTDOUT: {result.stdout}"
        )
    try:
        data = json.loads(result.stdout)
        frames = data.get("frames", [])
        times: List[float] = []
        for fr in frames:
            t_str = fr.get("pkt_pts_time")
            if t_str is None:
                continue
            try:
                times.append(float(t_str))
            except ValueError:
                continue
        # Отфильтруем дубликаты и отсортируем
        unique_sorted = sorted({t for t in times if t >= 0.0})
        return unique_sorted
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Ошибка парсинга JSON от ffprobe: {e}\nВывод: {result.stdout[:500]}")


def build_segments(change_times: List[float], total_duration: float, min_duration: float) -> List[Tuple[float, float]]:
    """
    Формирует интервалы [start, end) между сменами сцен. Обеспечивает минимальную длину.
    Если сегмент выходит короче min_duration — объединяет с последующим.
    """
    if total_duration <= 0:
        return []

    # Начальная сетка: [0, t1], [t1, t2], ..., [tn, total]
    points = [t for t in change_times if 0.0 < t < total_duration]
    points = sorted(points)
    grid: List[Tuple[float, float]] = []

    prev = 0.0
    for t in points:
        if t - prev > 0.0:
            grid.append((prev, t))
        prev = t
    if total_duration - prev > 0.0:
        grid.append((prev, total_duration))

    if not grid:
        return []

    # Обеспечим минимальную длину, объединяя короткие сегменты со следующим
    merged: List[Tuple[float, float]] = []
    cur_start, cur_end = grid[0]
    for start, end in grid[1:]:
        # Если текущий сегмент короче минимума, расширяем за счет следующего
        if (cur_end - cur_start) < min_duration:
            cur_end = end
        else:
            merged.append((cur_start, cur_end))
            cur_start, cur_end = start, end
    # Добавляем последний
    merged.append((cur_start, cur_end))

    # Возможно, последний все еще короче минимума — сольем его с предыдущим (если есть)
    if len(merged) >= 2 and (merged[-1][1] - merged[-1][0]) < min_duration:
        prev_start, prev_end = merged[-2]
        last_start, last_end = merged[-1]
        merged[-2] = (prev_start, last_end)
        merged.pop()

    # Удалим слишком короткие (на случай, если ничего не спасает объединение)
    filtered = [(s, e) for (s, e) in merged if (e - s) >= min_duration]
    return filtered


def format_ts(value: float) -> str:
    """Форматирует секунды для ffmpeg -ss/-to в виде с точкой."""
    return f"{value:.3f}"


def cut_segment(input_path: Path, output_path: Path, start: float, end: float) -> None:
    duration = max(0.0, end - start)
    if duration <= 0:
        return
    # Перекодируем для точного seek'а
    cmd = [
        "ffmpeg",
        "-y",
        "-ss",
        format_ts(start),
        "-to",
        format_ts(end),
        "-i",
        str(input_path),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        str(output_path),
    ]
    result = run_command(cmd)
    if result.returncode != 0:
        raise RuntimeError(
            f"ffmpeg cut error for {input_path} -> {output_path}:\n{result.stderr}"
        )


def create_project_from_segments(
    project_title: str,
    media_files: List[Tuple[Path, float]],  # (path, duration_seconds)
    project_dir: Path,
) -> Project:
    project = Project(id=f"project-{int(datetime.now().timestamp() * 1000)}", title=project_title)

    for idx, (clip_path, clip_duration) in enumerate(media_files, start=1):
        scene_id = f"scene-{uuid4()}"
        file_name = clip_path.name
        media = MediaFile(
            fileName=file_name,
            url=str(Path("media") / file_name),  # относительный путь внутри проекта
            type="video",
            originalName=file_name,
        )
        scene = Scene(
            id=scene_id,
            title=f"Сцена {idx}",
            text="",
            description=f"Автоматически выделенный сегмент из видео",
            narratorDescription="",
            media=[media],
            audioUrl=None,
            audioDuration=int(round(clip_duration)),
            isCompleted=False,
            speed=5,
            recommendedSpeed=None,
        )
        project.add_scene(scene)

    # Обновим таймстемпы
    project.update_timestamp()
    return project


def export_project_to_file(project: Project, output_file: Path) -> None:
    export_data = {
        "project": {
            "id": project.id,
            "title": project.title,
            "settings": asdict(project.settings),
            "scenes": [
                {
                    "id": s.id,
                    "title": s.title,
                    "text": s.text,
                    "description": s.description,
                    "narratorDescription": s.narratorDescription,
                    "media": [asdict(m) for m in s.media],
                    "audioUrl": s.audioUrl,
                    "audioDuration": s.audioDuration,
                    "isCompleted": s.isCompleted,
                    "speed": s.speed,
                    "recommendedSpeed": s.recommendedSpeed,
                }
                for s in project.scenes
            ],
            "createdAt": project.createdAt,
            "updatedAt": project.updatedAt,
        }
    }

    total_scenes = len(project.scenes)
    total_duration = sum((s.audioDuration or 0) for s in project.scenes)

    export_data["metadata"] = {
        "exportedAt": datetime.now().isoformat(),
        "version": "1.0",
        "totalScenes": total_scenes,
        "totalDuration": total_duration,
    }

    output_file.parent.mkdir(parents=True, exist_ok=True)
    with output_file.open("w", encoding="utf-8") as f:
        json.dump(export_data, f, ensure_ascii=False, indent=2)


def main() -> None:
    parser = argparse.ArgumentParser(description="Нарезка видео на сцены и создание проекта")
    parser.add_argument(
        "videos",
        nargs="+",
        help="Пути к входным видеофайлам (mp4 и др.)",
    )
    parser.add_argument(
        "--project-title",
        default=f"Проект {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        help="Название проекта",
    )
    parser.add_argument(
        "--project-dir",
        type=str,
        default=str(Path.cwd() / f"project_{int(datetime.now().timestamp())}"),
        help="Каталог проекта (будет создан при необходимости)",
    )
    parser.add_argument(
        "--min-segment",
        type=float,
        default=5.0,
        help="Минимальная длительность сегмента (сек)",
    )
    parser.add_argument(
        "--scene-threshold",
        type=float,
        default=0.4,
        help="Порог детекции сцены для ffprobe (0.0-1.0)",
    )
    parser.add_argument(
        "--output-file",
        type=str,
        default=None,
        help="Файл для сохранения проекта (JSON). По умолчанию <project-dir>/project.json",
    )

    args = parser.parse_args()

    ensure_tool_available("ffmpeg")
    ensure_tool_available("ffprobe")

    input_paths: List[Path] = [Path(p) for p in args.videos]
    for p in input_paths:
        if not p.exists():
            print(f"Файл не найден: {p}", file=sys.stderr)
            sys.exit(1)

    project_dir = Path(args.project_dir)
    media_dir = project_dir / "media"
    media_dir.mkdir(parents=True, exist_ok=True)

    all_clips: List[Tuple[Path, float]] = []

    for input_path in input_paths:
        print(f"Обработка: {input_path}")
        try:
            duration = ffprobe_duration(input_path)
        except Exception as e:
            print(f"  Ошибка получения длительности: {e}", file=sys.stderr)
            continue

        try:
            change_times = ffprobe_scene_changes(input_path, threshold=args.scene_threshold)
        except Exception as e:
            print(f"  Ошибка детекции сцен: {e}", file=sys.stderr)
            change_times = []

        segments = build_segments(change_times, duration, args.min_segment)
        if not segments:
            print("  Сегменты не найдены (или слишком короткие)")
            continue

        stem = input_path.stem
        for seg_idx, (start, end) in enumerate(segments, start=1):
            out_name = f"{stem}_scene_{seg_idx:03d}.mp4"
            out_path = media_dir / out_name
            try:
                cut_segment(input_path, out_path, start, end)
            except Exception as e:
                print(f"  Ошибка нарезки сегмента {seg_idx}: {e}", file=sys.stderr)
                continue
            clip_duration = max(0.0, end - start)
            print(f"  Сохранено: {out_path.name} ({clip_duration:.2f} c)")
            all_clips.append((out_path, clip_duration))

    if not all_clips:
        print("Не удалось получить ни одного сегмента. Проект не создан.", file=sys.stderr)
        sys.exit(2)

    project = create_project_from_segments(args.project_title, all_clips, project_dir)

    output_file = Path(args.output_file) if args.output_file else (project_dir / "project.json")
    try:
        export_project_to_file(project, output_file)
    except Exception as e:
        print(f"Ошибка сохранения проекта: {e}", file=sys.stderr)
        sys.exit(3)

    print("")
    print(f"Проект: {project.title}")
    print(f"ID: {project.id}")
    print(f"Сцен: {len(project.scenes)}")
    print(f"Папка проекта: {project_dir}")
    print(f"Файл проекта: {output_file}")


if __name__ == "__main__":
    main()
