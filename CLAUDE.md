# Claude Development Setup

## Workflow с пользователем

### Общие принципы работы:
- **Автоматические коммиты**: После завершения задачи всегда коммичу изменения в git
- **Проект на Railway**: Основная разработка и деплой происходит на Railway, локально БД не настроена
- **Фокус на результат**: Делаю то что просят, ничего лишнего
- **Краткость**: Отвечаю коротко и по делу

### Технический стек проекта:
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (через Railway)
- **ORM**: Prisma
- **Frontend**: Vanilla JS (в public/app.js)
- **Bot**: Telegram Bot API
- **Deploy**: Railway

### Команды для работы:
- `npm run build` - сборка TypeScript
- `npm run start` - запуск на продакшене  
- `npm run dev` - разработка (локально не работает из-за БД)
- `npm run db:push` - пуш схемы в БД
- `npm run db:generate` - генерация Prisma клиента

### Структура проекта:
```
src/
├── routes/          # API роуты
│   ├── users.ts     # /users/* - управление пользователями
│   ├── reviews.ts   # /reviews/* - работа с отзывами
│   └── admin.ts     # /admin/* - админ панель
├── utils/
│   ├── telegram.ts  # валидация Telegram WebApp данных
│   └── seed.ts      # сидирование БД
├── bot/
│   └── bot.ts       # Telegram бот
└── index.ts         # точка входа

public/
├── index.html       # фронтенд приложения
└── app.js          # клиентский JavaScript
```

### После каждой задачи:
1. Использую TodoWrite для планирования
2. Исправляю код
3. **ОБЯЗАТЕЛЬНО коммичу изменения в git**
4. **ОБЯЗАТЕЛЬНО пушу коммиты командой `git push`**
5. Объясняю что было исправлено (кратко)

### Особенности этого проекта:
- Telegram WebApp с мини-приложением для анонимных отзывов
- PostgreSQL на Railway (БД работает только в продакшене)
- Fallback логика для тестирования без валидных Telegram данных
- BigInt для telegramId в БД (требует careful handling)