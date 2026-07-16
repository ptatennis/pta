# Gambit Tennis Website

## Запуск

Запусти `start-site.bat` на Windows или `start-site.sh` на Linux/macOS, затем открой `http://localhost:8080`.

## Публикация на GitHub Pages

Загрузи всё содержимое этой папки в публичный репозиторий и включи GitHub Pages для основной ветки.

## Где менять данные

- `data/tournaments.json` — турниры, описания, награды и сетки.
- `data/schedule.json` — расписание.
- `data/rankings.json` — рейтинг игроков.
- `data/site.json` — статус прямого эфира.
- `live/data/live-match.json` — файл матча из локального генератора.

## Включение прямого эфира

В `data/site.json` установи:

```json
"active": true
```

При `false` посетители увидят экран «Сейчас матчей нет». При `true` страница покажет симулятор из папки `live`.
